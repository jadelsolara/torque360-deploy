import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';

const mockIndex = {
  addDocuments: jest.fn().mockResolvedValue({ taskUid: 1 }),
  deleteDocuments: jest.fn().mockResolvedValue({ taskUid: 2 }),
  search: jest.fn(),
  updateSearchableAttributes: jest.fn().mockResolvedValue({ taskUid: 3 }),
  updateFilterableAttributes: jest.fn().mockResolvedValue({ taskUid: 4 }),
  updateSortableAttributes: jest.fn().mockResolvedValue({ taskUid: 5 }),
};

const mockClient = {
  health: jest.fn().mockResolvedValue({ status: 'available' }),
  createIndex: jest.fn().mockResolvedValue({ taskUid: 0 }),
  index: jest.fn().mockReturnValue(mockIndex),
  getIndexes: jest.fn().mockResolvedValue({ results: [] }),
  deleteIndex: jest.fn().mockResolvedValue({ taskUid: 6 }),
};

jest.mock('meilisearch', () => ({
  MeiliSearch: jest.fn(() => mockClient),
}));

describe('SearchService', () => {
  let service: SearchService;

  const mockConfig = {
    get: jest.fn((key: string, fallback?: string) => {
      const map: Record<string, string> = {
        MEILI_HOST: 'http://localhost:7700',
        MEILI_MASTER_KEY: 'test-key',
      };
      return map[key] ?? fallback;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should report available after successful init', () => {
    expect(service.isAvailable).toBe(true);
  });

  // ── Index Management ──────────────────────────────────────────────────

  describe('ensureIndex', () => {
    it('should create an index with tenant prefix', async () => {
      const index = await service.ensureIndex('tenant1', 'inventory', {
        searchableAttributes: ['name', 'sku'],
        filterableAttributes: ['category', 'brand'],
        sortableAttributes: ['name'],
      });

      expect(mockClient.createIndex).toHaveBeenCalledWith('tenant1_inventory', {
        primaryKey: 'id',
      });
      expect(mockIndex.updateSearchableAttributes).toHaveBeenCalledWith(['name', 'sku']);
      expect(mockIndex.updateFilterableAttributes).toHaveBeenCalledWith(['category', 'brand']);
      expect(mockIndex.updateSortableAttributes).toHaveBeenCalledWith(['name']);
      expect(index).toBe(mockIndex);
    });

    it('should handle existing index gracefully', async () => {
      mockClient.createIndex.mockRejectedValueOnce(new Error('index already exists'));
      const index = await service.ensureIndex('t1', 'clients');
      expect(index).toBe(mockIndex);
    });
  });

  // ── Document Operations ───────────────────────────────────────────────

  describe('indexDocuments', () => {
    it('should index documents', async () => {
      const docs = [
        { id: '1', name: 'Part A' },
        { id: '2', name: 'Part B' },
      ];
      await service.indexDocuments('t1', 'inventory', docs);
      expect(mockClient.index).toHaveBeenCalledWith('t1_inventory');
      expect(mockIndex.addDocuments).toHaveBeenCalledWith(docs);
    });

    it('should skip empty documents', async () => {
      await service.indexDocuments('t1', 'inventory', []);
      expect(mockIndex.addDocuments).not.toHaveBeenCalled();
    });
  });

  describe('removeDocuments', () => {
    it('should delete documents by ids', async () => {
      await service.removeDocuments('t1', 'clients', ['id1', 'id2']);
      expect(mockIndex.deleteDocuments).toHaveBeenCalledWith(['id1', 'id2']);
    });
  });

  // ── Search ────────────────────────────────────────────────────────────

  describe('search', () => {
    it('should search and return results', async () => {
      mockIndex.search.mockResolvedValue({
        hits: [{ id: '1', name: 'Filtro aceite' }],
        estimatedTotalHits: 1,
        processingTimeMs: 3,
      });

      const result = await service.search('t1', 'inventory', 'filtro');

      expect(result).toEqual({
        hits: [{ id: '1', name: 'Filtro aceite' }],
        totalHits: 1,
        processingTimeMs: 3,
        query: 'filtro',
      });
    });

    it('should pass filter and sort options', async () => {
      mockIndex.search.mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 1,
      });

      await service.search('t1', 'inventory', 'brake', {
        filter: 'category = "frenos"',
        sort: ['name:asc'],
        limit: 10,
        offset: 5,
      });

      expect(mockIndex.search).toHaveBeenCalledWith('brake', {
        filter: 'category = "frenos"',
        sort: ['name:asc'],
        limit: 10,
        offset: 5,
      });
    });

    it('should return empty results on error', async () => {
      mockIndex.search.mockRejectedValue(new Error('index not found'));
      const result = await service.search('t1', 'missing', 'test');
      expect(result.hits).toEqual([]);
      expect(result.totalHits).toBe(0);
    });
  });

  // ── Tenant Cleanup ────────────────────────────────────────────────────

  describe('deleteTenantIndexes', () => {
    it('should delete all indexes for a tenant', async () => {
      mockClient.getIndexes.mockResolvedValue({
        results: [
          { uid: 't1_inventory' },
          { uid: 't1_clients' },
          { uid: 't2_inventory' },
        ],
      });

      await service.deleteTenantIndexes('t1');

      expect(mockClient.deleteIndex).toHaveBeenCalledTimes(2);
      expect(mockClient.deleteIndex).toHaveBeenCalledWith('t1_inventory');
      expect(mockClient.deleteIndex).toHaveBeenCalledWith('t1_clients');
    });
  });
});
