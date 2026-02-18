import {
  Injectable,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, Index } from 'meilisearch';

export interface SearchResult<T extends Record<string, any> = Record<string, any>> {
  hits: T[];
  totalHits: number;
  processingTimeMs: number;
  query: string;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const host = this.config.get('MEILI_HOST', 'http://localhost:7700');
    const apiKey = this.config.get('MEILI_MASTER_KEY', '');

    try {
      this.client = new MeiliSearch({ host, apiKey });
      const health = await this.client.health();
      this.logger.log(`Meilisearch connected (status: ${health.status})`);
    } catch (err) {
      this.logger.warn(
        `Meilisearch unavailable: ${(err as Error).message}. Full-text search disabled.`,
      );
      this.client = null;
    }
  }

  get isAvailable(): boolean {
    return this.client !== null;
  }

  // ── Index Management ──────────────────────────────────────────────────

  private indexName(tenantId: string, entity: string): string {
    return `${tenantId}_${entity}`;
  }

  async ensureIndex(
    tenantId: string,
    entity: string,
    options?: {
      searchableAttributes?: string[];
      filterableAttributes?: string[];
      sortableAttributes?: string[];
    },
  ): Promise<Index | null> {
    if (!this.client) return null;

    const uid = this.indexName(tenantId, entity);

    try {
      await this.client.createIndex(uid, { primaryKey: 'id' });
    } catch {
      // Index already exists — OK
    }

    const index = this.client.index(uid);

    if (options?.searchableAttributes) {
      await index.updateSearchableAttributes(options.searchableAttributes);
    }
    if (options?.filterableAttributes) {
      await index.updateFilterableAttributes(options.filterableAttributes);
    }
    if (options?.sortableAttributes) {
      await index.updateSortableAttributes(options.sortableAttributes);
    }

    return index;
  }

  // ── Document Operations ───────────────────────────────────────────────

  async indexDocuments(
    tenantId: string,
    entity: string,
    documents: Record<string, unknown>[],
  ): Promise<void> {
    if (!this.client || documents.length === 0) return;

    const uid = this.indexName(tenantId, entity);
    try {
      await this.client.index(uid).addDocuments(documents);
    } catch (err) {
      this.logger.error(`Index error [${uid}]: ${(err as Error).message}`);
    }
  }

  async removeDocuments(
    tenantId: string,
    entity: string,
    ids: string[],
  ): Promise<void> {
    if (!this.client || ids.length === 0) return;

    const uid = this.indexName(tenantId, entity);
    try {
      await this.client.index(uid).deleteDocuments(ids);
    } catch (err) {
      this.logger.error(`Delete error [${uid}]: ${(err as Error).message}`);
    }
  }

  // ── Search ────────────────────────────────────────────────────────────

  async search<T extends Record<string, any> = Record<string, any>>(
    tenantId: string,
    entity: string,
    query: string,
    options?: {
      filter?: string;
      sort?: string[];
      limit?: number;
      offset?: number;
    },
  ): Promise<SearchResult<T>> {
    if (!this.client) {
      return { hits: [], totalHits: 0, processingTimeMs: 0, query };
    }

    const uid = this.indexName(tenantId, entity);

    try {
      const result = await this.client.index(uid).search<T>(query, {
        filter: options?.filter,
        sort: options?.sort,
        limit: options?.limit ?? 20,
        offset: options?.offset ?? 0,
      });

      return {
        hits: result.hits,
        totalHits: result.estimatedTotalHits ?? result.hits.length,
        processingTimeMs: result.processingTimeMs,
        query,
      };
    } catch (err) {
      this.logger.error(`Search error [${uid}]: ${(err as Error).message}`);
      return { hits: [], totalHits: 0, processingTimeMs: 0, query };
    }
  }

  // ── Tenant Cleanup ────────────────────────────────────────────────────

  async deleteTenantIndexes(tenantId: string): Promise<void> {
    if (!this.client) return;

    try {
      const { results } = await this.client.getIndexes();
      const tenantIndexes = results.filter((idx) =>
        idx.uid.startsWith(`${tenantId}_`),
      );
      for (const idx of tenantIndexes) {
        await this.client.deleteIndex(idx.uid);
      }
    } catch (err) {
      this.logger.error(`Cleanup error: ${(err as Error).message}`);
    }
  }
}
