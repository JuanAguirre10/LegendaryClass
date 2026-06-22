import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private courses: CoursesService) {}

  @Get()
  findAll() { return this.courses.findAll(); }

  @Post()
  @Roles(Role.director, Role.admin)
  create(@Body() dto: CreateCourseDto) { return this.courses.create(dto); }

  @Patch(':id')
  @Roles(Role.director, Role.admin)
  update(@Param('id') id: string, @Body() dto: Partial<CreateCourseDto>) {
    return this.courses.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.director, Role.admin)
  deactivate(@Param('id') id: string) { return this.courses.deactivate(id); }
}
