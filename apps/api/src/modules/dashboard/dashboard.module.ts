import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Client } from '../../database/entities/client.entity';
import { Quotation } from '../../database/entities/quotation.entity';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { Approval } from '../../database/entities/approval.entity';
import { Notification } from '../../database/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkOrder, Vehicle, Client, Quotation, InventoryItem, Approval, Notification,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
