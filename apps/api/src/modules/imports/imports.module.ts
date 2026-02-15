import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { LandedCostService } from './landed-cost.service';
import { ExchangeRateService } from './exchange-rate.service';
import { ImportOrder } from '../../database/entities/import-order.entity';
import { ImportOrderItem } from '../../database/entities/import-order-item.entity';
import { ExchangeRate } from '../../database/entities/exchange-rate.entity';
import { Supplier } from '../../database/entities/supplier.entity';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { Notification } from '../../database/entities/notification.entity';
import { Approval } from '../../database/entities/approval.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportOrder,
      ImportOrderItem,
      ExchangeRate,
      Supplier,
      InventoryItem,
      Notification,
      Approval,
    ]),
  ],
  controllers: [ImportsController],
  providers: [ImportsService, LandedCostService, ExchangeRateService],
  exports: [ImportsService, LandedCostService, ExchangeRateService],
})
export class ImportsModule {}
