import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ReviewTemplateDto } from './dto/review-template.dto';
import { ActivityType } from '@prisma/client';

@ApiTags('templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TemplatesController {
  constructor(private templates: TemplatesService) {}

  @Get('courses/:courseId/templates')
  @Roles('teacher', 'director', 'admin')
  list(
    @Param('courseId') courseId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.templates.list(courseId, user.id, user.role);
  }

  @Post('courses/:courseId/templates')
  @Roles('teacher', 'director', 'admin')
  create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateTemplateDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.templates.create(courseId, user.id, user.role, dto);
  }

  @Patch('templates/:id')
  @Roles('teacher', 'director', 'admin')
  update(
    @Param('id') id: string,
    @Query('type') type: ActivityType,
    @Body() dto: Partial<CreateTemplateDto>,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.templates.update(id, type, user.id, user.role, dto);
  }

  @Patch('templates/:id/review')
  @Roles('director', 'admin')
  review(
    @Param('id') id: string,
    @Query('type') type: ActivityType,
    @Body() dto: ReviewTemplateDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.templates.review(id, type, user.id, dto.approved, dto.note);
  }

  @Delete('templates/:id')
  @Roles('director', 'admin')
  remove(@Param('id') id: string, @Query('type') type: ActivityType) {
    return this.templates.remove(id, type);
  }
}
