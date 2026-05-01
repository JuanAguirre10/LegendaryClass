import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role, CharacterType } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudentService } from './student.service';

@ApiTags('Student')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.student)
@Controller('student')
export class StudentController {
  constructor(private studentService: StudentService) {}

  @Post('character/select')
  selectCharacter(@CurrentUser() user: any, @Body() body: { characterType: CharacterType }) {
    return this.studentService.selectCharacter(user.id, body.characterType);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.studentService.getDashboard(user.id);
  }

  @Get('progress')
  getProgress(@CurrentUser() user: any) {
    return this.studentService.getProgress(user.id);
  }

  @Get('character-profile')
  getCharacterProfile(@CurrentUser() user: any) {
    return this.studentService.getCharacterProfile(user.id);
  }

  @Get('character-info/:type')
  getCharacterInfo(@Param('type') type: CharacterType) {
    return this.studentService.getCharacterInfo(type);
  }

  @Post('upgrade-stat')
  upgradeStat(
    @CurrentUser() user: any,
    @Body() body: { stat: string },
  ) {
    return this.studentService.upgradeStat(user.id, body.stat);
  }
}
