import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { RankingModule } from '../ranking/ranking.module';

@Module({
  imports: [RankingModule],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
