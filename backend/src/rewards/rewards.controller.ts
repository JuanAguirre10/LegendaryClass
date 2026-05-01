import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role, RewardStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RewardsService } from './rewards.service';
import { CreateRewardDto } from './dto/create-reward.dto';

@ApiTags('Rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rewards')
export class RewardsController {
  constructor(private rewardsService: RewardsService) {}

  @Post()
  @Roles(Role.teacher)
  create(@CurrentUser() user: any, @Body() dto: CreateRewardDto) {
    return this.rewardsService.create(user.id, dto);
  }

  @Get('classroom/:classroomId/redemptions')
  @Roles(Role.teacher)
  getRedemptions(
    @Param('classroomId') classroomId: string,
    @CurrentUser() user: any,
  ) {
    return this.rewardsService.getClassroomRedemptions(classroomId, user.id);
  }

  @Get('classroom/:classroomId')
  findByClassroom(
    @Param('classroomId') classroomId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.rewardsService.findByClassroom(classroomId, activeOnly === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rewardsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.teacher)
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: Partial<CreateRewardDto>) {
    return this.rewardsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @Roles(Role.teacher)
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rewardsService.delete(id, user.id);
  }

  @Patch(':id/toggle-status')
  @Roles(Role.teacher)
  toggleStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rewardsService.toggleStatus(id, user.id);
  }

  // Student redeem
  @Post('redeem')
  @Roles(Role.student)
  @ApiOperation({ summary: 'Canjear recompensa (student)' })
  redeem(
    @CurrentUser() user: any,
    @Body() body: { rewardId: string; classroomId: string },
  ) {
    return this.rewardsService.redeem(user.id, body.rewardId, body.classroomId);
  }

  // Student history
  @Get('student/history')
  @Roles(Role.student)
  myRewards(@CurrentUser() user: any, @Query('classroomId') classroomId?: string) {
    return this.rewardsService.getStudentRewards(user.id, classroomId);
  }

  // Teacher approve
  @Patch('student-reward/:id/status')
  @Roles(Role.teacher)
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { status: RewardStatus; notes?: string },
  ) {
    return this.rewardsService.updateStatus(id, user.id, body.status, body.notes);
  }

  @Post(':id/approve-all-pending')
  @Roles(Role.teacher)
  approveAllPending(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rewardsService.approveAllPending(id, user.id);
  }
}
