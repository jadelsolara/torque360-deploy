import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Payroll } from './payroll.entity';
import { Employee } from './employee.entity';

@Entity('payroll_details')
export class PayrollDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'payroll_id' })
  payrollId: string;

  @Column({ name: 'employee_id' })
  employeeId: string;

  // ── Haberes (Earnings) ────────────────────────────────────────────
  @Column({ name: 'sueldo_base', type: 'decimal', precision: 14, scale: 2, default: 0 })
  sueldoBase: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  gratificacion: number;

  @Column({ name: 'horas_extra', type: 'int', default: 0 })
  horasExtra: number;

  @Column({ name: 'monto_horas_extra', type: 'decimal', precision: 14, scale: 2, default: 0 })
  montoHorasExtra: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  bonos: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  comisiones: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  colacion: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  movilizacion: number;

  @Column({ name: 'otros_haberes', type: 'decimal', precision: 14, scale: 2, default: 0 })
  otrosHaberes: number;

  @Column({ name: 'total_imponible', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalImponible: number;

  @Column({ name: 'total_no_imponible', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalNoImponible: number;

  @Column({ name: 'total_haberes', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalHaberes: number;

  // ── Descuentos Legales (Mandatory Deductions) ─────────────────────
  @Column({ name: 'afp_rate', type: 'decimal', precision: 6, scale: 2, default: 0 })
  afpRate: number;

  @Column({ name: 'afp_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  afpAmount: number;

  @Column({ name: 'salud_rate', type: 'decimal', precision: 6, scale: 2, default: 0 })
  saludRate: number;

  @Column({ name: 'salud_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  saludAmount: number;

  @Column({ name: 'salud_adicional_isapre', type: 'decimal', precision: 14, scale: 2, default: 0 })
  saludAdicionalIsapre: number;

  @Column({ name: 'seguro_cesantia_rate', type: 'decimal', precision: 6, scale: 2, default: 0 })
  seguroCesantiaRate: number;

  @Column({ name: 'seguro_cesantia_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  seguroCesantiaAmount: number;

  @Column({ name: 'impuesto_unico', type: 'decimal', precision: 14, scale: 2, default: 0 })
  impuestoUnico: number;

  // ── Descuentos Voluntarios ────────────────────────────────────────
  @Column({ name: 'apv_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  apvAmount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  anticipos: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  prestamos: number;

  @Column({ name: 'otros_descuentos', type: 'decimal', precision: 14, scale: 2, default: 0 })
  otrosDescuentos: number;

  @Column({ name: 'total_descuentos', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalDescuentos: number;

  // ── Aportes Empleador (Employer Costs) ────────────────────────────
  @Column({ name: 'seguro_cesantia_empleador', type: 'decimal', precision: 14, scale: 2, default: 0 })
  seguroCesantiaEmpleador: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  sis: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  mutualidad: number;

  @Column({ name: 'total_costo_empleador', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalCostoEmpleador: number;

  // ── Result ────────────────────────────────────────────────────────
  @Column({ name: 'sueldo_liquido', type: 'decimal', precision: 14, scale: 2, default: 0 })
  sueldoLiquido: number;

  @Column({ name: 'costo_total_empresa', type: 'decimal', precision: 14, scale: 2, default: 0 })
  costoTotalEmpresa: number;

  // ── Metadata ──────────────────────────────────────────────────────
  @Column({ name: 'days_worked', type: 'int', default: 30 })
  daysWorked: number;

  @Column({ name: 'days_absent', type: 'int', default: 0 })
  daysAbsent: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ── Relations ─────────────────────────────────────────────────────
  @ManyToOne(() => Payroll, (p) => p.details)
  @JoinColumn({ name: 'payroll_id' })
  payroll: Payroll;

  @ManyToOne(() => Employee, (e) => e.payrollDetails)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}
