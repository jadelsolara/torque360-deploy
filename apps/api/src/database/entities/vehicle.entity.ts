import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { WorkOrder } from './work-order.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 17, nullable: true })
  vin: string;

  @Column({ length: 20, nullable: true })
  plate: string;

  @Column({ length: 100 })
  brand: string;

  @Column({ length: 100 })
  model: string;

  @Column()
  year: number;

  @Column({ length: 50, nullable: true })
  color: string;

  @Column({ name: 'engine_type', length: 50, nullable: true })
  engineType: string;

  @Column({ length: 50, nullable: true })
  transmission: string;

  @Column({ default: 0 })
  mileage: number;

  @Column({ name: 'client_id', nullable: true })
  clientId: string;

  @Column({ length: 50, default: 'active' })
  status: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @OneToMany(() => WorkOrder, (wo) => wo.vehicle)
  workOrders: WorkOrder[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
