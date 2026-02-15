import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { BackupRecord } from '../../database/entities/backup-record.entity';
import { StorageMetric } from '../../database/entities/storage-metric.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BackupRecord, StorageMetric])],
  controllers: [BackupController],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
