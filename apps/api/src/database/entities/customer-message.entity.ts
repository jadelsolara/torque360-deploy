import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('customer_messages')
export class CustomerMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'ticket_id' })
  ticketId: string;

  @Column({ name: 'sender_type', length: 10 })
  senderType: string; // CLIENT | STAFF

  @Column({ name: 'sender_id' })
  senderId: string;

  @Column({ name: 'sender_name', length: 200 })
  senderName: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
