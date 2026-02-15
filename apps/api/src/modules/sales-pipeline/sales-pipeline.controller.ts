import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SalesPipelineService } from './sales-pipeline.service';
import {
  ConvertQuotationDto,
  DispatchPartsDto,
  InvoiceWorkOrderDto,
} from './sales-pipeline.dto';
import { Tenant, Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@Controller('sales-pipeline')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class SalesPipelineController {
  constructor(private salesPipelineService: SalesPipelineService) {}

  // ── STEP 1: Validate Quotation ──

  @Get('validate/:quotationId')
  @Roles('OPERATOR')
  validateQuotation(
    @Tenant() tenantId: string,
    @Param('quotationId', ParseUUIDPipe) quotationId: string,
  ) {
    return this.salesPipelineService.validateQuotationForConversion(
      tenantId,
      quotationId,
    );
  }

  // ── STEP 2: Convert Quotation to Work Order ──

  @Post('convert-quotation/:quotationId')
  @Roles('MANAGER')
  convertQuotation(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('quotationId', ParseUUIDPipe) quotationId: string,
    @Body() dto: ConvertQuotationDto,
  ) {
    return this.salesPipelineService.convertQuotationToWorkOrder(
      tenantId,
      quotationId,
      userId,
      dto,
    );
  }

  // ── STEP 3: Dispatch Parts from Warehouse ──

  @Post('dispatch-parts/:workOrderId')
  @Roles('OPERATOR')
  dispatchParts(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('workOrderId', ParseUUIDPipe) workOrderId: string,
    @Body() dto: DispatchPartsDto,
  ) {
    return this.salesPipelineService.dispatchPartsForWorkOrder(
      tenantId,
      workOrderId,
      dto,
      userId,
    );
  }

  // ── STEP 4: Invoice Work Order ──

  @Post('invoice/:workOrderId')
  @Roles('MANAGER')
  invoiceWorkOrder(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('workOrderId', ParseUUIDPipe) workOrderId: string,
    @Body() dto: InvoiceWorkOrderDto,
  ) {
    return this.salesPipelineService.invoiceWorkOrder(
      tenantId,
      workOrderId,
      dto,
      userId,
    );
  }

  // ── Readiness Check ──

  @Get('readiness/:workOrderId')
  @Roles('OPERATOR')
  getReadiness(
    @Tenant() tenantId: string,
    @Param('workOrderId', ParseUUIDPipe) workOrderId: string,
  ) {
    return this.salesPipelineService.getWorkOrderReadiness(
      tenantId,
      workOrderId,
    );
  }

  // ── Full Pipeline Status ──

  @Get('status/:quotationId')
  @Roles('OPERATOR')
  getPipelineStatus(
    @Tenant() tenantId: string,
    @Param('quotationId', ParseUUIDPipe) quotationId: string,
  ) {
    return this.salesPipelineService.getPipelineStatus(
      tenantId,
      quotationId,
    );
  }
}
