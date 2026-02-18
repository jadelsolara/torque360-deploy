import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NetworkController } from './network.controller';
import { NetworkService } from './network.service';
import { NetworkListing } from './entities/network-listing.entity';
import { NetworkRfq } from './entities/network-rfq.entity';
import { NetworkRfqResponse } from './entities/network-rfq-response.entity';
import { NetworkTransaction } from './entities/network-transaction.entity';
import { NetworkRating } from './entities/network-rating.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NetworkListing,
      NetworkRfq,
      NetworkRfqResponse,
      NetworkTransaction,
      NetworkRating,
    ]),
  ],
  controllers: [NetworkController],
  providers: [NetworkService],
  exports: [NetworkService],
})
export class NetworkModule {}
