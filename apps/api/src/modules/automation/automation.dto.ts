import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

/**
 * Trigger types:
 * - entity_created: Fires when a new entity is created
 * - entity_updated: Fires when an entity is updated
 * - status_changed: Fires when an entity status changes
 * - threshold_reached: Fires when a numeric threshold is crossed
 * - schedule: Fires on a time-based schedule (future)
 *
 * Trigger entities:
 * - work_order, quotation, inventory_item, import_order, stock_movement, approval
 *
 * Action types:
 * - notify_user: Send notification to a specific user (actionConfig: { userId, title, message })
 * - notify_role: Send notification to all users with a role (actionConfig: { role, title, message })
 * - notify_owner: Send notification to all OWNER users (actionConfig: { title, message })
 * - request_approval: Create an approval request (actionConfig: { entityType, entityId, approvalType, requiredRole })
 * - update_status: Update entity status (future - logged only)
 *
 * Condition operators (used in triggerConditions values):
 * - { $gt: value }    - greater than
 * - { $lt: value }    - less than
 * - { $eq: value }    - equals
 * - { $gte: value }   - greater than or equal
 * - { $lte: value }   - less than or equal
 * - { $in: [values] } - value is in array
 * - { $contains: str} - string contains substring
 * - plain value       - exact match
 *
 * Example rules:
 * 1. "When inventory item stock drops below minimum -> notify MANAGER + notify OWNER"
 *    triggerType: 'threshold_reached', triggerEntity: 'inventory_item',
 *    triggerConditions: { currentStock: { $lt: 'minStock' } },
 *    actionType: 'notify_role', actionConfig: { role: 'MANAGER', title: 'Low Stock Alert' }
 *
 * 2. "When work order total > $500,000 CLP -> request ADMIN approval"
 *    triggerType: 'entity_created', triggerEntity: 'work_order',
 *    triggerConditions: { total: { $gt: 500000 } },
 *    actionType: 'request_approval', actionConfig: { approvalType: 'high_value', requiredRole: 'ADMIN' }
 *
 * 3. "When import order status changes to 'customs' -> notify OWNER"
 *    triggerType: 'status_changed', triggerEntity: 'import_order',
 *    triggerConditions: { status: { $eq: 'customs' } },
 *    actionType: 'notify_owner', actionConfig: { title: 'Import Order in Customs' }
 *
 * 4. "When new quotation created -> notify assigned MANAGER"
 *    triggerType: 'entity_created', triggerEntity: 'quotation',
 *    triggerConditions: {},
 *    actionType: 'notify_role', actionConfig: { role: 'MANAGER', title: 'New Quotation' }
 */

export class CreateRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  triggerType: string;

  @IsString()
  @IsNotEmpty()
  triggerEntity: string;

  @IsObject()
  triggerConditions: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  actionType: string;

  @IsObject()
  actionConfig: Record<string, unknown>;
}

export class UpdateRuleDto implements Partial<CreateRuleDto> {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  triggerType?: string;

  @IsString()
  @IsOptional()
  triggerEntity?: string;

  @IsObject()
  @IsOptional()
  triggerConditions?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  actionType?: string;

  @IsObject()
  @IsOptional()
  actionConfig?: Record<string, unknown>;
}
