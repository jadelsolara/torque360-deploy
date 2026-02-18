import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD', undefined),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 5000),
      lazyConnect: true,
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err.message));

    return this.client.connect().catch((err) => {
      this.logger.warn(`Redis unavailable: ${err.message}. Caching disabled.`);
    });
  }

  async onModuleDestroy() {
    await this.client?.quit().catch(() => {});
  }

  get isConnected(): boolean {
    return this.client?.status === 'ready';
  }

  getClient(): Redis {
    return this.client;
  }

  // ── Key-Value Operations ──────────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) return;
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.isConnected || keys.length === 0) return;
    await this.client.del(...keys);
  }

  // ── JSON helpers ──────────────────────────────────────────────────────

  async getJson<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  // ── Pattern Operations ────────────────────────────────────────────────

  async delByPattern(pattern: string): Promise<number> {
    if (!this.isConnected) return 0;
    let cursor = '0';
    let deleted = 0;
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.client.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== '0');
    return deleted;
  }

  // ── Tenant-scoped helpers ─────────────────────────────────────────────

  tenantKey(tenantId: string, ...parts: string[]): string {
    return `t:${tenantId}:${parts.join(':')}`;
  }

  async invalidateTenant(tenantId: string): Promise<number> {
    return this.delByPattern(`t:${tenantId}:*`);
  }
}
