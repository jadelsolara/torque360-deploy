import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AutomationService } from './automation.service';
import { CreateRuleDto, UpdateRuleDto } from './automation.dto';
import { Tenant, CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('automation')
export class AutomationController {
  constructor(private automationService: AutomationService) {}

  // ─── RULES CRUD (protected) ──────────────────────────────────────────

  /**
   * Create a new automation rule.
   * ADMIN+ required.
   */
  @Post('rules')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  createRule(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRuleDto,
  ) {
    return this.automationService.createRule(tenantId, userId, dto);
  }

  /**
   * List all automation rules for the tenant.
   * MANAGER+ required.
   */
  @Get('rules')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('MANAGER')
  findAll(
    @Tenant() tenantId: string,
    @Query('triggerEntity') triggerEntity?: string,
    @Query('isActive') isActive?: string,
  ) {
    const filters: { triggerEntity?: string; isActive?: boolean } = {};
    if (triggerEntity) filters.triggerEntity = triggerEntity;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    return this.automationService.findAll(tenantId, filters);
  }

  /**
   * Get a single automation rule.
   * MANAGER+ required.
   */
  @Get('rules/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('MANAGER')
  findOne(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.automationService.findOne(tenantId, id);
  }

  /**
   * Update an automation rule.
   * ADMIN+ required.
   */
  @Patch('rules/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.automationService.update(tenantId, id, dto);
  }

  /**
   * Toggle active/inactive state of a rule.
   * ADMIN+ required.
   */
  @Patch('rules/:id/toggle')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  toggleActive(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.automationService.toggleActive(tenantId, id);
  }

  /**
   * Delete an automation rule.
   * OWNER+ required.
   */
  @Delete('rules/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('OWNER')
  deleteRule(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.automationService.deleteRule(tenantId, id);
  }

  // ─── EVALUATION (internal, no auth) ──────────────────────────────────

  /**
   * Evaluate automation rules against an event.
   * Internal endpoint — called by other services, no auth guard.
   */
  @Post('evaluate')
  evaluate(
    @Body() body: {
      tenantId: string;
      triggerType: string;
      triggerEntity: string;
      eventData: Record<string, unknown>;
    },
  ) {
    return this.automationService.evaluateRules(
      body.tenantId,
      body.triggerType,
      body.triggerEntity,
      body.eventData,
    );
  }

  // ─── EXECUTION LOG (protected) ───────────────────────────────────────

  /**
   * Get execution log of automation rules.
   * ADMIN+ required.
   */
  @Get('log')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  getExecutionLog(
    @Tenant() tenantId: string,
    @Query('ruleId') ruleId?: string,
  ) {
    return this.automationService.getExecutionLog(tenantId, ruleId);
  }
}
