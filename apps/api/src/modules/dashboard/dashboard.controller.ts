import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { Tenant, CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @Roles('VIEWER')
  getStats(@Tenant() tenantId: string) {
    return this.dashboardService.getStats(tenantId);
  }

  @Get('recent')
  @Roles('VIEWER')
  getRecent(@Tenant() tenantId: string) {
    return this.dashboardService.getRecent(tenantId);
  }

  @Get('kpis')
  @Roles('MANAGER')
  getKpis(@Tenant() tenantId: string) {
    return this.dashboardService.getKpis(tenantId);
  }

  @Get('owner')
  @Roles('OWNER')
  getOwnerDashboard(@Tenant() tenantId: string) {
    return this.dashboardService.getOwnerDashboard(tenantId);
  }

  @Get('notifications')
  getNotifications(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('unread') unread?: string,
  ) {
    return this.dashboardService.getNotifications(
      tenantId,
      userId,
      unread === 'true',
    );
  }

  @Patch('notifications/:id/read')
  markRead(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') notifId: string,
  ) {
    return this.dashboardService.markNotificationRead(tenantId, userId, notifId);
  }

  @Patch('notifications/read-all')
  markAllRead(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.dashboardService.markAllRead(tenantId, userId);
  }
}
