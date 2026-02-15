import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PayrollDetail } from './payroll-detail.entity';
import { Attendance } from './attendance.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  // ── Personal ──────────────────────────────────────────────────────
  @Column({ length: 20 })
  rut: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date;

  @Column({ length: 20, nullable: true })
  gender: string;

  @Column({ length: 60, default: 'Chilena' })
  nationality: string;

  @Column({ name: 'marital_status', length: 30, nullable: true })
  maritalStatus: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  comuna: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ name: 'personal_email', length: 255, nullable: true })
  personalEmail: string;

  // ── Employment ────────────────────────────────────────────────────
  @Column({ name: 'employee_code', length: 30, nullable: true })
  employeeCode: string;

  @Column({ name: 'hire_date', type: 'date' })
  hireDate: Date;

  @Column({ name: 'termination_date', type: 'date', nullable: true })
  terminationDate: Date;

  @Column({ name: 'contract_type', length: 30, default: 'INDEFINIDO' })
  contractType: string; // INDEFINIDO | PLAZO_FIJO | POR_OBRA | HONORARIOS

  @Column({ length: 100, nullable: true })
  position: string;

  @Column({ length: 100, nullable: true })
  department: string;

  @Column({ name: 'work_schedule', length: 20, default: 'FULL_TIME' })
  workSchedule: string; // FULL_TIME | PART_TIME

  @Column({ name: 'weekly_hours', type: 'int', default: 45 })
  weeklyHours: number;

  // ── Compensation ──────────────────────────────────────────────────
  @Column({ name: 'base_salary', type: 'decimal', precision: 14, scale: 2, default: 0 })
  baseSalary: number;

  @Column({ name: 'gratification_type', length: 20, default: 'ARTICULO_47' })
  gratificationType: string; // ARTICULO_47 | ARTICULO_50

  @Column({ name: 'colacion_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  colacionAmount: number;

  @Column({ name: 'movilizacion_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  movilizacionAmount: number;

  // ── Health ────────────────────────────────────────────────────────
  @Column({ name: 'health_system', length: 20, default: 'FONASA' })
  healthSystem: string; // FONASA | ISAPRE

  @Column({ length: 60, nullable: true })
  isapre: string;

  @Column({ name: 'isapre_code', length: 20, nullable: true })
  isapreCode: string;

  @Column({ name: 'isapre_plan_uf', type: 'decimal', precision: 10, scale: 4, default: 0 })
  isaprePlanUf: number;

  @Column({ name: 'fonasa_tramo', length: 5, nullable: true })
  fonasaTramo: string; // A | B | C | D

  // ── Pension ───────────────────────────────────────────────────────
  @Column({ name: 'afp_name', length: 30, nullable: true })
  afpName: string;

  @Column({ name: 'afp_code', length: 20, nullable: true })
  afpCode: string;

  @Column({ name: 'afp_rate', type: 'decimal', precision: 6, scale: 2, default: 0 })
  afpRate: number;

  @Column({ name: 'is_afp_voluntary', default: false })
  isAfpVoluntary: boolean;

  @Column({ name: 'voluntary_afp_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  voluntaryAfpAmount: number;

  // ── Other ─────────────────────────────────────────────────────────
  @Column({ name: 'seguro_cesantia_type', length: 30, nullable: true })
  seguroCesantiaType: string; // INDEFINIDO_EMPLOYER | PLAZO_FIJO

  @Column({ name: 'apv_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  apvAmount: number;

  @Column({ name: 'family_allowance_tramo', length: 5, nullable: true })
  familyAllowanceTramo: string; // A | B | C | D

  @Column({ name: 'number_of_dependents', type: 'int', default: 0 })
  numberOfDependents: number;

  // ── Status ────────────────────────────────────────────────────────
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ─────────────────────────────────────────────────────
  @OneToMany(() => PayrollDetail, (pd) => pd.employee)
  payrollDetails: PayrollDetail[];

  @OneToMany(() => Attendance, (a) => a.employee)
  attendanceRecords: Attendance[];
}
