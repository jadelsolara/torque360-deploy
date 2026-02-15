import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationRule } from '../../database/entities/automation-rule.entity';
import { Notification } from '../../database/entities/notification.entity';
import { Approval } from '../../database/entities/approval.entity';
import { User } from '../../database/entities/user.entity';
import { CreateRuleDto, UpdateRuleDto } from './automation.dto';

const ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 50, ADMIN: 40, MANAGER: 30, OPERATOR: 20, VIEWER: 10,
};

/**
 * Automation rules engine.
 *
 * Rules are stored in DB and evaluated when relevant events occur.
 * When conditions match, the configured action is executed automatically
 * (notifications, approval requests, etc.).
 *
 * Example rules:
 * 1. "When inventory item stock drops below minimum -> notify MANAGER + notify OWNER"
 * 2. "When work order total > $500,000 CLP -> request ADMIN approval"
 * 3. "When import order status changes to 'customs' -> notify OWNER"
 * 4. "When new quotation created -> notify assigned MANAGER"
 */
@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectRepository(AutomationRule) private ruleRepo: Repository<AutomationRule>,
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    @InjectRepository(Approval) private approvalRepo: Repository<Approval>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  // ─── CRUD ────────────────────────────────────────────────────────────

  async createRule(tenantId: string, createdBy: string, dto: CreateRuleDto): Promise<AutomationRule> {
    const rule = this.ruleRepo.create({
      tenantId,
      createdBy,
      name: dto.name,
      description: dto.description,
      triggerType: dto.triggerType,
      triggerEntity: dto.triggerEntity,
      triggerConditions: dto.triggerConditions,
      actionType: dto.actionType,
      actionConfig: dto.actionConfig,
      isActive: true,
      executionCount: 0,
    });
    return this.ruleRepo.save(rule) as Promise<AutomationRule>;
  }

  async findAll(
    tenantId: string,
    filters?: { triggerEntity?: string; isActive?: boolean },
  ): Promise<AutomationRule[]> {
    const where: Record<string, unknown> = { tenantId };
    if (filters?.triggerEntity) where.triggerEntity = filters.triggerEntity;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    return this.ruleRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(tenantId: string, id: string): Promise<AutomationRule> {
    const rule = await this.ruleRepo.findOne({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    return rule;
  }

  async update(tenantId: string, id: string, dto: UpdateRuleDto): Promise<AutomationRule> {
    const rule = await this.findOne(tenantId, id);
    Object.assign(rule, dto);
    return this.ruleRepo.save(rule) as Promise<AutomationRule>;
  }

  async toggleActive(tenantId: string, id: string): Promise<AutomationRule> {
    const rule = await this.findOne(tenantId, id);
    rule.isActive = !rule.isActive;
    return this.ruleRepo.save(rule) as Promise<AutomationRule>;
  }

  async deleteRule(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    const rule = await this.findOne(tenantId, id);
    await this.ruleRepo.remove(rule);
    return { deleted: true };
  }

  // ─── EVALUATION ENGINE ───────────────────────────────────────────────

  /**
   * Core method: evaluate all active rules matching the trigger.
   * Called by other services when events occur.
   */
  async evaluateRules(
    tenantId: string,
    triggerType: string,
    triggerEntity: string,
    eventData: Record<string, unknown>,
  ): Promise<{ evaluated: number; matched: number; executed: string[] }> {
    const rules = await this.ruleRepo.find({
      where: { tenantId, triggerType, triggerEntity, isActive: true },
    });

    let matched = 0;
    const executed: string[] = [];

    for (const rule of rules) {
      if (this.matchesConditions(rule.triggerConditions, eventData)) {
        matched++;
        try {
          await this.executeAction(tenantId, rule, eventData);
          executed.push(rule.id);
        } catch (error) {
          this.logger.error(
            `Failed to execute automation rule ${rule.id} (${rule.name}): ${error.message}`,
          );
        }
      }
    }

    return { evaluated: rules.length, matched, executed };
  }

  /**
   * Check if eventData satisfies all trigger conditions.
   *
   * Supported operators:
   * - plain value: exact match
   * - { $gt: value }:    greater than
   * - { $lt: value }:    less than
   * - { $eq: value }:    equals
   * - { $gte: value }:   greater than or equal
   * - { $lte: value }:   less than or equal
   * - { $in: [values] }: value is in array
   * - { $contains: str}: string contains substring
   */
  private matchesConditions(
    conditions: Record<string, unknown>,
    eventData: Record<string, unknown>,
  ): boolean {
    for (const [key, condition] of Object.entries(conditions)) {
      const actual = eventData[key];

      // If condition is an operator object
      if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
        const ops = condition as Record<string, unknown>;

        if ('$gt' in ops && !(Number(actual) > Number(ops.$gt))) return false;
        if ('$lt' in ops && !(Number(actual) < Number(ops.$lt))) return false;
        if ('$eq' in ops && actual !== ops.$eq) return false;
        if ('$gte' in ops && !(Number(actual) >= Number(ops.$gte))) return false;
        if ('$lte' in ops && !(Number(actual) <= Number(ops.$lte))) return false;
        if ('$in' in ops) {
          const arr = ops.$in;
          if (Array.isArray(arr) && !arr.includes(actual)) return false;
        }
        if ('$contains' in ops) {
          if (typeof actual !== 'string' || !actual.includes(String(ops.$contains))) return false;
        }
      } else {
        // Plain value: exact match
        if (actual !== condition) return false;
      }
    }

    return true;
  }

  /**
   * Execute the action configured in a matched rule.
   */
  private async executeAction(
    tenantId: string,
    rule: AutomationRule,
    eventData: Record<string, unknown>,
  ): Promise<void> {
    const config = rule.actionConfig;

    switch (rule.actionType) {
      case 'notify_user': {
        const userId = config.userId as string;
        if (!userId) break;
        await this.notifRepo.save(
          this.notifRepo.create({
            tenantId,
            userId,
            type: 'automation',
            channel: 'in_app',
            title: (config.title as string) || `Automation: ${rule.name}`,
            message: (config.message as string) || `Rule "${rule.name}" triggered`,
            entityType: rule.triggerEntity,
            entityId: (eventData.id as string) || undefined,
            metadata: { automationRuleId: rule.id, eventData },
          }),
        );
        break;
      }

      case 'notify_role': {
        const role = config.role as string;
        if (!role) break;
        const minLevel = ROLE_HIERARCHY[role] || 0;
        const users = await this.userRepo.find({
          where: { tenantId, isActive: true },
        });
        const targets = users.filter((u) => (ROLE_HIERARCHY[u.role] || 0) >= minLevel);

        const notifications = targets.map((u) =>
          this.notifRepo.create({
            tenantId,
            userId: u.id,
            type: 'automation',
            channel: 'in_app',
            title: (config.title as string) || `Automation: ${rule.name}`,
            message: (config.message as string) || `Rule "${rule.name}" triggered`,
            entityType: rule.triggerEntity,
            entityId: (eventData.id as string) || undefined,
            metadata: { automationRuleId: rule.id, eventData },
          }),
        );
        if (notifications.length > 0) {
          await this.notifRepo.save(notifications);
        }
        break;
      }

      case 'notify_owner': {
        const owners = await this.userRepo.find({
          where: { tenantId, role: 'OWNER', isActive: true },
        });
        const notifications = owners.map((u) =>
          this.notifRepo.create({
            tenantId,
            userId: u.id,
            type: 'automation',
            channel: 'in_app',
            title: (config.title as string) || `Automation: ${rule.name}`,
            message: (config.message as string) || `Rule "${rule.name}" triggered`,
            entityType: rule.triggerEntity,
            entityId: (eventData.id as string) || undefined,
            metadata: { automationRuleId: rule.id, eventData },
          }),
        );
        if (notifications.length > 0) {
          await this.notifRepo.save(notifications);
        }
        break;
      }

      case 'request_approval': {
        const approval = this.approvalRepo.create({
          tenantId,
          entityType: (config.entityType as string) || rule.triggerEntity,
          entityId: (config.entityId as string) || (eventData.id as string) || '',
          approvalType: (config.approvalType as string) || 'automated',
          requiredRole: (config.requiredRole as string) || 'ADMIN',
          requestedBy: (eventData.userId as string) || rule.createdBy,
          description: `Auto-generated by rule: ${rule.name}`,
          context: { automationRuleId: rule.id, eventData },
          status: 'pending',
        });
        await this.approvalRepo.save(approval);
        break;
      }

      case 'update_status': {
        // Future implementation - log for now
        this.logger.log(
          `[update_status] Rule "${rule.name}" would update status. ` +
          `Entity: ${rule.triggerEntity}, Config: ${JSON.stringify(config)}`,
        );
        break;
      }

      default:
        this.logger.warn(`Unknown action type: ${rule.actionType} in rule ${rule.id}`);
    }

    // Increment execution count and update last executed timestamp
    rule.executionCount = (rule.executionCount || 0) + 1;
    rule.lastExecutedAt = new Date();
    await (this.ruleRepo.save(rule) as Promise<AutomationRule>);
  }

  // ─── EXECUTION LOG ───────────────────────────────────────────────────

  /**
   * Get recent rule executions by querying notifications and approvals
   * created by automation rules.
   */
  async getExecutionLog(
    tenantId: string,
    ruleId?: string,
  ): Promise<Notification[]> {
    const qb = this.notifRepo
      .createQueryBuilder('n')
      .where('n.tenant_id = :tenantId', { tenantId })
      .andWhere('n.type = :type', { type: 'automation' })
      .orderBy('n.created_at', 'DESC')
      .take(100);

    if (ruleId) {
      qb.andWhere("n.metadata->>'automationRuleId' = :ruleId", { ruleId });
    }

    return qb.getMany();
  }
}
