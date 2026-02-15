import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.users)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  @Exclude()
  passwordHash: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ length: 50, default: 'OPERATOR' })
  role: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'mfa_secret', nullable: true })
  @Exclude()
  mfaSecret: string;

  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'last_login', type: 'timestamptz', nullable: true })
  lastLogin: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
