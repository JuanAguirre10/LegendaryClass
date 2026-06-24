import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QuestsService } from './quests.service';
import { CreateQuestDto } from './dto/create-quest.dto';
import { ApproveSubmissionDto, RejectSubmissionDto } from './dto/quest-submission.dto';
import { multerSubmissionOptions } from '../common/upload/submission-upload';

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

  // ─── Submission endpoints ─────────────────────────────────────────────────

  @Post(':id/submit')
  @Roles(Role.student)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', multerSubmissionOptions))
  submitEvidence(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.questsService.submitEvidence(id, user.id, file);
  }

  // IMPORTANT: this route must be declared BEFORE /:id/submissions to avoid
  // NestJS treating "submissions" as the :id parameter value.
  @Get('submissions/pending')
  @Roles(Role.teacher)
  getPendingSubmissions(@CurrentUser() user: any) {
    return this.questsService.getPendingSubmissions(user.id);
  }

  @Get(':id/submissions')
  @Roles(Role.teacher)
  getQuestSubmissions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.questsService.getQuestSubmissions(id, user.id);
  }

  @Patch('submissions/:subId/approve')
  @Roles(Role.teacher)
  approveSubmission(
    @Param('subId') subId: string,
    @CurrentUser() user: any,
    @Body() dto: ApproveSubmissionDto,
  ) {
    return this.questsService.approveSubmission(subId, user.id, dto);
  }

  @Patch('submissions/:subId/reject')
  @Roles(Role.teacher)
  rejectSubmission(
    @Param('subId') subId: string,
    @CurrentUser() user: any,
    @Body() dto: RejectSubmissionDto,
  ) {
    return this.questsService.rejectSubmission(subId, user.id, dto);
  }
}
