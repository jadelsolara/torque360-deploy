import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 20, unique: true })
  rut: string;

  @Column({ name: 'business_name', length: 255 })
  businessName: string;

  @Column({ name: 'trade_name', length: 255, nullable: true })
  tradeName: string;

  @Column({ length: 100, nullable: true })
  industry: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  region: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ name: 'parent_company_id', nullable: true })
  parentCompanyId: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
