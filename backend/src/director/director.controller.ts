import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DirectorService } from './director.service';

@ApiTags('Director')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.director)
@Controller('director')
export class DirectorController {
  constructor(private directorService: DirectorService) {}

  @Get('stats')
  getStats() {
    return this.directorService.getDashboardStats();
  }

  @Get('teachers')
  getTeachers() {
    return this.directorService.getTeachers();
  }

  @Get('students')
  getStudents() {
    return this.directorService.getStudents();
  }

  @Get('classrooms')
  getClassrooms() {
    return this.directorService.getAllClassrooms();
  }

  @Post('users')
  createUser(@Body() body: { name: string; email: string; password: string; role: Role }) {
    return this.directorService.createUser(body);
  }

  @Patch('users/:id/role')
  updateRole(@Param('id') id: string, @Body() body: { role: Role }) {
    return this.directorService.updateUserRole(id, body.role);
  }

  @Patch('users/:id/toggle-status')
  toggleStatus(@Param('id') id: string) {
    return this.directorService.toggleUserStatus(id);
  }
}
