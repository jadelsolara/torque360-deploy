import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
  IsObject,
  ValidateNested,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Permissions DTO (nested) ---

export class ExternalAccessPermissionsDto {
  @IsBoolean()
  canUpdateStatus: boolean;

  @IsBoolean()
  canUploadDocuments: boolean;

  @IsBoolean()
  canUpdateDates: boolean;

  @IsBoolean()
  canUpdateCosts: boolean;

  @IsArray()
  @IsString({ each: true })
  allowedStatusTransitions: string[];

  @IsArray()
  @IsString({ each: true })
  allowedFields: string[];
}

// --- Create External Access (internal use) ---

export class CreateExternalAccessDto {
  @IsString()
  @IsIn([
    'CUSTOMS_BROKER',
    'FREIGHT_FORWARDER',
    'SHIPPING_LINE',
    'INLAND_TRANSPORT',
    'PORT_AGENT',
    'INSPECTOR',
  ])
  agentType: string;

  @IsString()
  @Length(1, 255)
  agentName: string;

  @IsEmail()
  agentEmail: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  agentPhone?: string;

  @IsString()
  importOrderId: string;

  @ValidateNested()
  @Type(() => ExternalAccessPermissionsDto)
  permissions: ExternalAccessPermissionsDto;

  @IsNumber()
  @Min(1)
  @Max(365)
  expiresInDays: number;
}

// --- Update Import Fields (external agent) ---

export class UpdateImportFieldsDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  blNumber?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  containerNumber?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  vesselName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  shippingLine?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  trackingUrl?: string;

  @IsOptional()
  @IsString()
  etd?: string;

  @IsOptional()
  @IsString()
  eta?: string;

  @IsOptional()
  @IsString()
  actualShipDate?: string;

  @IsOptional()
  @IsString()
  actualArrival?: string;

  @IsOptional()
  @IsString()
  customsClearanceDate?: string;

  @IsOptional()
  @IsString()
  warehouseEntryDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freightCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gastosPuerto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  agenteAduana?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transporteInterno?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otrosGastos?: number;

  @IsOptional()
  @IsString()
  originPort?: string;

  @IsOptional()
  @IsString()
  destinationPort?: string;
}

// --- Update Import Status (external agent) ---

export class UpdateImportStatusDto {
  @IsString()
  @IsIn([
    'draft',
    'confirmed',
    'shipped',
    'in_transit',
    'at_port',
    'customs',
    'cleared',
    'received',
    'closed',
  ])
  newStatus: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  note?: string;
}

// --- Add Document (external agent) ---

export class AddDocumentDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @IsIn([
    'BL',
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'CUSTOMS_DECLARATION',
    'CERTIFICATE',
    'INSURANCE',
    'FREIGHT_INVOICE',
    'INSPECTION_REPORT',
    'OTHER',
  ])
  type: string;

  @IsString()
  @Length(1, 1000)
  url: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}

// --- Add Note (external agent) ---

export class AddNoteDto {
  @IsString()
  @Length(1, 2000)
  content: string;
}
