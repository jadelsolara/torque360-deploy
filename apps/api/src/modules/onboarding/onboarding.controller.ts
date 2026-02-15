import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OnboardingService } from './onboarding.service';
import { Tenant, Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@Controller('onboarding')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Roles('VIEWER')
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  // ── GET /onboarding/modules — List all training modules (static config) ──
  @Get('modules')
  getModules() {
    return this.onboardingService.getModules();
  }

  // ── GET /onboarding/progress — Full progress for current user ──
  @Get('progress')
  getUserProgress(
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.onboardingService.getUserProgress(tenantId, userId);
  }

  // ── GET /onboarding/progress/:moduleId — Single module progress ──
  @Get('progress/:moduleId')
  getModuleProgress(
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.onboardingService.getModuleProgress(tenantId, userId, moduleId);
  }

  // ── POST /onboarding/activate — Activate onboarding for current user ──
  @Post('activate')
  activateOnboarding(
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.onboardingService.activateOnboarding(tenantId, userId, userRole);
  }

  // ── POST /onboarding/deactivate — Deactivate onboarding ──
  @Post('deactivate')
  deactivateOnboarding(
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.onboardingService.deactivateOnboarding(tenantId, userId);
  }

  // ── PATCH /onboarding/:moduleId/:stepId/complete — Mark step completed ──
  @Patch(':moduleId/:stepId/complete')
  completeStep(
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('moduleId') moduleId: string,
    @Param('stepId') stepId: string,
  ) {
    return this.onboardingService.completeStep(tenantId, userId, moduleId, stepId);
  }

  // ── PATCH /onboarding/:moduleId/:stepId/skip — Skip a step ──
  @Patch(':moduleId/:stepId/skip')
  skipStep(
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('moduleId') moduleId: string,
    @Param('stepId') stepId: string,
  ) {
    return this.onboardingService.skipStep(tenantId, userId, moduleId, stepId);
  }

  // ── POST /onboarding/:moduleId/reset — Reset module progress ──
  @Post(':moduleId/reset')
  resetModule(
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.onboardingService.resetModule(tenantId, userId, moduleId);
  }
}
