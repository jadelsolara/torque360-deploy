import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThanOrEqual } from 'typeorm';
import { createHash } from 'crypto';
import { spawn } from 'child_process';
import { createWriteStream, createReadStream } from 'fs';
import { mkdir, stat } from 'fs/promises';
import { createGzip } from 'zlib';
import { dirname } from 'path';
import {
  BackupRecord,
  BackupType,
  StorageTarget,
  BackupStatus,
  BackupTrigger,
} from '../../database/entities/backup-record.entity';
import {
  StorageMetric,
  AlertLevel,
} from '../../database/entities/storage-metric.entity';
import { BackupFiltersDto, UpdateScheduleDto } from './backup.dto';

const DEFAULT_BACKUP_CONFIG = {
  fullBackupCron: '0 2 * * 0', // Weekly Sunday 2 AM
  incrementalBackupCron: '0 3 * * *', // Daily 3 AM
  retentionDays: 90,
  localRetentionDays: 30,
  cloudRetentionDays: 90,
  maxBackupsPerTenant: 100,
  defaultQuotaBytes: 10 * 1024 * 1024 * 1024, // 10 GB
  autoScaleEnabled: true,
  autoScaleThreshold: 85,
  autoScaleIncrementPercent: 20,
};

export interface ScaleEvent {
  id: string;
  tenantId: string;
  eventType: 'SCALE_UP' | 'SCALE_DOWN_SUGGESTED';
  previousQuota: number;
  newQuota: number;
  usagePercent: number;
  reason: string;
  createdAt: Date;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  // In-memory config per tenant (production: store in DB or config table)
  private scheduleConfigs = new Map<string, typeof DEFAULT_BACKUP_CONFIG>();
  private scaleHistory: ScaleEvent[] = [];

