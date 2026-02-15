import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryCostService } from './inventory-cost.service';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItem, StockMovement])],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryCostService],
  exports: [InventoryService, InventoryCostService],
})
export class InventoryModule {}
