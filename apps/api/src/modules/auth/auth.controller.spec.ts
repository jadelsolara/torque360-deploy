import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

function mockResponse() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as any;
}

function mockRequest(overrides: Record<string, unknown> = {}) {
  return {
    cookies: {},
    body: {},
    ...overrides,
  } as any;
}

describe('AuthController', () => {
  let controller: AuthController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      registerTenant: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
      registerUser: jest.fn(),
      getProfile: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  //  registerTenant
  // ═══════════════════════════════════════════════════════════════════

  describe('registerTenant', () => {
    it('should register tenant, set cookie, and return body without refreshToken', async () => {
      const dto = {
        tenantName: 'Taller',
        tenantSlug: 'taller',
        email: 'owner@test.cl',
        password: 'Secure123',
        firstName: 'Carlos',
        lastName: 'R',
      };
      service.registerTenant!.mockResolvedValue({
        accessToken: 'access-jwt',
        refreshToken: 'refresh-jwt',
        user: { email: dto.email } as any,
        tenant: { slug: dto.tenantSlug } as any,
      });
      const res = mockResponse();

      const result = await controller.registerTenant(dto as any, res);

      expect(service.registerTenant).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalledWith(
        'torque_refresh_token',
        'refresh-jwt',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result.accessToken).toBe('access-jwt');
      expect((result as any).refreshToken).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  login
  // ═══════════════════════════════════════════════════════════════════

  describe('login', () => {
    it('should login, set cookie, and return body without refreshToken', async () => {
      const dto = { email: 'user@test.cl', password: 'Pass123' };
      service.login!.mockResolvedValue({
        accessToken: 'access-jwt',
        refreshToken: 'refresh-jwt',
        user: { email: dto.email } as any,
        tenant: { id: 't1' } as any,
      });
      const res = mockResponse();

      const result = await controller.login(dto as any, res);

      expect(service.login).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalled();
      expect(result.accessToken).toBe('access-jwt');
      expect((result as any).refreshToken).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  refresh
  // ═══════════════════════════════════════════════════════════════════

  describe('refresh', () => {
    it('should refresh using cookie token', async () => {
      const req = mockRequest({ cookies: { torque_refresh_token: 'old-refresh' } });
      const res = mockResponse();
      service.refreshToken!.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const result = await controller.refresh(req, res);

      expect(service.refreshToken).toHaveBeenCalledWith('old-refresh');
      expect(res.cookie).toHaveBeenCalledWith(
        'torque_refresh_token',
        'new-refresh',
        expect.any(Object),
      );
      expect(result.accessToken).toBe('new-access');
    });

    it('should refresh using body token as fallback', async () => {
      const req = mockRequest({ cookies: {}, body: { refreshToken: 'body-token' } });
      const res = mockResponse();
      service.refreshToken!.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const result = await controller.refresh(req, res);

      expect(service.refreshToken).toHaveBeenCalledWith('body-token');
      expect(result.accessToken).toBe('new-access');
    });

    it('should throw UnauthorizedException if no refresh token', async () => {
      const req = mockRequest({ cookies: {} });
      const res = mockResponse();

      await expect(controller.refresh(req, res)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  logout
  // ═══════════════════════════════════════════════════════════════════

  describe('logout', () => {
    it('should revoke token and clear cookie', async () => {
      const req = mockRequest({ cookies: { torque_refresh_token: 'token-to-revoke' } });
      const res = mockResponse();
      service.revokeRefreshToken!.mockResolvedValue(undefined);

      const result = await controller.logout(req, res);

      expect(service.revokeRefreshToken).toHaveBeenCalledWith('token-to-revoke');
      expect(res.clearCookie).toHaveBeenCalledWith(
        'torque_refresh_token',
        expect.objectContaining({ httpOnly: true, path: '/api/auth' }),
      );
      expect(result.message).toBe('Logged out');
    });

    it('should succeed even without cookie (graceful logout)', async () => {
      const req = mockRequest({ cookies: {} });
      const res = mockResponse();

      const result = await controller.logout(req, res);

      expect(service.revokeRefreshToken).not.toHaveBeenCalled();
      expect(result.message).toBe('Logged out');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  registerUser
  // ═══════════════════════════════════════════════════════════════════

  describe('registerUser', () => {
    it('should delegate to service.registerUser', async () => {
      const dto = { email: 'new@test.cl', password: 'Pass123', firstName: 'A', lastName: 'B' };
      const tenantId = 'tenant-123';
      service.registerUser!.mockResolvedValue({ id: 'u1', email: dto.email } as any);

      const result = await controller.registerUser(dto as any, tenantId);

      expect(service.registerUser).toHaveBeenCalledWith(dto, tenantId);
      expect(result.email).toBe(dto.email);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  getProfile
  // ═══════════════════════════════════════════════════════════════════

  describe('getProfile', () => {
    it('should delegate to service.getProfile', async () => {
      const profile = { id: 'u1', email: 'user@test.cl', tenant: { slug: 'taller' } };
      service.getProfile!.mockResolvedValue(profile as any);

      const result = await controller.getProfile('u1');

      expect(service.getProfile).toHaveBeenCalledWith('u1');
      expect(result.email).toBe('user@test.cl');
    });
  });
});
