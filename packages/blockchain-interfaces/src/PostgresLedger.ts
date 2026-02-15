import { createHash } from 'crypto';
import type { ILedger, LedgerEntry } from './ILedger';

/**
 * PostgreSQL-backed implementation of the ILedger interface.
 * Uses a hash-chain pattern for tamper-evident audit logging.
 * Designed to be swapped for a blockchain-backed implementation later.
 */
export class PostgresLedger implements ILedger {
  private dataSource: {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  };

  constructor(dataSource: {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  }) {
    this.dataSource = dataSource;
  }

  /**
   * Compute SHA-256 hash from data payload + previous hash.
   */
  private computeHash(data: Record<string, unknown>, prevHash: string): string {
    const payload = JSON.stringify(data) + prevHash;
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Append a new entry to the ledger.
   * Automatically computes the hash based on data + prevHash.
   */
  async append(
    entry: Omit<LedgerEntry, 'id' | 'hash' | 'timestamp'>,
  ): Promise<LedgerEntry> {
    const hash = this.computeHash(entry.data, entry.prevHash);
    const now = new Date();

    const sql = `
      INSERT INTO audit_logs (tenant_id, entity_type, entity_id, action, data, prev_hash, hash, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, tenant_id, entity_type, entity_id, action, data, prev_hash, hash, created_at
    `;

    const params = [
      entry.tenantId,
      entry.entityType,
      entry.entityId,
      entry.action,
      JSON.stringify(entry.data),
      entry.prevHash,
      hash,
      now.toISOString(),
    ];

    const result = await this.dataSource.query(sql, params);
    const row = result.rows[0];

    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      action: row.action as string,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : (row.data as Record<string, unknown>),
      prevHash: row.prev_hash as string,
      hash: row.hash as string,
      timestamp: new Date(row.created_at as string),
    };
  }

  /**
   * Get the full history of ledger entries for a given entity.
   * Returns entries ordered chronologically (oldest first).
   */
  async getHistory(entityType: string, entityId: string): Promise<LedgerEntry[]> {
    const sql = `
      SELECT id, tenant_id, entity_type, entity_id, action, data, prev_hash, hash, created_at
      FROM audit_logs
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY created_at ASC
    `;

    const result = await this.dataSource.query(sql, [entityType, entityId]);

    return result.rows.map((row) => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      action: row.action as string,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : (row.data as Record<string, unknown>),
      prevHash: row.prev_hash as string,
      hash: row.hash as string,
      timestamp: new Date(row.created_at as string),
    }));
  }

  /**
   * Verify the integrity of the hash chain for a given entity.
   * Walks through all entries in chronological order and re-computes
   * each hash to ensure no entry has been tampered with.
   *
   * Returns true if the entire chain is valid, false otherwise.
   */
  async verify(entityType: string, entityId: string): Promise<boolean> {
    const entries = await this.getHistory(entityType, entityId);

    if (entries.length === 0) {
      return true;
    }

    for (const entry of entries) {
      const expectedHash = this.computeHash(entry.data, entry.prevHash);
      if (entry.hash !== expectedHash) {
        return false;
      }
    }

    // Verify chain linkage: each entry's prevHash must match the previous entry's hash
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].prevHash !== entries[i - 1].hash) {
        return false;
      }
    }

    return true;
  }
}
