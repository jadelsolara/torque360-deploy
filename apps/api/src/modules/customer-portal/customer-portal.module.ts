import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  CustomerPortalInternalController,
  CustomerPortalPublicController,
} from './customer-portal.controller';
import { CustomerPortalService } from './customer-portal.service';
import { CustomerPortalGuard } from '../../common/guards/customer-portal.guard';
import { CustomerTicket } from '../../database/entities/customer-ticket.entity';
import { CustomerMessage } from '../../database/entities/customer-message.entity';
import { CustomerAccess } from '../../database/entities/customer-access.entity';
import { Client } from '../../database/entities/client.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Quotation } from '../../database/entities/quotation.entity';
import { Invoice } from '../../database/entities/invoice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerTicket,
      CustomerMessage,
      CustomerAccess,
      Client,
      WorkOrder,
      Vehicle,
      Quotation,
      Invoice,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('CUSTOMER_PORTAL_JWT_SECRET'),
        signOptions: {
          expiresIn: '24h',
        },
      }),
    }),
  ],
  controllers: [
    CustomerPortalInternalController,
    CustomerPortalPublicController,
  ],
  providers: [CustomerPortalService, CustomerPortalGuard],
  exports: [CustomerPortalService],
})
export class CustomerPortalModule {}
