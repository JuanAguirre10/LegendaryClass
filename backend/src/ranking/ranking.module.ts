import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { RankingGateway } from './ranking.gateway';
import { getJwtSecret } from '../auth/jwt-secret';

@Module({
  imports: [PrismaModule, JwtModule.register({ secret: getJwtSecret() })],
  controllers: [RankingController],
  providers: [RankingService, RankingGateway],
  exports: [RankingService, RankingGateway],
})
export class RankingModule {}
