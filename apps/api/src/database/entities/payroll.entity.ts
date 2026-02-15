import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PayrollDetail } from './payroll-detail.entity';

@Entity('payrolls')
export class Payroll {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 7 })
  period: string; // YYYY-MM

  @Column({ length: 20, default: 'DRAFT' })
  status: string; // DRAFT | CALCULATED | APPROVED | PAID | VOIDED

  @Column({ name: 'total_haberes', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalHaberes: number;

  @Column({ name: 'total_descuentos', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalDescuentos: number;

  @Column({ name: 'total_liquido', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalLiquido: number;

  @Column({ name: 'total_costo_empresa', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalCostoEmpresa: number;

  @Column({ name: 'employee_count', type: 'int', default: 0 })
  employeeCount: number;

  @Column({ name: 'uf_value', type: 'decimal', precision: 10, scale: 4, default: 0 })
  ufValue: number;

  @Column({ name: 'utm_value', type: 'decimal', precision: 10, scale: 2, default: 0 })
  utmValue: number;

  @Column({ name: 'ingreso_minimo', type: 'decimal', precision: 14, scale: 2, default: 0 })
  ingresoMinimo: number;

  @Column({ name: 'calculated_at', type: 'timestamptz', nullable: true })
  calculatedAt: Date;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Relations ─────────────────────────────────────────────────────
  @OneToMany(() => PayrollDetail, (pd) => pd.payroll)
  details: PayrollDetail[];
}
