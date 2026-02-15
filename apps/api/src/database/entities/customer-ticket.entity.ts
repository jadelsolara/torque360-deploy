import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('customer_tickets')
export class CustomerTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'work_order_id', nullable: true })
  workOrderId: string;

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId: string;

  @Column({ name: 'ticket_number', length: 20 })
  ticketNumber: string;

  @Column({ length: 200 })
  subject: string;

  @Column({ length: 30, default: 'GENERAL' })
  category: string; // CONSULTA_ESTADO | CONSULTA_PRESUPUESTO | RECLAMO | SOLICITUD_INFORME | GENERAL

  @Column({ length: 10, default: 'MEDIUM' })
  priority: string; // LOW | MEDIUM | HIGH

  @Column({ length: 20, default: 'OPEN' })
  status: string; // OPEN | IN_PROGRESS | WAITING_CLIENT | RESOLVED | CLOSED

  @Column({ name: 'is_paid_report', default: false })
  isPaidReport: boolean;

  @Column({ name: 'report_amount', type: 'decimal', precision: 14, scale: 2, nullable: true })
  reportAmount: number;

  @Column({ name: 'report_url', type: 'text', nullable: true })
  reportUrl: string;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
