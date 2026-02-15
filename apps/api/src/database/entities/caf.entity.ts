import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('caf_folios')
export class CafFolio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'dte_type', type: 'smallint' })
  dteType: number; // DTE type this CAF applies to

  @Column({ name: 'folio_from', type: 'int' })
  folioFrom: number; // Start of folio range

  @Column({ name: 'folio_to', type: 'int' })
  folioTo: number; // End of folio range

  @Column({ name: 'current_folio', type: 'int' })
  currentFolio: number; // Next available folio

  @Column({ name: 'caf_xml', type: 'text' })
  cafXml: string; // Full CAF XML from SII

  @Column({ name: 'private_key', type: 'text', nullable: true })
  privateKey: string; // RSA private key for signing

  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_exhausted', default: false })
  isExhausted: boolean; // All folios used

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
