import { Module } from '@nestjs/common';
import { QuestsService } from './quests.service';
import { QuestsController } from './quests.controller';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [GamificationModule],
  providers: [QuestsService],
  controllers: [QuestsController],
})
export class QuestsModule {}
