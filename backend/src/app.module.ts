import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { RankingModule } from './ranking/ranking.module';
import { ExportModule } from './export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global rate limiting — 100 requests per minute per IP (protects against brute force)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
    RankingModule,
    ExportModule,
  ],
  providers: [
    // Apply the rate limiter globally to every route
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
