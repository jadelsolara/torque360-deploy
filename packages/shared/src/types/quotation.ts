export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted';

export interface QuotationItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  tenantId: string;
  quoteNumber: string;
  vehicleId: string;
  clientId: string;
  createdBy: string;
  status: QuotationStatus;
  items: QuotationItem[];
  subtotal: number;
  tax: number;
  total: number;
  validUntil: Date;
  notes: string;
}
