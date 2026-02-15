export interface AuditEntry {
  userId: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, { from: unknown; to: unknown }>;
  metadata: Record<string, unknown>;
}

export interface IAuditTrail {
  log(entry: AuditEntry): Promise<void>;
  getTrail(entityType: string, entityId: string): Promise<AuditEntry[]>;
  getTrailByUser(userId: string, limit?: number): Promise<AuditEntry[]>;
}
