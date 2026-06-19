import { Module } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { ClassroomsController } from './classrooms.controller';
import { RankingModule } from '../ranking/ranking.module';

@Module({
  imports: [RankingModule],
  providers: [ClassroomsService],
  controllers: [ClassroomsController],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}
