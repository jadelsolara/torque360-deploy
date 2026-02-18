import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { Subscription } from '../../database/entities/subscription.entity';
import { Tenant } from '../../database/entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Tenant])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
