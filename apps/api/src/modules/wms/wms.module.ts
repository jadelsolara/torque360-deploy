import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WmsController } from './wms.controller';
import { WmsService } from './wms.service';
import { Warehouse } from '../../database/entities/warehouse.entity';
import { WarehouseLocation } from '../../database/entities/warehouse-location.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Warehouse,
      WarehouseLocation,
      StockMovement,
      InventoryItem,
    ]),
    InventoryModule,
  ],
  controllers: [WmsController],
  providers: [WmsService],
  exports: [WmsService],
})
export class WmsModule {}
