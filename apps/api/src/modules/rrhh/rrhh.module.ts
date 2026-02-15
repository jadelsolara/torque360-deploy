import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../../database/entities/employee.entity';
import { Payroll } from '../../database/entities/payroll.entity';
import { PayrollDetail } from '../../database/entities/payroll-detail.entity';
import { Attendance } from '../../database/entities/attendance.entity';
import { RrhhController } from './rrhh.controller';
import { RrhhService } from './rrhh.service';
import { PayrollService } from './payroll.service';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Payroll, PayrollDetail, Attendance]),
  ],
  controllers: [RrhhController],
  providers: [RrhhService, PayrollService, AttendanceService],
  exports: [RrhhService, PayrollService, AttendanceService],
})
export class RrhhModule {}
