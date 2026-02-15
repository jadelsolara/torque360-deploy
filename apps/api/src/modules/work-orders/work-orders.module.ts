import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { WorkOrderPart } from '../../database/entities/work-order-part.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkOrder, WorkOrderPart])],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
