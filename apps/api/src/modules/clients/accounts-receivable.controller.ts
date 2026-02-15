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
import { AccountsReceivableService } from './accounts-receivable.service';
import { Tenant, Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';
import {
  RecordPaymentDto,
  PaymentFiltersDto,
  ReceivablesFiltersDto,
} from './accounts-receivable.dto';

@Controller('clients')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class AccountsReceivableController {
  constructor(private arService: AccountsReceivableService) {}

  // ═══════════════════════════════════════════════════════════════════════
  // PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════

  @Post('payments')
  @Roles('OPERATOR')
  recordPayment(
    @Tenant() tenantId: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.arService.recordPayment(tenantId, dto, userId);
  }

  @Get('payments')
  @Roles('OPERATOR')
  findAllPayments(
    @Tenant() tenantId: string,
    @Query('clientId') clientId?: string,
    @Query('invoiceId') invoiceId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('method') method?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: PaymentFiltersDto = {
      clientId,
      invoiceId,
      dateFrom,
      dateTo,
      method,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    };
    return this.arService.findAllPayments(tenantId, filters);
  }

  @Get('payments/:id')
  @Roles('OPERATOR')
  findPaymentById(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.arService.findPaymentById(tenantId, id);
  }

  @Patch('payments/:id/confirm')
  @Roles('MANAGER')
  confirmPayment(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.arService.confirmPayment(tenantId, id, userId);
  }

  @Patch('payments/:id/void')
  @Roles('ADMIN')
  voidPayment(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.arService.voidPayment(tenantId, id);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RECEIVABLES REPORTS
  // ═══════════════════════════════════════════════════════════════════════

  @Get('receivables/summary')
  @Roles('MANAGER')
  getReceivablesSummary(@Tenant() tenantId: string) {
    return this.arService.getReceivablesSummary(tenantId);
  }

  @Get('receivables/aging')
  @Roles('MANAGER')
  getAgingReport(@Tenant() tenantId: string) {
    return this.arService.getAgingReport(tenantId);
  }

  @Get('receivables/overdue-clients')
  @Roles('MANAGER')
  getOverdueClients(@Tenant() tenantId: string) {
    return this.arService.getOverdueClients(tenantId);
  }

  @Get('receivables/calendar')
  @Roles('MANAGER')
  getCollectionCalendar(
    @Tenant() tenantId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.arService.getCollectionCalendar(
      tenantId,
      parseInt(month, 10),
      parseInt(year, 10),
    );
  }

  @Get('receivables/cash-flow')
  @Roles('MANAGER')
  getCashFlowIncoming(
    @Tenant() tenantId: string,
    @Query('days') days: string,
  ) {
    return this.arService.getCashFlowIncoming(
      tenantId,
      parseInt(days, 10) || 30,
    );
  }

  @Get('receivables/monthly')
  @Roles('MANAGER')
  getMonthlyCollections(
    @Tenant() tenantId: string,
    @Query('year') year: string,
  ) {
    return this.arService.getMonthlyCollections(
      tenantId,
      parseInt(year, 10),
    );
  }

  @Get(':clientId/balance')
  @Roles('OPERATOR')
  getClientBalance(
    @Tenant() tenantId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.arService.getClientBalance(tenantId, clientId);
  }
}
