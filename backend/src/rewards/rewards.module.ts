import { Module } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { GamificationModule } from '../gamification/gamification.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [GamificationModule, NotificationsModule],
  providers: [RewardsService],
  controllers: [RewardsController],
  exports: [RewardsService],
})
export class RewardsModule {}
