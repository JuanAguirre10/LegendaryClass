import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, Query, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { multerAvatarOptions } from '../common/upload/avatar-upload';

@ApiTags('Classrooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classrooms')
export class ClassroomsController {
  constructor(private classroomsService: ClassroomsService) {}

  // ─── Teacher endpoints ─────────────────────────────────────────────────

  @Post()
  @Roles(Role.teacher)
  @ApiOperation({ summary: 'Crear aula (teacher)' })
  create(@CurrentUser() user: any, @Body() dto: CreateClassroomDto) {
    return this.classroomsService.create(user.id, dto);
  }

  @Get('mine')
  @Roles(Role.teacher)
  @ApiOperation({ summary: 'Listar mis aulas (teacher)' })
  findMine(@CurrentUser() user: any) {
    return this.classroomsService.findAllByTeacher(user.id);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Ver aula por slug' })
  findOne(@Param('slug') slug: string, @CurrentUser() user: any) {
    return this.classroomsService.findBySlug(slug, user.id);
  }

  @Patch(':slug')
  @Roles(Role.teacher)
  @ApiOperation({ summary: 'Actualizar aula (teacher)' })
  update(@Param('slug') slug: string, @CurrentUser() user: any, @Body() dto: Partial<CreateClassroomDto>) {
    return this.classroomsService.update(slug, user.id, dto);
  }

  @Delete(':slug')
  @Roles(Role.teacher)
  @ApiOperation({ summary: 'Eliminar aula (teacher)' })
  remove(@Param('slug') slug: string, @CurrentUser() user: any) {
    return this.classroomsService.delete(slug, user.id);
  }

  @Post(':slug/regenerate-code')
  @Roles(Role.teacher)
  regenerateCode(@Param('slug') slug: string, @CurrentUser() user: any) {
    return this.classroomsService.regenerateCode(slug, user.id);
  }

  @Delete(':slug/students/:studentId')
  @Roles(Role.teacher)
  removeStudent(
    @Param('slug') slug: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
  ) {
    return this.classroomsService.removeStudent(slug, user.id, studentId);
  }

  @Delete(':slug/students')
  @Roles(Role.teacher)
  removeAllStudents(@Param('slug') slug: string, @CurrentUser() user: any) {
    return this.classroomsService.removeAllStudents(slug, user.id);
  }

  @Post(':slug/adjust-points')
  @Roles(Role.teacher)
  adjustPoints(
    @Param('slug') slug: string,
    @CurrentUser() user: any,
    @Body() body: { studentId: string; points: number; notes?: string },
  ) {
    return this.classroomsService.adjustPoints(slug, user.id, body.studentId, body.points, body.notes);
  }

  // ─── Student endpoints ─────────────────────────────────────────────────

  @Post('join')
  @Roles(Role.student)
  @ApiOperation({ summary: 'Unirse a aula por código (student)' })
  join(@CurrentUser() user: any, @Body() body: { classCode: string }) {
    return this.classroomsService.joinByCode(user.id, body.classCode);
  }

  @Get('student/enrolled')
  @Roles(Role.student)
  @ApiOperation({ summary: 'Listar aulas donde estoy inscrito (student)' })
  findEnrolled(@CurrentUser() user: any) {
    return this.classroomsService.findAllByStudent(user.id);
  }

  @Delete(':classroomId/leave')
  @Roles(Role.student)
  @ApiOperation({ summary: 'Salir de un aula (student)' })
  leave(@Param('classroomId') classroomId: string, @CurrentUser() user: any) {
    return this.classroomsService.leaveClassroom(user.id, classroomId);
  }

  @Post(':slug/avatar')
  @Roles(Role.teacher)
  @UseInterceptors(FileInterceptor('file', multerAvatarOptions))
  uploadAvatar(
    @Param('slug') slug: string,
    @CurrentUser() user: { id: string; role: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return this.classroomsService.setAvatar(slug, user, `/uploads/avatars/${file.filename}`);
  }
}
