export type AuditAction = 'create' | 'update' | 'delete' | 'status_change' | 'login';

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  changes: Record<string, { from: unknown; to: unknown }>;
  metadata: Record<string, unknown>;
  prevHash: string;
  hash: string;
  createdAt: Date;
}
