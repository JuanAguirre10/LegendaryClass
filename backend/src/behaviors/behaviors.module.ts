import { Module } from '@nestjs/common';
import { BehaviorsService } from './behaviors.service';
import { BehaviorsController } from './behaviors.controller';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [GamificationModule],
  providers: [BehaviorsService],
  controllers: [BehaviorsController],
  exports: [BehaviorsService],
})
export class BehaviorsModule {}
