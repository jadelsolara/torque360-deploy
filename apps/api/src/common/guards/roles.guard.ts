import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from '../decorators/roles.decorator';

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 100,
  OWNER: 50,
  ADMIN: 40,
  MANAGER: 30,
  OPERATOR: 20,
  VIEWER: 10,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // SUPER_ADMIN always passes
    if (user.role === 'SUPER_ADMIN') return true;

    const userLevel = ROLE_HIERARCHY[user.role as Role] || 0;
    return requiredRoles.some(
      (role) => userLevel >= ROLE_HIERARCHY[role],
    );
  }
}
