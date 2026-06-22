import { Module } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { ClassroomsController } from './classrooms.controller';
import { GamificationModule } from '../gamification/gamification.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [GamificationModule, TemplatesModule],
  providers: [ClassroomsService],
  controllers: [ClassroomsController],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}
