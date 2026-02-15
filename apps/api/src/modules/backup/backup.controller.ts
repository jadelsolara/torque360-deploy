import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BackupService } from './backup.service';
import {
  CreateBackupDto,
  BackupFiltersDto,
  UpdateScheduleDto,
  AdjustQuotaDto,
} from './backup.dto';
import { BackupTrigger } from '../../database/entities/backup-record.entity';
import { Tenant, Roles } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@Controller('backup')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class BackupController {
  constructor(private backupService: BackupService) {}

  // ═══════════════════════════════════════════════════════════════════════
  // BACKUP ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════

  @Post()
  @Roles('ADMIN')
  createBackup(
    @Tenant() tenantId: string,
    @Body() dto: CreateBackupDto,
  ) {
    return this.backupService.createBackup(
      tenantId,
      dto.backupType,
      dto.storageTarget,
      BackupTrigger.MANUAL,
    );
  }

  @Get()
  @Roles('MANAGER')
  getBackupHistory(
    @Tenant() tenantId: string,
    @Query() filters: BackupFiltersDto,
  ) {
    return this.backupService.getBackupHistory(tenantId, filters);
  }

  @Get('schedule')
  @Roles('ADMIN')
  getBackupSchedule(@Tenant() tenantId: string) {
    return this.backupService.getBackupSchedule(tenantId);
  }

  @Patch('schedule')
  @Roles('ADMIN')
  updateBackupSchedule(
    @Tenant() tenantId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.backupService.updateBackupSchedule(tenantId, dto);
  }

  @Delete('cleanup')
  @Roles('ADMIN')
  deleteExpiredBackups() {
    return this.backupService.deleteExpiredBackups();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STORAGE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════

  @Get('storage')
  @Roles('MANAGER')
  getCurrentStorage(@Tenant() tenantId: string) {
    return this.backupService.getCurrentStorage(tenantId);
  }

  @Get('storage/history')
  @Roles('MANAGER')
  getStorageHistory(
    @Tenant() tenantId: string,
    @Query('days') days?: string,
  ) {
    return this.backupService.getStorageMetrics(
      tenantId,
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get('storage/summary')
  @Roles('OWNER')
  getStorageSummary() {
    return this.backupService.getStorageSummary();
  }

  @Post('storage/measure')
  @Roles('ADMIN')
  measureStorage(@Tenant() tenantId: string) {
    return this.backupService.measureStorage(tenantId);
  }

  @Patch('storage/quota')
  @Roles('OWNER')
  adjustQuota(
    @Tenant() tenantId: string,
    @Body() dto: AdjustQuotaDto,
  ) {
    return this.backupService.adjustQuota(tenantId, dto.quotaBytes);
  }

  @Get('storage/scale-history')
  @Roles('MANAGER')
  getScaleHistory(@Tenant() tenantId: string) {
    return this.backupService.getScaleHistory(tenantId);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BACKUP DETAIL & RESTORE
  // ═══════════════════════════════════════════════════════════════════════

  @Get(':id')
  @Roles('MANAGER')
  getBackupById(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.backupService.getBackupById(tenantId, id);
  }

  @Post(':id/restore')
  @Roles('OWNER')
  restoreBackup(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.backupService.restoreBackup(tenantId, id);
  }
}
