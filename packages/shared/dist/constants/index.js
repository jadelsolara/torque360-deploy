"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENCY = exports.IVA = exports.VEHICLE_STATUSES = exports.QUOTATION_STATUSES = exports.WORK_ORDER_STATUSES = exports.ROLE_HIERARCHY = exports.ROLES = void 0;
// --- Role hierarchy (higher index = more privileges) ---
exports.ROLES = ['VIEWER', 'OPERATOR', 'MANAGER', 'ADMIN', 'OWNER'];
exports.ROLE_HIERARCHY = {
    VIEWER: 0,
    OPERATOR: 1,
    MANAGER: 2,
    ADMIN: 3,
    OWNER: 4,
};
// --- Work Order Statuses ---
exports.WORK_ORDER_STATUSES = [
    'pending',
    'in_progress',
    'completed',
    'invoiced',
    'cancelled',
];
// --- Quotation Statuses ---
exports.QUOTATION_STATUSES = [
    'draft',
    'sent',
    'approved',
    'rejected',
    'converted',
];
// --- Vehicle Statuses ---
exports.VEHICLE_STATUSES = [
    'active',
    'in_service',
    'sold',
    'scrapped',
];
// --- Chilean Tax ---
exports.IVA = 0.19;
// --- Currency ---
exports.CURRENCY = 'CLP';
//# sourceMappingURL=index.js.map