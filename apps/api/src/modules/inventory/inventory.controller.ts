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
import { InventoryService } from './inventory.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  AdjustStockDto,
  ListInventoryQueryDto,
  StockEntryDto,
  StockExitDto,
  StockAdjustmentDto,
} from './inventory.dto';
import { Tenant, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('inventory')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('OPERATOR')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @Tenant() tenantId: string,
    @Query() query: ListInventoryQueryDto,
  ) {
    return this.inventoryService.findAll(tenantId, query);
  }

  @Get('low-stock')
  getLowStockAlerts(@Tenant() tenantId: string) {
    return this.inventoryService.getLowStockAlerts(tenantId);
  }

  // ─── Valuation Endpoints (MANAGER+) ─────────────────────────────────

  @Get('warehouse-valuation')
  @Roles('MANAGER')
  getGlobalWarehouseValuation(@Tenant() tenantId: string) {
    return this.inventoryService.getWarehouseValuation(tenantId);
  }

  @Get('warehouse-valuation/:warehouseId')
  @Roles('MANAGER')
  getWarehouseValuation(
    @Tenant() tenantId: string,
    @Param('warehouseId') warehouseId: string,
  ) {
    return this.inventoryService.getWarehouseValuation(tenantId, warehouseId);
  }

  @Get(':id')
  findById(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.inventoryService.findById(tenantId, id);
  }

  @Get(':id/valuation')
  @Roles('MANAGER')
  getItemValuation(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryService.getItemValuation(tenantId, id);
  }

  @Get(':id/cost-history')
  @Roles('MANAGER')
  getCostHistory(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.inventoryService.getCostHistory(tenantId, id, dateFrom, dateTo);
  }

  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.update(tenantId, id, dto);
  }

  @Patch(':id/stock')
  adjustStock(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(tenantId, id, dto);
  }

  // ─── CPP Cost Operations ────────────────────────────────────────────

  @Post('stock-entry')
  @Roles('OPERATOR')
  stockEntry(
    @Tenant() tenantId: string,
    @Body() dto: StockEntryDto,
  ) {
    return this.inventoryService.stockEntry(tenantId, dto);
  }

  @Post('stock-exit')
  @Roles('OPERATOR')
  stockExit(
    @Tenant() tenantId: string,
    @Body() dto: StockExitDto,
  ) {
    return this.inventoryService.stockExit(tenantId, dto);
  }

  @Post(':id/adjustment')
  @Roles('MANAGER')
  stockAdjustmentWithCost(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: StockAdjustmentDto,
  ) {
    return this.inventoryService.stockAdjustmentWithCost(tenantId, id, dto);
  }

  @Post(':id/recalculate-cost')
  @Roles('MANAGER')
  recalculateItemCost(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryService.recalculateItemCost(tenantId, id);
  }
}
