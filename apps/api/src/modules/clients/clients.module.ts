import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { AccountsReceivableController } from './accounts-receivable.controller';
import { AccountsReceivableService } from './accounts-receivable.service';
import { Client } from '../../database/entities/client.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { ClientPayment } from '../../database/entities/client-payment.entity';
import { Invoice } from '../../database/entities/invoice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Vehicle, WorkOrder, ClientPayment, Invoice]),
  ],
  controllers: [ClientsController, AccountsReceivableController],
  providers: [ClientsService, AccountsReceivableService],
  exports: [ClientsService, AccountsReceivableService],
})
export class ClientsModule {}
