import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QuestsService } from './quests.service';
import { CreateQuestDto } from './dto/create-quest.dto';

@ApiTags('Quests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quests')
export class QuestsController {
  constructor(private questsService: QuestsService) {}

  @Post()
  @Roles(Role.teacher)
  create(@CurrentUser() user: any, @Body() dto: CreateQuestDto) {
    return this.questsService.create(user.id, dto);
  }

  @Get('classroom/:classroomId')
  @Roles(Role.teacher)
  findByClassroom(@Param('classroomId') classroomId: string) {
    return this.questsService.findByClassroom(classroomId);
  }

  @Get('my-quests')
  @Roles(Role.student)
  myQuests(@CurrentUser() user: any, @Query('classroomId') classroomId?: string) {
    return this.questsService.findForStudent(user.id, classroomId);
  }

  @Post(':id/complete')
  @Roles(Role.student)
  complete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.questsService.complete(id, user.id);
  }

  @Delete(':id')
  @Roles(Role.teacher)
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.questsService.delete(id, user.id);
  }
}
