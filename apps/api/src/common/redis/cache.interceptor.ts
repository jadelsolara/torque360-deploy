import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from './redis.service';

export const CACHE_TTL_KEY = 'cache_ttl';
export const CacheTTL = (seconds: number) =>
  SetMetadata(CACHE_TTL_KEY, seconds);

@Injectable()
export class RedisCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();

    if (request.method !== 'GET') return next.handle();

    const ttl = this.reflector.get<number>(
      CACHE_TTL_KEY,
      context.getHandler(),
    );
    if (!ttl) return next.handle();

    const tenantId = request.user?.tenantId || 'public';
    const cacheKey = this.redis.tenantKey(
      tenantId,
      'http',
      request.url,
    );

    const cached = await this.redis.getJson(cacheKey);
    if (cached) return of(cached);

    return next.handle().pipe(
      tap((data) => {
        this.redis.setJson(cacheKey, data, ttl).catch(() => {});
      }),
    );
  }
}
