import { Module } from '@nestjs/common';
import { QuestsService } from './quests.service';
import { QuestsController } from './quests.controller';
import { GamificationModule } from '../gamification/gamification.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [GamificationModule, NotificationsModule],
  providers: [QuestsService],
  controllers: [QuestsController],
})
export class QuestsModule {}
