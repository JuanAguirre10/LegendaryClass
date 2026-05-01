import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GamificationModule } from './gamification/gamification.module';
import { ClassroomsModule } from './classrooms/classrooms.module';
import { BehaviorsModule } from './behaviors/behaviors.module';
import { RewardsModule } from './rewards/rewards.module';
import { QuestsModule } from './quests/quests.module';
import { AchievementsModule } from './achievements/achievements.module';
import { DirectorModule } from './director/director.module';
import { TeacherModule } from './teacher/teacher.module';
import { StudentModule } from './student/student.module';
import { ParentModule } from './parent/parent.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    GamificationModule,
    ClassroomsModule,
    BehaviorsModule,
    RewardsModule,
    QuestsModule,
    AchievementsModule,
    DirectorModule,
    TeacherModule,
    StudentModule,
    ParentModule,
  ],
})
export class AppModule {}
