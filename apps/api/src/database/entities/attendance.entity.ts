import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

@Entity('attendance')
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'employee_id' })
  employeeId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'check_in', type: 'timestamptz', nullable: true })
  checkIn: Date;

  @Column({ name: 'check_out', type: 'timestamptz', nullable: true })
  checkOut: Date;

  @Column({ name: 'hours_worked', type: 'decimal', precision: 5, scale: 2, default: 0 })
  hoursWorked: number;

  @Column({ length: 30, default: 'NORMAL' })
  type: string; // NORMAL | HORA_EXTRA | FERIADO | LICENCIA_MEDICA | VACACIONES | PERMISO

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ── Relations ─────────────────────────────────────────────────────
  @ManyToOne(() => Employee, (e) => e.attendanceRecords)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}
