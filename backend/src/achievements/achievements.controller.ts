import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AchievementsService } from './achievements.service';
import { Role } from '@prisma/client';

@ApiTags('Achievements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('achievements')
export class AchievementsController {
  constructor(private achievementsService: AchievementsService) {}

  @Get('my')
  @Roles(Role.student)
  getMyAchievements(@CurrentUser() user: any) {
    return this.achievementsService.findByUser(user.id);
  }

  @Get('my/progress')
  @Roles(Role.student)
  getMyProgress(@CurrentUser() user: any) {
    return this.achievementsService.getProgress(user.id);
  }
}
