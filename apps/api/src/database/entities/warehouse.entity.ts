import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { WarehouseLocation } from './warehouse-location.entity';

@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50 })
  code: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  region: string;

  @Column({ length: 50, default: 'main' })
  type: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => WarehouseLocation, (l) => l.warehouse)
  locations: WarehouseLocation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
