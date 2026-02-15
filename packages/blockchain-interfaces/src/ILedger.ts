export interface LedgerEntry {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  data: Record<string, unknown>;
  prevHash: string;
  hash: string;
  timestamp: Date;
}

export interface ILedger {
  append(entry: Omit<LedgerEntry, 'id' | 'hash' | 'timestamp'>): Promise<LedgerEntry>;
  getHistory(entityType: string, entityId: string): Promise<LedgerEntry[]>;
  verify(entityType: string, entityId: string): Promise<boolean>;
}
