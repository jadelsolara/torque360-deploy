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
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
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
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_SECRET || 'change-me-in-production',
      });

      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return this.generateTokens({
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
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
}
