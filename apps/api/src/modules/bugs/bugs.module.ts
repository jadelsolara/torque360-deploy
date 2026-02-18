import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BugsController } from './bugs.controller';
import { BugsService } from './bugs.service';
import { BugReport } from '../../database/entities/bug-report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BugReport])],
  controllers: [BugsController],
  providers: [BugsService],
  exports: [BugsService],
})
export class BugsModule {}
