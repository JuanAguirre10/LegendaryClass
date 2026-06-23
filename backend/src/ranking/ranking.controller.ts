import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RankingService } from './ranking.service';
import { TakeSnapshotDto } from './dto/ranking.dto';

@ApiTags('Ranking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ranking')
export class RankingController {
  constructor(private rankingService: RankingService) {}

  @Get('classroom/:classroomId')
  async getClassroomRanking(
    @Param('classroomId') classroomId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const ranking = await this.rankingService.getClassroomRanking(classroomId, user);
    return { classroomId, ranking };
  }

  @Get('global')
  async getGlobalRanking(@CurrentUser() user: { id: string; role: string }) {
    const ranking = await this.rankingService.getGlobalRanking(user);
    return { ranking };
  }

  @Post('snapshot')
  @Roles('director', 'admin')
  @UseGuards(RolesGuard)
  async takeSnapshot(@Body() body: TakeSnapshotDto) {
    const scope = body.classroomId ?? 'global';
    await this.rankingService.takeSnapshotForScope(scope);
    return { message: 'Snapshot guardado', scope };
  }
}
