import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('client_contacts')
export class ClientContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  position: string;

  @Column({ length: 50, default: 'contact' })
  role: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ name: 'can_approve_quotes', default: false })
  canApproveQuotes: boolean;

  @Column({ name: 'can_authorize_work', default: false })
  canAuthorizeWork: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
