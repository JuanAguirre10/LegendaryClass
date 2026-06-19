import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RankingService } from './ranking.service';

@ApiTags('Ranking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ranking')
export class RankingController {
  constructor(private rankingService: RankingService) {}

  @Get('classroom/:classroomId')
  async getClassroomRanking(@Param('classroomId') classroomId: string, @CurrentUser() user: any) {
    const ranking = await this.rankingService.getClassroomRanking(classroomId, user);
    return { classroomId, ranking };
  }
}
