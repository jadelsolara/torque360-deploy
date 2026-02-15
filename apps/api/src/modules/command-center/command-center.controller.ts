import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommandCenterService } from './command-center.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('command-center')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN')
export class CommandCenterController {
  constructor(private commandCenterService: CommandCenterService) {}

  // ─── Global KPIs ─────────────────────────────────────────────

  @Get('overview')
  getOverview() {
    return this.commandCenterService.getOverview();
  }

  // ─── All Tenants with Stats ──────────────────────────────────

  @Get('tenants')
  getTenants() {
    return this.commandCenterService.getTenants();
  }

  // ─── Aggregated Market Intelligence ──────────────────────────

  @Get('market-intelligence')
  getMarketIntelligence() {
    return this.commandCenterService.getMarketIntelligence();
  }

  // ─── Specific Tenant Deep Dive ───────────────────────────────

  @Get('tenant/:tenantId/detail')
  getTenantDetail(@Param('tenantId') tenantId: string) {
    return this.commandCenterService.getTenantDetail(tenantId);
  }

  // ─── Cross-Tenant Alerts ─────────────────────────────────────

  @Get('alerts')
  getAlerts() {
    return this.commandCenterService.getAlerts();
  }
}
