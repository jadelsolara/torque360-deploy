import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

/**
 * Traceability event types:
 * - received_from_supplier: Part received from a supplier delivery
 * - stored_in_warehouse: Part placed in warehouse location
 * - transferred: Part moved between locations/warehouses
 * - picked_for_order: Part picked for a work order or sale
 * - installed_in_vehicle: Part installed during service
 * - returned: Part returned by customer or to supplier
 * - scrapped: Part deemed unusable and discarded
 * - quality_check: Part inspected for quality standards
 * - customs_cleared: Imported part cleared through customs
 */

export class RecordEventDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsOptional()
  lotNumber?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsObject()
  eventData: Record<string, unknown>;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsNotEmpty()
  performedBy: string;
}
