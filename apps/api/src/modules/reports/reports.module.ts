import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportRequest } from '../../database/entities/report-request.entity';
import { DataExport } from '../../database/entities/data-export.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReportRequest, DataExport])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
