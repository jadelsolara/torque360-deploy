import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from '../src/modules/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { User } from '../src/database/entities/user.entity';
import { Tenant } from '../src/database/entities/tenant.entity';

/**
 * Auth E2E Tests
 *
 * These tests require a running PostgreSQL database.
 * Set TEST_DATABASE_* env vars or they default to torque360_test.
 *
 * To run: DATABASE_NAME=torque360_test JWT_SECRET=test-secret pnpm test:e2e
 */
describe('Auth (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Skip if no test database is configured
    if (!process.env.JWT_SECRET) {
      console.log('Skipping E2E tests: JWT_SECRET not set');
      return;
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        ThrottlerModule.forRoot([
          { name: 'short', ttl: 60000, limit: 100 },
          { name: 'medium', ttl: 60000, limit: 100 },
          { name: 'long', ttl: 60000, limit: 100 },
        ]),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DATABASE_HOST || 'localhost',
          port: parseInt(process.env.TEST_DATABASE_PORT || '5432', 10),
          username: process.env.TEST_DATABASE_USER || 'torque',
          password: process.env.TEST_DATABASE_PASSWORD || 'torque360',
          database: process.env.TEST_DATABASE_NAME || 'torque360_test',
          entities: [User, Tenant],
          synchronize: true, // OK for test DB
          dropSchema: true, // Clean slate each run
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const tenantDto = {
    tenantName: 'Taller E2E',
    tenantSlug: `e2e-test-${Date.now()}`,
    email: `e2e-${Date.now()}@test.com`,
    password: 'SecurePass123',
    firstName: 'E2E',
    lastName: 'Tester',
  };

  let accessToken: string;
  let refreshToken: string;

  describe('POST /api/auth/register', () => {
    it('should register a new tenant and return tokens', async () => {
      if (!app) return;

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(tenantDto)
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(tenantDto.email);
      expect(res.body.user.role).toBe('OWNER');
      expect(res.body.tenant.slug).toBe(tenantDto.tenantSlug);

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should reject duplicate tenant slug', async () => {
      if (!app) return;

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(tenantDto)
        .expect(409);
    });

    it('should validate required fields', async () => {
      if (!app) return;

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ tenantName: 'Missing Fields' })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should reject password shorter than 8 characters', async () => {
      if (!app) return;

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...tenantDto, tenantSlug: 'new-slug', email: 'new@test.com', password: 'short' })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      if (!app) return;

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: tenantDto.email, password: tenantDto.password })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(tenantDto.email);

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should reject invalid password', async () => {
      if (!app) return;

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: tenantDto.email, password: 'WrongPassword' })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      if (!app) return;

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'Password123' })
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      if (!app || !refreshToken) return;

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      if (!app) return;

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return profile for authenticated user', async () => {
      if (!app || !accessToken) return;

      const res = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(tenantDto.email);
      expect(res.body).toHaveProperty('tenant');
      expect(res.body.tenant).toHaveProperty('plan');
    });

    it('should reject unauthenticated requests', async () => {
      if (!app) return;

      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      if (!app) return;

      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });
  });
});
