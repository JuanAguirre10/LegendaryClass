import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TeacherService } from './teacher.service';

@ApiTags('Teacher')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.teacher)
@Controller('teacher')
export class TeacherController {
  constructor(private teacherService: TeacherService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.teacherService.getDashboard(user.id);
  }

  @Get('classrooms/:classroomId/report')
  getReport(@Param('classroomId') classroomId: string, @CurrentUser() user: any) {
    return this.teacherService.getClassroomReport(classroomId, user.id);
  }
}
