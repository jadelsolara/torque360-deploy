import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ExternalAccess } from '../../database/entities/external-access.entity';

@Injectable()
export class ExternalTokenGuard implements CanActivate {
  constructor(
    @InjectRepository(ExternalAccess)
    private accessRepo: Repository<ExternalAccess>,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawToken = this.extractToken(request);

    if (!rawToken) {
      throw new UnauthorizedException('Token de acceso externo requerido');
    }

    // Strip 'ext_' prefix if present
    const token = rawToken.startsWith('ext_') ? rawToken.slice(4) : rawToken;

    // Find all active, non-expired access records
    const activeRecords = await this.accessRepo.find({
      where: { isActive: true },
    });

    let matchedAccess: ExternalAccess | null = null;

    for (const record of activeRecords) {
      const isMatch = await bcrypt.compare(token, record.tokenHash);
      if (isMatch) {
        matchedAccess = record;
        break;
      }
    }

    if (!matchedAccess) {
      throw new UnauthorizedException('Token de acceso invalido');
    }

    // Check expiration
    if (new Date() > new Date(matchedAccess.expiresAt)) {
      throw new ForbiddenException('Token de acceso expirado');
    }

    // Check active status
    if (!matchedAccess.isActive) {
      throw new ForbiddenException('Acceso revocado');
    }

    // Attach external agent info to request
    request.externalAgent = {
      id: matchedAccess.id,
      tenantId: matchedAccess.tenantId,
      agentType: matchedAccess.agentType,
      agentName: matchedAccess.agentName,
      agentEmail: matchedAccess.agentEmail,
      importOrderId: matchedAccess.importOrderId,
      permissions: matchedAccess.permissions,
    };

    // Update lastAccessAt and increment accessCount
    await this.accessRepo.update(matchedAccess.id, {
      lastAccessAt: new Date(),
      accessCount: () => 'access_count + 1',
    } as any);

    // Set tenant RLS context
    await this.dataSource.query(
      `SET LOCAL app.current_tenant_id = '${matchedAccess.tenantId}'`,
    );

    // Track IP address
    request.clientIp =
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.ip;

    return true;
  }

  private extractToken(request: any): string | null {
    // Try Authorization header first: "Bearer ext_<token>"
    const authHeader = request.headers?.authorization;
    if (authHeader) {
      const [scheme, token] = authHeader.split(' ');
      if (scheme === 'Bearer' && token) {
        return token;
      }
    }

    // Try query parameter: ?token=ext_<token>
    if (request.query?.token) {
      return request.query.token;
    }

    return null;
  }
}
