import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { Approval } from '../../database/entities/approval.entity';
import { Notification } from '../../database/entities/notification.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Approval, Notification, User])],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
