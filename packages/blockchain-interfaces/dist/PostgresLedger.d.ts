import type { ILedger, LedgerEntry } from './ILedger';
/**
 * PostgreSQL-backed implementation of the ILedger interface.
 * Uses a hash-chain pattern for tamper-evident audit logging.
 * Designed to be swapped for a blockchain-backed implementation later.
 */
export declare class PostgresLedger implements ILedger {
    private dataSource;
    constructor(dataSource: {
        query: (sql: string, params?: unknown[]) => Promise<{
            rows: Record<string, unknown>[];
        }>;
    });
    /**
     * Compute SHA-256 hash from data payload + previous hash.
     */
    private computeHash;
    /**
     * Append a new entry to the ledger.
     * Automatically computes the hash based on data + prevHash.
     */
    append(entry: Omit<LedgerEntry, 'id' | 'hash' | 'timestamp'>): Promise<LedgerEntry>;
    /**
     * Get the full history of ledger entries for a given entity.
     * Returns entries ordered chronologically (oldest first).
     */
    getHistory(entityType: string, entityId: string): Promise<LedgerEntry[]>;
    /**
     * Verify the integrity of the hash chain for a given entity.
     * Walks through all entries in chronological order and re-computes
     * each hash to ensure no entry has been tampered with.
     *
     * Returns true if the entire chain is valid, false otherwise.
     */
    verify(entityType: string, entityId: string): Promise<boolean>;
}
//# sourceMappingURL=PostgresLedger.d.ts.map