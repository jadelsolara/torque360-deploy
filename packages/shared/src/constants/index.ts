import type { Role } from '../types/auth';
import type { WorkOrderStatus } from '../types/work-order';
import type { QuotationStatus } from '../types/quotation';
import type { VehicleStatus } from '../types/vehicle';

// --- Role hierarchy (higher index = more privileges) ---
export const ROLES: Role[] = ['VIEWER', 'OPERATOR', 'MANAGER', 'ADMIN', 'OWNER'];

export const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 0,
  OPERATOR: 1,
  MANAGER: 2,
  ADMIN: 3,
  OWNER: 4,
};

// --- Work Order Statuses ---
export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  'pending',
  'in_progress',
  'completed',
  'invoiced',
  'cancelled',
];

// --- Quotation Statuses ---
export const QUOTATION_STATUSES: QuotationStatus[] = [
  'draft',
  'sent',
  'approved',
  'rejected',
  'converted',
];

// --- Vehicle Statuses ---
export const VEHICLE_STATUSES: VehicleStatus[] = [
  'active',
  'in_service',
  'sold',
  'scrapped',
];

// --- Chilean Tax ---
export const IVA = 0.19;

// --- Currency ---
export const CURRENCY = 'CLP';
