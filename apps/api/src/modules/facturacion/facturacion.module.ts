import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacturacionController } from './facturacion.controller';
import { FacturacionService } from './facturacion.service';
import { SiiService } from './sii.service';
import { Invoice } from '../../database/entities/invoice.entity';
import { InvoiceItem } from '../../database/entities/invoice-item.entity';
import { CafFolio } from '../../database/entities/caf.entity';
import { Client } from '../../database/entities/client.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { Quotation } from '../../database/entities/quotation.entity';
import { WorkOrderPart } from '../../database/entities/work-order-part.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      CafFolio,
      Client,
      WorkOrder,
      Quotation,
      WorkOrderPart,
    ]),
  ],
  controllers: [FacturacionController],
  providers: [FacturacionService, SiiService],
  exports: [FacturacionService, SiiService],
})
export class FacturacionModule {}
