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
import { SupplierAccountsService } from './supplier-accounts.service';
import { Tenant, Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';
import {
  CreateSupplierInvoiceDto,
  UpdateSupplierInvoiceDto,
  CreateSupplierPaymentDto,
} from './supplier-accounts.dto';

@Controller('suppliers')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class SupplierAccountsController {
  constructor(private accountsService: SupplierAccountsService) {}

  // ═══════════════════════════════════════════════════════════════════════
  // INVOICES
  // ═══════════════════════════════════════════════════════════════════════

  @Post('invoices')
  @Roles('OPERATOR')
  createInvoice(
    @Tenant() tenantId: string,
    @Body() dto: CreateSupplierInvoiceDto,
  ) {
    return this.accountsService.createInvoice(tenantId, dto);
  }

  @Get('invoices')
  @Roles('OPERATOR')
  findAllInvoices(
    @Tenant() tenantId: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('invoiceType') invoiceType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('dueFrom') dueFrom?: string,
    @Query('dueTo') dueTo?: string,
    @Query('overdue') overdue?: string,
    @Query('search') search?: string,
  ) {
    return this.accountsService.findAllInvoices(tenantId, {
      supplierId,
      status,
      invoiceType,
      dateFrom,
      dateTo,
      dueFrom,
      dueTo,
      overdue: overdue === 'true',
      search,
    });
  }

  @Get('invoices/:id')
  @Roles('OPERATOR')
  findOneInvoice(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.accountsService.findOneInvoice(tenantId, id);
  }

  @Patch('invoices/:id')
  @Roles('OPERATOR')
  updateInvoice(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierInvoiceDto,
  ) {
    return this.accountsService.updateInvoice(tenantId, id, dto);
  }

  @Patch('invoices/:id/approve')
  @Roles('MANAGER')
  approveInvoice(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountsService.approveInvoice(tenantId, id, userId);
  }

  @Patch('invoices/:id/void')
  @Roles('ADMIN')
  voidInvoice(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.accountsService.voidInvoice(tenantId, id);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════

  @Post('payments')
  @Roles('MANAGER')
  createPayment(
    @Tenant() tenantId: string,
    @Body() dto: CreateSupplierPaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountsService.createPayment(tenantId, dto, userId);
  }

  @Get('payments')
  @Roles('OPERATOR')
  findAllPayments(
    @Tenant() tenantId: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.accountsService.findAllPayments(tenantId, {
      supplierId,
      status,
      paymentMethod,
      dateFrom,
      dateTo,
      search,
    });
  }

  @Get('payments/:id')
  @Roles('OPERATOR')
  findOnePayment(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.accountsService.findOnePayment(tenantId, id);
  }

  @Patch('payments/:id/confirm')
  @Roles('MANAGER')
  confirmPayment(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountsService.confirmPayment(tenantId, id, userId);
  }

  @Patch('payments/:id/void')
  @Roles('ADMIN')
  voidPayment(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.accountsService.voidPayment(tenantId, id);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════════════════════════════════════

  @Get('accounts-payable')
  @Roles('MANAGER')
  getAccountsPayableSummary(@Tenant() tenantId: string) {
    return this.accountsService.getAccountsPayableSummary(tenantId);
  }

  @Get(':supplierId/balance')
  @Roles('MANAGER')
  getSupplierBalance(
    @Tenant() tenantId: string,
    @Param('supplierId') supplierId: string,
  ) {
    return this.accountsService.getSupplierBalance(tenantId, supplierId);
  }

  @Get('payment-calendar')
  @Roles('MANAGER')
  getPaymentCalendar(
    @Tenant() tenantId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.accountsService.getPaymentCalendar(
      tenantId,
      parseInt(month, 10),
      parseInt(year, 10),
    );
  }

  @Get('monthly-purchases')
  @Roles('MANAGER')
  getMonthlyPurchases(
    @Tenant() tenantId: string,
    @Query('year') year: string,
  ) {
    return this.accountsService.getMonthlyPurchases(
      tenantId,
      parseInt(year, 10),
    );
  }

  @Get('cash-flow')
  @Roles('OWNER')
  getCashFlowProjection(
    @Tenant() tenantId: string,
    @Query('days') days: string,
  ) {
    return this.accountsService.getCashFlowProjection(
      tenantId,
      parseInt(days, 10) || 30,
    );
  }
}
