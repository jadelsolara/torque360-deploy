import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationRule } from '../../database/entities/automation-rule.entity';
import { Notification } from '../../database/entities/notification.entity';
import { Approval } from '../../database/entities/approval.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AutomationRule, Notification, Approval, User])],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
