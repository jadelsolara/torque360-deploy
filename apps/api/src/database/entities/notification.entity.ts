import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 50 })
  type: string;

  @Column({ length: 50 })
  channel: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'entity_type', length: 100, nullable: true })
  entityType: string;

  @Column({ name: 'entity_id', nullable: true })
  entityId: string;

  @Column({ name: 'action_url', length: 500, nullable: true })
  actionUrl: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
