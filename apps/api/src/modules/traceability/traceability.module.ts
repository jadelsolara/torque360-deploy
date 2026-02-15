import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TraceabilityController } from './traceability.controller';
import { TraceabilityService } from './traceability.service';
import { TraceabilityEntry } from '../../database/entities/traceability.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TraceabilityEntry])],
  controllers: [TraceabilityController],
  providers: [TraceabilityService],
  exports: [TraceabilityService],
})
export class TraceabilityModule {}
