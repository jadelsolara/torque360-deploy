import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, WorkOrder])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
