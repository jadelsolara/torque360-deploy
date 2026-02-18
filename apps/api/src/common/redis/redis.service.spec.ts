import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

// Mock ioredis
const mockRedisInstance = {
  status: 'ready',
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn(() => mockRedisInstance),
  };
});

describe('RedisService', () => {
  let service: RedisService;

  const mockConfig = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const map: Record<string, unknown> = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: undefined,
      };
      return map[key] ?? fallback;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // ── Connection ────────────────────────────────────────────────────────

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should report connected when Redis is ready', () => {
    expect(service.isConnected).toBe(true);
  });

  it('should return the Redis client', () => {
    expect(service.getClient()).toBe(mockRedisInstance);
  });

  // ── Key-Value Operations ──────────────────────────────────────────────

  describe('get/set', () => {
    it('should get a value', async () => {
      mockRedisInstance.get.mockResolvedValue('bar');
      const result = await service.get('foo');
      expect(result).toBe('bar');
      expect(mockRedisInstance.get).toHaveBeenCalledWith('foo');
    });

    it('should return null for missing key', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      expect(await service.get('missing')).toBeNull();
    });

    it('should set a value without TTL', async () => {
      mockRedisInstance.set.mockResolvedValue('OK');
      await service.set('key1', 'value1');
      expect(mockRedisInstance.set).toHaveBeenCalledWith('key1', 'value1');
    });

    it('should set a value with TTL', async () => {
      mockRedisInstance.set.mockResolvedValue('OK');
      await service.set('key2', 'value2', 300);
      expect(mockRedisInstance.set).toHaveBeenCalledWith('key2', 'value2', 'EX', 300);
    });
  });

  describe('del', () => {
    it('should delete keys', async () => {
      mockRedisInstance.del.mockResolvedValue(2);
      await service.del('a', 'b');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('a', 'b');
    });

    it('should skip del when no keys', async () => {
      await service.del();
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });
  });

  // ── JSON Helpers ──────────────────────────────────────────────────────

  describe('getJson/setJson', () => {
    it('should get and parse JSON', async () => {
      mockRedisInstance.get.mockResolvedValue('{"name":"test","count":5}');
      const result = await service.getJson<{ name: string; count: number }>('json-key');
      expect(result).toEqual({ name: 'test', count: 5 });
    });

    it('should return null for invalid JSON', async () => {
      mockRedisInstance.get.mockResolvedValue('not-json');
      expect(await service.getJson('bad')).toBeNull();
    });

    it('should set JSON value', async () => {
      mockRedisInstance.set.mockResolvedValue('OK');
      await service.setJson('obj', { x: 1 }, 60);
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'obj',
        '{"x":1}',
        'EX',
        60,
      );
    });
  });

  // ── Pattern Operations ────────────────────────────────────────────────

  describe('delByPattern', () => {
    it('should scan and delete matching keys', async () => {
      mockRedisInstance.scan
        .mockResolvedValueOnce(['0', ['key1', 'key2']]);
      mockRedisInstance.del.mockResolvedValue(2);

      const deleted = await service.delByPattern('prefix:*');
      expect(deleted).toBe(2);
      expect(mockRedisInstance.del).toHaveBeenCalledWith('key1', 'key2');
    });

    it('should handle empty scan results', async () => {
      mockRedisInstance.scan.mockResolvedValueOnce(['0', []]);
      const deleted = await service.delByPattern('empty:*');
      expect(deleted).toBe(0);
    });
  });

  // ── Tenant Helpers ────────────────────────────────────────────────────

  describe('tenantKey', () => {
    it('should build tenant-scoped keys', () => {
      expect(service.tenantKey('t1', 'dashboard', 'kpis')).toBe('t:t1:dashboard:kpis');
    });
  });

  describe('invalidateTenant', () => {
    it('should delete all tenant keys', async () => {
      mockRedisInstance.scan.mockResolvedValueOnce(['0', ['t:t1:a', 't:t1:b']]);
      mockRedisInstance.del.mockResolvedValue(2);
      const count = await service.invalidateTenant('t1');
      expect(count).toBe(2);
    });
  });

  // ── Graceful Degradation ──────────────────────────────────────────────

  describe('when disconnected', () => {
    beforeEach(() => {
      Object.defineProperty(mockRedisInstance, 'status', { value: 'end', writable: true });
    });

    afterEach(() => {
      Object.defineProperty(mockRedisInstance, 'status', { value: 'ready', writable: true });
    });

    it('get should return null', async () => {
      expect(await service.get('any')).toBeNull();
    });

    it('set should be a no-op', async () => {
      await service.set('k', 'v');
      expect(mockRedisInstance.set).not.toHaveBeenCalled();
    });

    it('delByPattern should return 0', async () => {
      expect(await service.delByPattern('*')).toBe(0);
    });
  });
});