  constructor(
    @InjectRepository(BackupRecord)
    private backupRepo: Repository<BackupRecord>,
    @InjectRepository(StorageMetric)
    private storageRepo: Repository<StorageMetric>,
    private dataSource: DataSource,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // BACKUP OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════

  async createBackup(
    tenantId: string | null,
    type: BackupType,
    target: StorageTarget,
    triggeredBy: BackupTrigger,
  ): Promise<BackupRecord> {
    const config = this.getConfig(tenantId);
    const now = new Date();

    // Calculate expiration based on target
    const retentionDays =
      target === StorageTarget.LOCAL
        ? config.localRetentionDays
        : config.cloudRetentionDays;
    const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

    // Get real table list and row counts from the database
    const tablesIncluded = [
      'clients', 'vehicles', 'work_orders', 'work_order_parts',
      'inventory_items', 'stock_movements', 'invoices', 'invoice_items',
      'quotations', 'suppliers', 'employees', 'payrolls',
    ];

    const rowCounts: Record<string, number> = {};
    for (const table of tablesIncluded) {
      try {
        const result = tenantId
          ? await this.dataSource.query(
              `SELECT COUNT(*) AS count FROM "${table}" WHERE tenant_id = $1`,
              [tenantId],
            )
          : await this.dataSource.query(
              `SELECT COUNT(*) AS count FROM "${table}"`,
            );
        rowCounts[table] = parseInt(result[0]?.count || '0', 10);
      } catch {
        // Table might not exist yet — skip
        rowCounts[table] = 0;
      }
    }

    const totalRows = Object.values(rowCounts).reduce((sum, c) => sum + c, 0);

    // Always generate a local path (cloud targets dump locally first, then upload)
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const localPath = `/backups/${tenantId || 'system'}/${timestamp}_${type.toLowerCase()}.sql.gz`;

    const cloudUrl =
      target !== StorageTarget.LOCAL
        ? `https://r2.torque360.cl/backups/${tenantId || 'system'}/${timestamp}_${type.toLowerCase()}.sql.gz`
        : undefined;

    const cloudBucket = target !== StorageTarget.LOCAL ? 'torque360-backups' : undefined;

    const backup = this.backupRepo.create({
      tenantId: tenantId ?? undefined,
      backupType: type,
      storageTarget: target,
      status: BackupStatus.IN_PROGRESS,
      localPath,
      cloudUrl,
      cloudBucket,
      sizeBytes: 0,
      tablesIncluded,
      rowCounts,
      startedAt: now,
      expiresAt,
      triggeredBy,
    });

    const saved = await this.backupRepo.save(backup) as BackupRecord;

    // Execute real pg_dump, compress with gzip, calculate checksum
    try {
      const dumpResult = await this.executePgDump(localPath);
      saved.sizeBytes = dumpResult.sizeBytes;
      saved.checksumSha256 = dumpResult.checksumSha256;
      saved.status = BackupStatus.COMPLETED;
      saved.completedAt = new Date();
      await (this.backupRepo.save(saved) as Promise<BackupRecord>);

      this.logger.log(
        `Backup completed: ${saved.id} | tenant=${tenantId} type=${type} target=${target} size=${dumpResult.sizeBytes} bytes`,
      );
    } catch (err) {
      saved.status = BackupStatus.FAILED;
      saved.errorMessage = err instanceof Error ? err.message : String(err);
      saved.completedAt = new Date();
      await (this.backupRepo.save(saved) as Promise<BackupRecord>);

      this.logger.error(
        `Backup FAILED: ${saved.id} | tenant=${tenantId} error=${saved.errorMessage}`,
      );
    }

    return saved;
  }

  async getBackupHistory(
    tenantId: string,
    filters: BackupFiltersDto,
  ): Promise<{ data: BackupRecord[]; total: number }> {
    const qb = this.backupRepo
      .createQueryBuilder('b')
      .where('b.tenantId = :tenantId', { tenantId });

    if (filters.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    }

    if (filters.backupType) {
      qb.andWhere('b.backupType = :backupType', { backupType: filters.backupType });
    }

    if (filters.dateFrom) {
      qb.andWhere('b.createdAt >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
    }

    if (filters.dateTo) {
      qb.andWhere('b.createdAt <= :dateTo', { dateTo: new Date(filters.dateTo) });
    }

    qb.orderBy('b.createdAt', 'DESC');

    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const limit = filters.limit ? Math.min(parseInt(filters.limit, 10), 100) : 20;
    const offset = (page - 1) * limit;

    qb.skip(offset).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getBackupById(tenantId: string, id: string): Promise<BackupRecord> {
    const backup = await this.backupRepo.findOne({
      where: { id, tenantId },
    });

    if (!backup) {
      throw new NotFoundException(`Backup ${id} no encontrado`);
    }

    return backup;
  }

  async restoreBackup(tenantId: string, backupId: string): Promise<{ message: string; backupId: string }> {
    const backup = await this.getBackupById(tenantId, backupId);

    if (backup.status !== BackupStatus.COMPLETED) {
      throw new NotFoundException(
        `Solo se pueden restaurar backups completados. Estado actual: ${backup.status}`,
      );
    }

    this.logger.warn(
      `Restauracion solicitada: backup=${backupId} tenant=${tenantId} type=${backup.backupType} size=${backup.sizeBytes}`,
    );

    return {
      message: `Solicitud de restauracion registrada. Backup: ${backup.backupType} del ${backup.completedAt?.toISOString()}. Tamano: ${backup.sizeBytes} bytes. Un administrador procesara esta solicitud.`,
      backupId: backup.id,
    };
  }

  async deleteExpiredBackups(): Promise<{ deleted: number }> {
    const now = new Date();

    const expired = await this.backupRepo.find({
      where: {
        expiresAt: LessThan(now),
        status: BackupStatus.COMPLETED,
      },
    });

    for (const backup of expired) {
      backup.status = BackupStatus.EXPIRED;
      await this.backupRepo.save(backup);
    }

    this.logger.log(`Backups expirados limpiados: ${expired.length}`);

    return { deleted: expired.length };
  }

  getBackupSchedule(tenantId: string): typeof DEFAULT_BACKUP_CONFIG {
    return this.getConfig(tenantId);
  }

  updateBackupSchedule(
    tenantId: string,
    dto: UpdateScheduleDto,
  ): typeof DEFAULT_BACKUP_CONFIG {
    const current = this.getConfig(tenantId);

    const updated = {
      ...current,
      ...(dto.fullBackupCron !== undefined && { fullBackupCron: dto.fullBackupCron }),
      ...(dto.incrementalBackupCron !== undefined && {
        incrementalBackupCron: dto.incrementalBackupCron,
      }),
      ...(dto.retentionDays !== undefined && {
        retentionDays: dto.retentionDays,
        cloudRetentionDays: dto.retentionDays,
      }),
      ...(dto.autoScaleEnabled !== undefined && { autoScaleEnabled: dto.autoScaleEnabled }),
      ...(dto.autoScaleThreshold !== undefined && {
        autoScaleThreshold: dto.autoScaleThreshold,
      }),
    };

    this.scheduleConfigs.set(tenantId, updated);
    this.logger.log(`Backup schedule actualizado para tenant=${tenantId}`);

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STORAGE MONITORING
  // ═══════════════════════════════════════════════════════════════════════

  async measureStorage(tenantId: string): Promise<StorageMetric> {
    const config = this.getConfig(tenantId);
    const now = new Date();

    // Query actual PostgreSQL database size
    let dbSizeBytes = 0;
    try {
      const result = await this.dataSource.query(
        `SELECT pg_database_size(current_database()) as size`,
      );
      dbSizeBytes = parseInt(result[0]?.size || '0', 10);
    } catch (err) {
      this.logger.warn(`No se pudo obtener tamano de DB: ${err.message}`);
    }

    // Estimate file storage from completed backups for this tenant
    const backupSizeResult = await this.backupRepo
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.sizeBytes), 0)', 'totalBackupSize')
      .where('b.tenantId = :tenantId', { tenantId })
      .andWhere('b.status = :status', { status: BackupStatus.COMPLETED })
      .getRawOne();

    const backupSizeBytes = parseInt(backupSizeResult?.totalBackupSize || '0', 10);

    // Estimate file storage (uploads, attachments) — simulated proportional to DB
    const fileSizeBytes = Math.floor(dbSizeBytes * 0.3);

    const totalSizeBytes = dbSizeBytes + fileSizeBytes + backupSizeBytes;
    const quotaBytes = config.defaultQuotaBytes;

    const usagePercent =
      quotaBytes > 0
        ? Math.min(parseFloat(((totalSizeBytes / quotaBytes) * 100).toFixed(2)), 999.99)
        : 0;

    // Determine alert level
    let alertLevel = AlertLevel.NORMAL;
    if (usagePercent > 95) {
      alertLevel = AlertLevel.EXCEEDED;
    } else if (usagePercent > 85) {
      alertLevel = AlertLevel.CRITICAL;
    } else if (usagePercent > 70) {
      alertLevel = AlertLevel.WARNING;
    }

    // Count total rows across primary tables
    let rowCountTotal = 0;
    try {
      const tables = [
        'clients', 'vehicles', 'work_orders', 'inventory_items',
        'invoices', 'quotations', 'suppliers', 'employees',
      ];
      for (const table of tables) {
        try {
          const countResult = await this.dataSource.query(
            `SELECT COUNT(*) as cnt FROM "${table}" WHERE tenant_id = $1`,
            [tenantId],
          );
          rowCountTotal += parseInt(countResult[0]?.cnt || '0', 10);
        } catch {
          // Table may not exist, skip
        }
      }
    } catch {
      // Ignore counting errors
    }

    const metric = this.storageRepo.create({
      tenantId,
      measuredAt: now,
      dbSizeBytes,
      fileSizeBytes,
      backupSizeBytes,
      totalSizeBytes,
      rowCountTotal,
      quotaBytes,
      usagePercent,
      alertLevel,
    });

    const saved = await this.storageRepo.save(metric) as StorageMetric;

    // Trigger auto-scale check after measurement
    await this.checkAutoScale(tenantId, saved);

    this.logger.log(
      `Storage medido: tenant=${tenantId} total=${totalSizeBytes} usage=${usagePercent}% alert=${alertLevel}`,
    );

    return saved;
  }

  async getStorageMetrics(
    tenantId: string,
    days: number = 30,
  ): Promise<StorageMetric[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.storageRepo.find({
      where: {
        tenantId,
        measuredAt: MoreThanOrEqual(since),
      },
      order: { measuredAt: 'ASC' },
    });
  }

  async getCurrentStorage(tenantId: string): Promise<StorageMetric | null> {
    return this.storageRepo.findOne({
      where: { tenantId },
      order: { measuredAt: 'DESC' },
    });
  }

  async getStorageSummary(): Promise<{
    tenants: Array<{
      tenantId: string;
      totalSizeBytes: number;
      quotaBytes: number;
      usagePercent: number;
      alertLevel: AlertLevel;
      measuredAt: Date;
    }>;
    totalStorageUsed: number;
    totalQuotaAllocated: number;
    tenantsInWarning: number;
    tenantsInCritical: number;
  }> {
    // Get the latest metric per tenant using a subquery approach
    const latestMetrics = await this.storageRepo.query(`
      SELECT DISTINCT ON (tenant_id)
        tenant_id as "tenantId",
        total_size_bytes as "totalSizeBytes",
        quota_bytes as "quotaBytes",
        usage_percent as "usagePercent",
        alert_level as "alertLevel",
        measured_at as "measuredAt"
      FROM storage_metrics
      ORDER BY tenant_id, measured_at DESC
    `);

    let totalStorageUsed = 0;
    let totalQuotaAllocated = 0;
    let tenantsInWarning = 0;
    let tenantsInCritical = 0;

    for (const m of latestMetrics) {
      totalStorageUsed += parseInt(m.totalSizeBytes || '0', 10);
      totalQuotaAllocated += parseInt(m.quotaBytes || '0', 10);
      if (m.alertLevel === AlertLevel.WARNING) tenantsInWarning++;
      if (
        m.alertLevel === AlertLevel.CRITICAL ||
        m.alertLevel === AlertLevel.EXCEEDED
      ) {
        tenantsInCritical++;
      }
    }

    return {
      tenants: latestMetrics,
      totalStorageUsed,
      totalQuotaAllocated,
      tenantsInWarning,
      tenantsInCritical,
    };
  }

  async adjustQuota(
    tenantId: string,
    newQuotaBytes: number,
  ): Promise<{ tenantId: string; previousQuota: number; newQuota: number }> {
    const config = this.getConfig(tenantId);
    const previousQuota = config.defaultQuotaBytes;

    config.defaultQuotaBytes = newQuotaBytes;
    this.scheduleConfigs.set(tenantId, config);

    this.logger.log(
      `Quota ajustada: tenant=${tenantId} ${previousQuota} -> ${newQuotaBytes} bytes`,
    );

    return {
      tenantId,
      previousQuota,
      newQuota: newQuotaBytes,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // AUTO-SCALING LOGIC
  // ═══════════════════════════════════════════════════════════════════════

  async checkAutoScale(tenantId: string, metric?: StorageMetric): Promise<void> {
    const config = this.getConfig(tenantId);

    if (!config.autoScaleEnabled) return;

    const current =
      metric || (await this.getCurrentStorage(tenantId));

    if (!current) return;

    const usage = Number(current.usagePercent);

    // CRITICAL: usage > 95% — emergency scale-up 50%
    if (usage > 95) {
      const previousQuota = config.defaultQuotaBytes;
      const newQuota = Math.floor(previousQuota * 1.5);

      await this.adjustQuota(tenantId, newQuota);

      this.scaleHistory.push({
        id: `scale-${Date.now()}`,
        tenantId,
        eventType: 'SCALE_UP',
        previousQuota,
        newQuota,
        usagePercent: usage,
        reason: `Uso EXCEDIDO (${usage}%). Quota incrementada 50% automaticamente. ALERTA al propietario.`,
        createdAt: new Date(),
      });

      this.logger.warn(
        `AUTO-SCALE EMERGENCIA: tenant=${tenantId} usage=${usage}% quota ${previousQuota} -> ${newQuota}`,
      );

      // Trigger an incremental backup as safety measure
      await this.createBackup(
        tenantId,
        BackupType.INCREMENTAL,
        StorageTarget.BOTH,
        BackupTrigger.AUTO_SCALE,
      );

      return;
    }

    // WARNING: usage > 85% (or custom threshold) — scale-up 20%
    if (usage > config.autoScaleThreshold) {
      const previousQuota = config.defaultQuotaBytes;
      const newQuota = Math.floor(
        previousQuota * (1 + config.autoScaleIncrementPercent / 100),
      );

      await this.adjustQuota(tenantId, newQuota);

      this.scaleHistory.push({
        id: `scale-${Date.now()}`,
        tenantId,
        eventType: 'SCALE_UP',
        previousQuota,
        newQuota,
        usagePercent: usage,
        reason: `Uso alto (${usage}%). Quota incrementada ${config.autoScaleIncrementPercent}% automaticamente.`,
        createdAt: new Date(),
      });

      this.logger.log(
        `AUTO-SCALE: tenant=${tenantId} usage=${usage}% quota ${previousQuota} -> ${newQuota}`,
      );

      // Create incremental backup during scale event
      await this.createBackup(
        tenantId,
        BackupType.INCREMENTAL,
        StorageTarget.BOTH,
        BackupTrigger.AUTO_SCALE,
      );

      return;
    }

    // DOWNSIZE suggestion: usage < 40% for 30+ days
    if (usage < 40) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const highUsageRecent = await this.storageRepo.findOne({
        where: {
          tenantId,
          measuredAt: MoreThanOrEqual(thirtyDaysAgo),
        },
        order: { usagePercent: 'DESC' },
      });

      if (highUsageRecent && Number(highUsageRecent.usagePercent) < 40) {
        this.scaleHistory.push({
          id: `scale-${Date.now()}`,
          tenantId,
          eventType: 'SCALE_DOWN_SUGGESTED',
          previousQuota: config.defaultQuotaBytes,
          newQuota: config.defaultQuotaBytes, // No auto-action
          usagePercent: usage,
          reason: `Uso bajo (${usage}%) por 30+ dias. Se sugiere reducir quota manualmente.`,
          createdAt: new Date(),
        });

        this.logger.log(
          `DOWNSIZE SUGERIDO: tenant=${tenantId} usage=${usage}% consistentemente bajo por 30+ dias`,
        );
      }
    }
  }

  getScaleHistory(tenantId: string): ScaleEvent[] {
    return this.scaleHistory
      .filter((e) => e.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Runs pg_dump piped through gzip to produce a compressed SQL dump.
   * Returns the real file size and SHA-256 checksum of the gzipped output.
   */
  private async executePgDump(
    localPath: string,
  ): Promise<{ sizeBytes: number; checksumSha256: string }> {
    const opts = this.dataSource.options as Record<string, any>;
    await mkdir(dirname(localPath), { recursive: true });

    return new Promise((resolve, reject) => {
      let rejected = false;
      const fail = (err: Error) => {
        if (!rejected) {
          rejected = true;
          reject(err);
        }
      };

      const pgDump = spawn(
        'pg_dump',
        [
          '-h', opts.host || 'localhost',
          '-p', String(opts.port || 5432),
          '-U', opts.username,
          '-d', opts.database,
          '--no-owner',
          '--no-privileges',
        ],
        {
          env: { ...process.env, PGPASSWORD: opts.password || '' },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );

      let stderr = '';
      pgDump.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const gzip = createGzip();
      const fileStream = createWriteStream(localPath);
      pgDump.stdout.pipe(gzip).pipe(fileStream);

      pgDump.on('error', (err) =>
        fail(new Error(`pg_dump not found or failed to start: ${err.message}`)),
      );

      pgDump.on('close', (code) => {
        if (code !== 0) {
          fail(new Error(`pg_dump exited with code ${code}: ${stderr.slice(0, 500)}`));
        }
      });

      gzip.on('error', (err) => fail(err));
      fileStream.on('error', (err) => fail(err));

      fileStream.on('finish', async () => {
        if (rejected) return;
        try {
          const fileStats = await stat(localPath);
          const hash = createHash('sha256');
          const rs = createReadStream(localPath);
          rs.on('data', (chunk: Buffer) => hash.update(chunk));
          rs.on('end', () =>
            resolve({
              sizeBytes: Number(fileStats.size),
              checksumSha256: hash.digest('hex'),
            }),
          );
          rs.on('error', (err) => fail(err));
        } catch (err) {
          fail(err instanceof Error ? err : new Error(String(err)));
        }
      });
    });
  }

  private getConfig(tenantId: string | null): typeof DEFAULT_BACKUP_CONFIG {
    if (!tenantId) return { ...DEFAULT_BACKUP_CONFIG };

    if (!this.scheduleConfigs.has(tenantId)) {
      this.scheduleConfigs.set(tenantId, { ...DEFAULT_BACKUP_CONFIG });
    }

    return this.scheduleConfigs.get(tenantId)!;
  }
}
