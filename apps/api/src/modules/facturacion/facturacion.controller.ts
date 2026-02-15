import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FacturacionService } from './facturacion.service';
import {
  CreateInvoiceDto,
  CreateCreditNoteDto,
  UploadCafDto,
  InvoiceFiltersDto,
  MarkPaidDto,
} from './facturacion.dto';
import { Tenant, Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('facturacion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FacturacionController {
  constructor(private facturacionService: FacturacionService) {}

  // ── Create Invoice ──

  @Post()
  @Roles('OPERATOR')
  createInvoice(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.facturacionService.createInvoice(tenantId, dto, userId);
  }

  // ── Create from Work Order ──

  @Post('from-work-order/:workOrderId')
  @Roles('OPERATOR')
  createFromWorkOrder(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('workOrderId') workOrderId: string,
    @Query('dteType') dteType: string,
  ) {
    const type = dteType ? parseInt(dteType, 10) : 33;
    return this.facturacionService.createFromWorkOrder(
      tenantId,
      workOrderId,
      type,
      userId,
    );
  }

  // ── Create from Quotation ──

  @Post('from-quotation/:quotationId')
  @Roles('OPERATOR')
  createFromQuotation(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('quotationId') quotationId: string,
    @Query('dteType') dteType: string,
  ) {
    const type = dteType ? parseInt(dteType, 10) : 33;
    return this.facturacionService.createFromQuotation(
      tenantId,
      quotationId,
      type,
      userId,
    );
  }

  // ── Create Credit Note ──

  @Post('credit-note')
  @Roles('MANAGER')
  createCreditNote(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCreditNoteDto,
  ) {
    return this.facturacionService.createCreditNote(tenantId, dto, userId);
  }

  // ── List Invoices ──

  @Get()
  @Roles('OPERATOR')
  findAll(
    @Tenant() tenantId: string,
    @Query() filters: InvoiceFiltersDto,
  ) {
    return this.facturacionService.findAll(tenantId, filters);
  }

  // ── Monthly Totals ──

  @Get('monthly-totals')
  @Roles('MANAGER')
  getMonthlyTotals(
    @Tenant() tenantId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const m = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    return this.facturacionService.getMonthlyTotals(tenantId, y, m);
  }

  // ── CAF Status ──

  @Get('caf-status')
  @Roles('ADMIN')
  getCafStatus(@Tenant() tenantId: string) {
    return this.facturacionService.getCafStatus(tenantId);
  }

  // ── Single Invoice ──

  @Get(':id')
  @Roles('OPERATOR')
  findOne(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.facturacionService.findOne(tenantId, id);
  }

  // ── Mark as Paid ──

  @Patch(':id/pay')
  @Roles('OPERATOR')
  markPaid(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: MarkPaidDto,
  ) {
    return this.facturacionService.markPaid(tenantId, id, dto);
  }

  // ── Void Invoice ──

  @Patch(':id/void')
  @Roles('MANAGER')
  voidInvoice(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.facturacionService.voidInvoice(tenantId, id);
  }

  // ── Send to SII ──

  @Post(':id/send-sii')
  @Roles('MANAGER')
  sendToSii(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.facturacionService.sendToSii(tenantId, id);
  }

  // ── Check SII Status ──

  @Get(':id/sii-status')
  @Roles('OPERATOR')
  checkSiiStatus(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.facturacionService.checkSiiStatus(tenantId, id);
  }

  // ── Upload CAF ──

  @Post('caf')
  @Roles('ADMIN')
  uploadCaf(
    @Tenant() tenantId: string,
    @Body() dto: UploadCafDto,
  ) {
    return this.facturacionService.uploadCaf(tenantId, dto);
  }
}
