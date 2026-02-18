import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { LoginDto, RegisterDto, RegisterTenantDto } from './auth.dto';

interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(RefreshToken) private refreshTokenRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
    private dataSource: DataSource,
  ) {}

  async registerTenant(dto: RegisterTenantDto) {
    const existingTenant = await this.tenantRepo.findOne({
      where: { slug: dto.tenantSlug },
    });
    if (existingTenant) {
      throw new ConflictException('Tenant slug already exists');
    }

    return this.dataSource.transaction(async (manager) => {
      const tenant = manager.create(Tenant, {
        name: dto.tenantName,
        slug: dto.tenantSlug,
        plan: dto.plan || 'starter',
      });
      await manager.save(tenant);

      const passwordHash = await bcrypt.hash(dto.password, 12);
      const user = manager.create(User, {
        tenantId: tenant.id,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'OWNER',
      });
      await manager.save(user);

      const tokens = this.generateTokens({
        sub: user.id,
        email: user.email,
        tenantId: tenant.id,
        role: user.role,
      });

      await this.persistRefreshToken(user.id, tokens.refreshToken);

      return {
        user: { id: user.id, email: user.email, role: user.role },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        ...tokens,
      };
    });
  }

  async registerUser(dto: RegisterDto, tenantId: string) {
    const existing = await this.userRepo.findOne({
      where: { tenantId, email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered in this tenant');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      tenantId,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role || 'OPERATOR',
    });
    await this.userRepo.save(user);

    return { id: user.id, email: user.email, role: user.role };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['tenant'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.tenant?.isActive) {
      throw new UnauthorizedException('Tenant is deactivated');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLogin = new Date();
    await this.userRepo.save(user);

    const tokens = this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new UnauthorizedException('JWT configuration error');
      }
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret,
      });

      // Validate token exists in DB and is not revoked
      const tokenHash = this.hashToken(refreshToken);
      const storedToken = await this.refreshTokenRepo.findOne({
        where: { tokenHash, revoked: false },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Refresh token revoked or not found');
      }

      // Revoke old token (rotation)
      storedToken.revoked = true;
      await this.refreshTokenRepo.save(storedToken);

      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const tokens = this.generateTokens({
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      });

      await this.persistRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.refreshTokenRepo.update({ tokenHash }, { revoked: true });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, revoked: false },
      { revoked: true },
    );
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        plan: user.tenant.plan,
      },
    };
  }

  private generateTokens(payload: JwtPayload) {
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async persistRefreshToken(
    userId: string,
    rawToken: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const entry = this.refreshTokenRepo.create({
      userId,
      tokenHash,
      expiresAt,
    });
    await this.refreshTokenRepo.save(entry);
  }
}
