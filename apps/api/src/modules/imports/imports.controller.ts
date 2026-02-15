import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ImportsService } from './imports.service';
import { LandedCostService } from './landed-cost.service';
import { ExchangeRateService } from './exchange-rate.service';
import { Tenant, CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  CreateImportOrderDto,
  CreateImportItemDto,
  UpdateImportOrderDto,
  UpdateStatusDto,
  UpdateExchangeRateDto,
  UpdateCostsDto,
} from './imports.dto';

@Controller('imports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ImportsController {
  constructor(
    private importsService: ImportsService,
    private landedCostService: LandedCostService,
    private exchangeRateService: ExchangeRateService,
  ) {}

  // ─── Import Orders ─────────────────────────────────────────────────

  @Post()
  @Roles('MANAGER')
  create(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateImportOrderDto,
  ) {
    return this.importsService.create(tenantId, userId, dto);
  }

  @Get()
  @Roles('OPERATOR')
  findAll(
    @Tenant() tenantId: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.importsService.findAll(tenantId, {
      status,
      supplierId,
      dateFrom,
      dateTo,
    });
  }

  @Get('pipeline')
  @Roles('MANAGER')
  getPipelineSummary(@Tenant() tenantId: string) {
    return this.importsService.getPipelineSummary(tenantId);
  }

  @Get('by-supplier/:supplierId')
  @Roles('OPERATOR')
  getBySupplier(
    @Tenant() tenantId: string,
    @Param('supplierId') supplierId: string,
  ) {
    return this.importsService.getBySupplier(tenantId, supplierId);
  }

  // ─── Exchange Rate Endpoints ──────────────────────────────────────

  @Get('exchange-rate/latest')
  @Roles('OPERATOR')
  async getLatestExchangeRate() {
    const rate = await this.exchangeRateService.getLatestRate('USD');
    return {
      rate,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('exchange-rate/history')
  @Roles('OPERATOR')
  async getExchangeRateHistory(@Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.exchangeRateService.getRateHistory('USD', numDays);
  }

  @Post('exchange-rate/update')
  @Roles('MANAGER')
  async updateExchangeRate(@Body() dto: UpdateExchangeRateDto) {
    return this.exchangeRateService.updateDailyRate(
      dto.currency,
      dto.observedRate,
      dto.source || 'MANUAL',
      dto.date,
      dto.buyRate,
      dto.sellRate,
    );
  }

  @Post('exchange-rate/fetch')
  @Roles('MANAGER')
  async fetchExchangeRate() {
    return this.exchangeRateService.fetchMindicadorRate();
  }

  // ─── Landed Cost Endpoints ────────────────────────────────────────

  @Post(':id/calculate-landed-cost')
  @Roles('MANAGER')
  calculateLandedCost(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.landedCostService.calculateLandedCost(tenantId, id);
  }

  @Post(':id/recalculate-current-rate')
  @Roles('MANAGER')
  recalculateWithCurrentRate(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.landedCostService.recalculateWithCurrentRate(tenantId, id);
  }

  @Get(':id/cost-breakdown')
  @Roles('OPERATOR')
  getCostBreakdown(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.landedCostService.getCostBreakdown(tenantId, id);
  }

  @Get(':id/rate-comparison')
  @Roles('OPERATOR')
  getRateComparison(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.landedCostService.compareRates(tenantId, id);
  }

  // ─── Cost Updates ─────────────────────────────────────────────────

  @Patch(':id/costs')
  @Roles('MANAGER')
  updateCosts(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCostsDto,
  ) {
    return this.importsService.updateCosts(tenantId, id, dto);
  }

  // ─── Order CRUD ───────────────────────────────────────────────────

  @Get(':id')
  @Roles('OPERATOR')
  findOne(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.importsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('MANAGER')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateImportOrderDto,
  ) {
    return this.importsService.update(tenantId, id, dto);
  }

  @Patch(':id/status')
  @Roles('MANAGER')
  updateStatus(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.importsService.updateStatus(tenantId, id, userId, dto);
  }

  @Post(':id/items')
  @Roles('MANAGER')
  addItem(
    @Tenant() tenantId: string,
    @Param('id') orderId: string,
    @Body() dto: CreateImportItemDto,
  ) {
    return this.importsService.addItem(tenantId, orderId, dto);
  }

  @Delete(':id/items/:itemId')
  @Roles('MANAGER')
  removeItem(
    @Tenant() tenantId: string,
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.importsService.removeItem(tenantId, orderId, itemId);
  }
}
