import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { Quotation } from '../../database/entities/quotation.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quotation, WorkOrder])],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
