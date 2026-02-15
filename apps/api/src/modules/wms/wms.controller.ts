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
import { WmsService } from './wms.service';
import { Tenant, CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateLocationDto,
  StockOperationDto,
  TransferStockDto,
  AdjustStockDto,
  MovementFiltersDto,
} from './wms.dto';

@Controller('wms')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class WmsController {
  constructor(private wmsService: WmsService) {}

  // ─── Warehouses ──────────────────────────────────────────────

  @Post('warehouses')
  @Roles('MANAGER')
  createWarehouse(
    @Tenant() tenantId: string,
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.wmsService.createWarehouse(tenantId, dto);
  }

  @Get('warehouses')
  @Roles('OPERATOR')
  getWarehouses(@Tenant() tenantId: string) {
    return this.wmsService.getWarehouses(tenantId);
  }

  @Get('warehouses/:id')
  @Roles('OPERATOR')
  getWarehouse(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.wmsService.getWarehouse(tenantId, id);
  }

  @Patch('warehouses/:id')
  @Roles('MANAGER')
  updateWarehouse(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.wmsService.updateWarehouse(tenantId, id, dto);
  }

  // ─── Locations ───────────────────────────────────────────────

  @Post('warehouses/:warehouseId/locations')
  @Roles('MANAGER')
  createLocation(
    @Tenant() tenantId: string,
    @Param('warehouseId') warehouseId: string,
    @Body() dto: CreateLocationDto,
  ) {
    return this.wmsService.createLocation(tenantId, warehouseId, dto);
  }

  @Get('warehouses/:warehouseId/locations')
  @Roles('OPERATOR')
  getLocations(
    @Tenant() tenantId: string,
    @Param('warehouseId') warehouseId: string,
  ) {
    return this.wmsService.getLocations(tenantId, warehouseId);
  }

  // ─── Stock Operations ────────────────────────────────────────

  @Post('stock/receive')
  @Roles('OPERATOR')
  receiveStock(
    @Tenant() tenantId: string,
    @Body() dto: StockOperationDto,
  ) {
    return this.wmsService.receiveStock(tenantId, dto);
  }

  @Post('stock/dispatch')
  @Roles('OPERATOR')
  dispatchStock(
    @Tenant() tenantId: string,
    @Body() dto: StockOperationDto,
  ) {
    return this.wmsService.dispatchStock(tenantId, dto);
  }

  @Post('stock/transfer')
  @Roles('OPERATOR')
  transferStock(
    @Tenant() tenantId: string,
    @Body() dto: TransferStockDto,
  ) {
    return this.wmsService.transferStock(tenantId, dto);
  }

  @Post('stock/adjust')
  @Roles('MANAGER')
  adjustStock(
    @Tenant() tenantId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.wmsService.adjustStock(tenantId, dto);
  }

  // ─── Queries ─────────────────────────────────────────────────

  @Get('movements')
  @Roles('OPERATOR')
  getMovements(
    @Tenant() tenantId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('itemId') itemId?: string,
    @Query('movementType') movementType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: MovementFiltersDto = {
      warehouseId,
      itemId,
      movementType,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.wmsService.getMovements(tenantId, filters);
  }

  @Get('warehouses/:warehouseId/stock')
  @Roles('OPERATOR')
  getStockByWarehouse(
    @Tenant() tenantId: string,
    @Param('warehouseId') warehouseId: string,
  ) {
    return this.wmsService.getStockByWarehouse(tenantId, warehouseId);
  }

  @Get('alerts/low-stock')
  @Roles('MANAGER')
  getLowStockAlerts(@Tenant() tenantId: string) {
    return this.wmsService.getLowStockAlerts(tenantId);
  }
}
