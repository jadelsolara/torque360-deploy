import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandCenterService } from './command-center.service';
import { CommandCenterController } from './command-center.controller';
import { Tenant } from '../../database/entities/tenant.entity';
import { User } from '../../database/entities/user.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { Quotation } from '../../database/entities/quotation.entity';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { ImportOrder } from '../../database/entities/import-order.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Client } from '../../database/entities/client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Tenant, User, WorkOrder, Quotation, InventoryItem,
    StockMovement, ImportOrder, Vehicle, Client,
  ])],
  controllers: [CommandCenterController],
  providers: [CommandCenterService],
})
export class CommandCenterModule {}
