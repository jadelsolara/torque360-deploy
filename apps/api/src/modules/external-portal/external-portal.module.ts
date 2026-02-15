import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ExternalPortalInternalController,
  ExternalPortalAgentController,
} from './external-portal.controller';
import { ExternalPortalService } from './external-portal.service';
import { ExternalAccess } from '../../database/entities/external-access.entity';
import { ImportUpdateLog } from '../../database/entities/import-update-log.entity';
import { ImportOrder } from '../../database/entities/import-order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExternalAccess,
      ImportUpdateLog,
      ImportOrder,
    ]),
  ],
  controllers: [
    ExternalPortalInternalController,
    ExternalPortalAgentController,
  ],
  providers: [ExternalPortalService],
  exports: [ExternalPortalService],
})
export class ExternalPortalModule {}
