import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BehaviorsService } from './behaviors.service';
import { CreateBehaviorDto } from './dto/create-behavior.dto';

@ApiTags('Behaviors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('behaviors')
export class BehaviorsController {
  constructor(private behaviorsService: BehaviorsService) {}

  @Post()
  @Roles(Role.teacher)
  @ApiOperation({ summary: 'Crear comportamiento' })
  create(@CurrentUser() user: any, @Body() dto: CreateBehaviorDto) {
    return this.behaviorsService.create(user.id, dto);
  }

  @Get('classroom/:classroomId')
  @Roles(Role.teacher)
  @ApiOperation({ summary: 'Listar comportamientos de un aula' })
  findByClassroom(@Param('classroomId') classroomId: string) {
    return this.behaviorsService.findAllByClassroom(classroomId);
  }

  @Get(':id')
  @Roles(Role.teacher)
  findOne(@Param('id') id: string) {
    return this.behaviorsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.teacher)
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: Partial<CreateBehaviorDto>) {
    return this.behaviorsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @Roles(Role.teacher)
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.behaviorsService.delete(id, user.id);
  }

  // Award behavior to student
  @Post('award')
  @Roles(Role.teacher)
  @ApiOperation({ summary: 'Asignar comportamiento a estudiante' })
  award(
    @CurrentUser() user: any,
    @Body() body: { studentId: string; behaviorId: string; classroomId: string; notes?: string },
  ) {
    return this.behaviorsService.awardToStudent(
      user.id,
      body.studentId,
      body.behaviorId,
      body.classroomId,
      body.notes,
    );
  }

  @Delete('student-behavior/:id')
  @Roles(Role.teacher)
  @ApiOperation({ summary: 'Eliminar asignación de comportamiento y revertir puntos' })
  deleteStudentBehavior(@Param('id') id: string, @CurrentUser() user: any) {
    return this.behaviorsService.deleteStudentBehavior(id, user.id);
  }

  @Get('student-behaviors/:classroomId')
  @Roles(Role.teacher)
  getStudentBehaviors(
    @Param('classroomId') classroomId: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.behaviorsService.getStudentBehaviors(classroomId, studentId);
  }
}
