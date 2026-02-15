import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 20, nullable: true })
  rut: string;

  @Column({ length: 100, nullable: true })
  country: string;

  @Column({ name: 'contact_name', length: 200, nullable: true })
  contactName: string;

  @Column({ name: 'contact_email', length: 255, nullable: true })
  contactEmail: string;

  @Column({ name: 'contact_phone', length: 50, nullable: true })
  contactPhone: string;

  @Column({ name: 'payment_terms', length: 100, nullable: true })
  paymentTerms: string;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
