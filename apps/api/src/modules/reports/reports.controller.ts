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
import { ReportsService } from './reports.service';
import {
  RequestReportDto,
  ReportFiltersDto,
  MarkReportPaidDto,
  RequestExportDto,
} from './reports.dto';
import { Tenant, Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  // =========================================================================
  // REPORT ENDPOINTS
  // =========================================================================

  // ── Get Pricing ──

  @Get('pricing')
  @Roles('VIEWER')
  getPricing() {
    return this.reportsService.getReportPricing();
  }

  // ── Request New Report ──

  @Post()
  @Roles('MANAGER')
  requestReport(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: RequestReportDto,
  ) {
    return this.reportsService.requestReport(tenantId, dto, userId);
  }

  // ── List Reports ──

  @Get()
  @Roles('MANAGER')
  getReports(
    @Tenant() tenantId: string,
    @Query() filters: ReportFiltersDto,
  ) {
    return this.reportsService.getReports(tenantId, filters);
  }

  // ── Get Report Detail ──

  @Get(':id')
  @Roles('MANAGER')
  getReportById(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.reportsService.getReportById(tenantId, id);
  }

  // ── Mark as Paid ──

  @Patch(':id/pay')
  @Roles('OWNER')
  markAsPaid(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: MarkReportPaidDto,
  ) {
    return this.reportsService.markAsPaid(tenantId, id, dto);
  }

  // ── Cancel Report ──

  @Patch(':id/cancel')
  @Roles('MANAGER')
  cancelReport(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.reportsService.cancelReport(tenantId, id);
  }

  // =========================================================================
  // DATA EXPORT ENDPOINTS
  // =========================================================================

  // ── Request Export (FREE) ──

  @Post('exports')
  @Roles('OPERATOR')
  requestExport(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: RequestExportDto,
  ) {
    return this.reportsService.requestExport(tenantId, dto, userId);
  }

  // ── List Exports ──

  @Get('exports')
  @Roles('OPERATOR')
  getExports(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.reportsService.getExports(tenantId, userId);
  }

  // ── Get Export Download URL ──

  @Get('exports/:id/download')
  @Roles('OPERATOR')
  getExportDownloadUrl(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.reportsService.getExportDownloadUrl(tenantId, id);
  }
}
