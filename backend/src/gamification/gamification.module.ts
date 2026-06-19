import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { RankingModule } from '../ranking/ranking.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [RankingModule, NotificationsModule],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
