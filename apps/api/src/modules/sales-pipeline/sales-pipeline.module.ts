import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesPipelineController } from './sales-pipeline.controller';
import { SalesPipelineService } from './sales-pipeline.service';
import { Quotation } from '../../database/entities/quotation.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { WorkOrderPart } from '../../database/entities/work-order-part.entity';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { WarehouseLocation } from '../../database/entities/warehouse-location.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { Client } from '../../database/entities/client.entity';
import { FacturacionModule } from '../facturacion/facturacion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quotation,
      WorkOrder,
      WorkOrderPart,
      InventoryItem,
      StockMovement,
      WarehouseLocation,
      Invoice,
      Client,
    ]),
    FacturacionModule,
  ],
  controllers: [SalesPipelineController],
  providers: [SalesPipelineService],
  exports: [SalesPipelineService],
})
export class SalesPipelineModule {}
