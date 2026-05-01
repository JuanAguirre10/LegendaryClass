import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParentService } from './parent.service';

@ApiTags('Parent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.parent)
@Controller('parent')
export class ParentController {
  constructor(private parentService: ParentService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.parentService.getDashboard(user.id);
  }

  @Get('children/:childId/progress')
  getChildProgress(@CurrentUser() user: any, @Param('childId') childId: string) {
    return this.parentService.getChildProgress(user.id, childId);
  }

  @Post('link-child')
  linkChild(@CurrentUser() user: any, @Body() body: { email: string }) {
    return this.parentService.linkChild(user.id, body.email);
  }

  @Delete('unlink-child/:childId')
  unlinkChild(@CurrentUser() user: any, @Param('childId') childId: string) {
    return this.parentService.unlinkChild(user.id, childId);
  }
}
