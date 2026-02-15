import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Warehouse } from './warehouse.entity';

@Entity('warehouse_locations')
export class WarehouseLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @ManyToOne(() => Warehouse, (w) => w.locations)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ length: 50, nullable: true })
  zone: string;

  @Column({ length: 20, nullable: true })
  aisle: string;

  @Column({ length: 20, nullable: true })
  rack: string;

  @Column({ length: 20, nullable: true })
  shelf: string;

  @Column({ length: 20, nullable: true })
  bin: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  capacity: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
