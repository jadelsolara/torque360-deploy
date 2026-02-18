import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import {
  createMockRepository,
  createMockDataSource,
  createMockJwtService,
  createUser,
  createTenant,
} from '../../../test/helpers/test.utils';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof createMockRepository>;
  let tenantRepo: ReturnType<typeof createMockRepository>;
  let refreshTokenRepo: ReturnType<typeof createMockRepository>;
  let jwtService: ReturnType<typeof createMockJwtService>;
  let dataSource: ReturnType<typeof createMockDataSource>;

  beforeEach(async () => {
    userRepo = createMockRepository();
    tenantRepo = createMockRepository();
    refreshTokenRepo = createMockRepository();
    jwtService = createMockJwtService();
    dataSource = createMockDataSource();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════════════
  //  registerTenant
  // ═══════════════════════════════════════════════════════════════════════════

  describe('registerTenant', () => {
    const dto = {
      tenantName: 'Taller Test',
      tenantSlug: 'taller-test',
      email: 'owner@test.com',
      password: 'SecurePass123',
      firstName: 'Carlos',
      lastName: 'Rodriguez',
    };

    it('should create tenant + owner user and return tokens', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashed');
      refreshTokenRepo.create.mockReturnValue({});
      refreshTokenRepo.save.mockResolvedValue({});
      const tenantId = 'tenant-uuid';
      const userId = 'user-uuid';
      dataSource._mockManager.save
        .mockResolvedValueOnce({ id: tenantId, name: dto.tenantName, slug: dto.tenantSlug })
        .mockResolvedValueOnce({ id: userId, email: dto.email, role: 'OWNER', tenantId });

      const result = await service.registerTenant(dto);

      expect(tenantRepo.findOne).toHaveBeenCalledWith({ where: { slug: dto.tenantSlug } });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(dto.email);
      expect(result.tenant.slug).toBe(dto.tenantSlug);
      expect(refreshTokenRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if slug already exists', async () => {
      tenantRepo.findOne.mockResolvedValue(createTenant({ slug: dto.tenantSlug }));

      await expect(service.registerTenant(dto)).rejects.toThrow(ConflictException);
    });

    it('should hash password with cost factor 12', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashed');
      refreshTokenRepo.create.mockReturnValue({});
      refreshTokenRepo.save.mockResolvedValue({});
      dataSource._mockManager.save.mockResolvedValue({ id: 'x', email: dto.email, role: 'OWNER' });

      await service.registerTenant(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  registerUser
  // ═══════════════════════════════════════════════════════════════════════════

  describe('registerUser', () => {
    const tenantId = 'tenant-123';
    const dto = {
      email: 'new@test.com',
      password: 'Password123',
      firstName: 'Maria',
      lastName: 'Lopez',
    };

    it('should create a user with default OPERATOR role', async () => {
      userRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashed');
      userRepo.create.mockReturnValue({ ...dto, tenantId, role: 'OPERATOR' });
      userRepo.save.mockResolvedValue({ id: 'new-id', email: dto.email, role: 'OPERATOR' });

      const result = await service.registerUser(dto, tenantId);

      expect(result.email).toBe(dto.email);
      expect(result.role).toBe('OPERATOR');
    });

    it('should throw ConflictException if email already exists in tenant', async () => {
      userRepo.findOne.mockResolvedValue(createUser({ tenantId, email: dto.email }));

      await expect(service.registerUser(dto, tenantId)).rejects.toThrow(ConflictException);
    });

    it('should allow custom role assignment', async () => {
      userRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashed');
      const dtoWithRole = { ...dto, role: 'ADMIN' };
      userRepo.create.mockReturnValue({ ...dtoWithRole, tenantId });
      userRepo.save.mockResolvedValue({ id: 'new-id', email: dto.email, role: 'ADMIN' });

      const result = await service.registerUser(dtoWithRole, tenantId);

      expect(result.role).toBe('ADMIN');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  login
  // ═══════════════════════════════════════════════════════════════════════════

  describe('login', () => {
    const dto = { email: 'user@test.com', password: 'Password123' };

    it('should return tokens and user info on successful login', async () => {
      const tenant = createTenant();
      const user = createUser({
        email: dto.email,
        tenant,
        tenantId: tenant.id,
        isActive: true,
      });
      userRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      userRepo.save.mockResolvedValue(user);
      refreshTokenRepo.create.mockReturnValue({});
      refreshTokenRepo.save.mockResolvedValue({});

      const result = await service.login(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(dto.email);
      expect(result.tenant.id).toBe(tenant.id);
      expect(refreshTokenRepo.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const user = createUser({ email: dto.email, isActive: false, tenant: createTenant() });
      userRepo.findOne.mockResolvedValue(user);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for deactivated tenant', async () => {
      const tenant = createTenant({ isActive: false });
      const user = createUser({ email: dto.email, isActive: true, tenant });
      userRepo.findOne.mockResolvedValue(user);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const tenant = createTenant();
      const user = createUser({ email: dto.email, tenant, isActive: true });
      userRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should update lastLogin on successful login', async () => {
      const tenant = createTenant();
      const user = createUser({ email: dto.email, tenant, tenantId: tenant.id, isActive: true });
      userRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      userRepo.save.mockResolvedValue(user);
      refreshTokenRepo.create.mockReturnValue({});
      refreshTokenRepo.save.mockResolvedValue({});

      await service.login(dto);

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ lastLogin: expect.any(Date) }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  refreshToken
  // ═══════════════════════════════════════════════════════════════════════════

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token found in DB', async () => {
      process.env.JWT_SECRET = 'test-secret';
      const user = createUser({ isActive: true });
      jwtService.verify.mockReturnValue({
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      });
      refreshTokenRepo.findOne.mockResolvedValue({ id: 'rt-1', tokenHash: 'hash', revoked: false });
      refreshTokenRepo.save.mockResolvedValue({});
      refreshTokenRepo.create.mockReturnValue({});
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.refreshToken('valid.refresh.token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(refreshTokenRepo.findOne).toHaveBeenCalled();
    });

    it('should revoke old token and persist new one on rotation', async () => {
      process.env.JWT_SECRET = 'test-secret';
      const user = createUser({ isActive: true });
      jwtService.verify.mockReturnValue({
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      });
      const oldToken = { id: 'rt-1', tokenHash: 'hash', revoked: false };
      refreshTokenRepo.findOne.mockResolvedValue(oldToken);
      refreshTokenRepo.save.mockResolvedValue({});
      refreshTokenRepo.create.mockReturnValue({});
      userRepo.findOne.mockResolvedValue(user);

      await service.refreshToken('valid.refresh.token');

      // Old token should be revoked
      expect(oldToken.revoked).toBe(true);
      // save called twice: once for revoke, once for new token
      expect(refreshTokenRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException if token not found in DB', async () => {
      process.env.JWT_SECRET = 'test-secret';
      const user = createUser({ isActive: true });
      jwtService.verify.mockReturnValue({ sub: user.id });
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshToken('revoked.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      process.env.JWT_SECRET = 'test-secret';
      const user = createUser({ isActive: false });
      jwtService.verify.mockReturnValue({ sub: user.id });
      refreshTokenRepo.findOne.mockResolvedValue({ id: 'rt-1', revoked: false });
      refreshTokenRepo.save.mockResolvedValue({});
      userRepo.findOne.mockResolvedValue(user);

      await expect(service.refreshToken('valid.refresh.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if JWT_SECRET is not set', async () => {
      delete process.env.JWT_SECRET;

      await expect(service.refreshToken('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired/invalid token', async () => {
      process.env.JWT_SECRET = 'test-secret';
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refreshToken('expired.token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  revokeRefreshToken / revokeAllUserTokens
  // ═══════════════════════════════════════════════════════════════════════════

  describe('revokeRefreshToken', () => {
    it('should revoke a specific token by hash', async () => {
      refreshTokenRepo.update.mockResolvedValue({ affected: 1 });

      await service.revokeRefreshToken('some.jwt.token');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ tokenHash: expect.any(String) }),
        { revoked: true },
      );
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all non-revoked tokens for a user', async () => {
      refreshTokenRepo.update.mockResolvedValue({ affected: 3 });

      await service.revokeAllUserTokens('user-123');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-123', revoked: false },
        { revoked: true },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  getProfile
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getProfile', () => {
    it('should return user profile with tenant info', async () => {
      const tenant = createTenant();
      const user = createUser({ tenant, tenantId: tenant.id });
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.getProfile(user.id as string);

      expect(result.email).toBe(user.email);
      expect(result.tenant.slug).toBe(tenant.slug);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
