export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed' | 'invoiced' | 'cancelled';

export type WorkOrderType = 'repair' | 'maintenance' | 'inspection' | 'bodywork' | 'electrical';

export type WorkOrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface WorkOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  vehicleId: string;
  clientId: string;
  assignedTo: string;
  status: WorkOrderStatus;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  description: string;
  diagnosis: string;
  estimatedHours: number;
  actualHours: number;
  laborCost: number;
  partsCost: number;
  totalCost: number;
}

export interface WorkOrderPart {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isOem: boolean;
}
