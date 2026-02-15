import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('customer_accesses')
export class CustomerAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'access_code' })
  accessCode: string; // bcrypt hashed 6-digit PIN

  @Column({ length: 255 })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
