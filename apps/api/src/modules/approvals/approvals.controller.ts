import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApprovalsService } from './approvals.service';
import { Tenant, CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('approvals')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ApprovalsController {
  constructor(private approvalsService: ApprovalsService) {}

  @Post()
  @Roles('OPERATOR')
  request(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: {
      entityType: string;
      entityId: string;
      approvalType: string;
      requiredRole: string;
      description?: string;
      context?: Record<string, unknown>;
      assignedTo?: string;
    },
  ) {
    return this.approvalsService.requestApproval(tenantId, userId, dto);
  }

  @Get('pending')
  @Roles('MANAGER')
  getPending(
    @Tenant() tenantId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.approvalsService.getPending(tenantId, role);
  }

  @Get()
  @Roles('MANAGER')
  getAll(
    @Tenant() tenantId: string,
    @Query('status') status?: string,
  ) {
    return this.approvalsService.getAll(tenantId, status);
  }

  @Patch(':id/approve')
  @Roles('MANAGER')
  approve(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Body('reason') reason?: string,
  ) {
    return this.approvalsService.approve(tenantId, id, userId, role, reason);
  }

  @Patch(':id/reject')
  @Roles('MANAGER')
  reject(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Body('reason') reason: string,
  ) {
    return this.approvalsService.reject(tenantId, id, userId, role, reason);
  }
}
