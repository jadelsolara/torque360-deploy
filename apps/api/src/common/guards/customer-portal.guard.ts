import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomerPortalGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de portal requerido');
    }

    try {
      const secret = this.configService.get(
        'CUSTOMER_PORTAL_JWT_SECRET',
        'customer-portal-secret-change-me',
      );

      const payload = await this.jwtService.verifyAsync(token, { secret });

      // Validate this is a portal token (not a staff token)
      if (payload.type !== 'customer_portal') {
        throw new UnauthorizedException('Token invalido para portal de clientes');
      }

      // Attach portal client info to request
      request.portalClient = {
        tenantId: payload.tenantId,
        clientId: payload.clientId,
        email: payload.email,
      };

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Token de portal invalido o expirado');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (authHeader) {
      const [scheme, token] = authHeader.split(' ');
      if (scheme === 'Bearer' && token) {
        return token;
      }
    }
    return null;
  }
}
