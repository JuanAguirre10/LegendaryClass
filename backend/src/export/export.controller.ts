import { Controller, Get, Param, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExportService } from './export.service';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('Export')
@ApiBearerAuth()
@Controller('export')
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('classroom/:classroomId')
  @UseGuards(JwtAuthGuard)
  async exportClassroom(
    @Param('classroomId') classroomId: string,
    @CurrentUser() user: { id: string; role: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const slug = await this.exportService.assertTeacherCanExport(classroomId, user);
    const buffer = await this.exportService.buildClassroomWorkbook(classroomId);
    res.set({ 'Content-Type': XLSX_MIME, 'Content-Disposition': `attachment; filename="aula-${slug}.xlsx"` });
    return new StreamableFile(buffer);
  }

  @Get('institution')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.director)
  async exportInstitution(@Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const buffer = await this.exportService.buildInstitutionWorkbook();
    res.set({ 'Content-Type': XLSX_MIME, 'Content-Disposition': 'attachment; filename="institucion.xlsx"' });
    return new StreamableFile(buffer);
  }
}
