import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { CreateAuditLogDto, ListAuditLogsQueryDto } from './audit.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
  ) {}

  async createLog(
    tenantId: string,
    userId: string | null,
    dto: CreateAuditLogDto,
  ): Promise<AuditLog> {
    // Get the most recent log entry for this tenant to build the hash chain
    const lastLog = await this.auditLogRepo.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    const prevHash = lastLog?.hash || null;

    // Build the hash payload: previous hash + current entry data
    const hashPayload = JSON.stringify({
      prevHash,
      tenantId,
      userId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      action: dto.action,
      changes: dto.changes || {},
      metadata: dto.metadata || {},
      timestamp: new Date().toISOString(),
    });

    const hash = createHash('sha256').update(hashPayload).digest('hex');

    const log = this.auditLogRepo.create({
      tenantId,
      userId: userId ?? undefined,
      entityType: dto.entityType,
      entityId: dto.entityId,
      action: dto.action,
      changes: dto.changes || {},
      metadata: dto.metadata || {},
      prevHash: prevHash ?? undefined,
      hash,
    });

    return this.auditLogRepo.save(log) as Promise<AuditLog>;
  }

  async findAll(tenantId: string, query: ListAuditLogsQueryDto): Promise<AuditLog[]> {
    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId });

    if (query.entityType) {
      qb.andWhere('log.entityType = :entityType', {
        entityType: query.entityType,
      });
    }

    if (query.entityId) {
      qb.andWhere('log.entityId = :entityId', {
        entityId: query.entityId,
      });
    }

    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }

    if (query.userId) {
      qb.andWhere('log.userId = :userId', { userId: query.userId });
    }

    if (query.dateFrom) {
      qb.andWhere('log.createdAt >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }

    if (query.dateTo) {
      qb.andWhere('log.createdAt <= :dateTo', {
        dateTo: new Date(query.dateTo),
      });
    }

    qb.orderBy('log.createdAt', 'DESC');

    const limit = query.limit ?? 100;
    qb.take(Math.min(limit, 500));

    return qb.getMany();
  }

  async verifyChain(tenantId: string): Promise<{
    valid: boolean;
    totalEntries: number;
    brokenAt?: string;
  }> {
    const logs = await this.auditLogRepo.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });

    for (let i = 1; i < logs.length; i++) {
      if (logs[i].prevHash !== logs[i - 1].hash) {
        return {
          valid: false,
          totalEntries: logs.length,
          brokenAt: logs[i].id,
        };
      }
    }

    return {
      valid: true,
      totalEntries: logs.length,
    };
  }
}
