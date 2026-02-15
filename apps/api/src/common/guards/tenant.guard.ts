import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // SUPER_ADMIN bypasses tenant RLS
    // Can optionally target a specific tenant via X-Tenant-Id header
    if (user.role === 'SUPER_ADMIN') {
      const targetTenant = request.headers['x-tenant-id'];
      if (targetTenant) {
        await this.dataSource.query(
          `SELECT set_config('app.current_tenant_id', $1, true)`,
          [targetTenant],
        );
        request.user.tenantId = targetTenant;
      }
      // If no X-Tenant-Id, SUPER_ADMIN queries without RLS restriction
      return true;
    }

    const tenantId = user.tenantId;
    if (!tenantId) return false;

    // Set RLS context for this request
    await this.dataSource.query(
      `SELECT set_config('app.current_tenant_id', $1, true)`,
      [tenantId],
    );

    return true;
  }
}
