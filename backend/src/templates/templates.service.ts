import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ActivityType, TemplateStatus } from '@prisma/client';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  // Returns the correct Prisma delegate based on activityType
  private delegate(type: ActivityType) {
    const map = {
      [ActivityType.homework]: this.prisma.homeworkTemplate,
      [ActivityType.exercise]: this.prisma.exerciseTemplate,
      [ActivityType.form]:     this.prisma.formTemplate,
      [ActivityType.exam]:     this.prisma.examTemplate,
    } as Record<ActivityType, any>;
    return map[type];
  }

  async list(courseId: string, userId: string, userRole: string) {
    const isDirector = userRole === 'director' || userRole === 'admin';
    const types = [ActivityType.homework, ActivityType.exercise, ActivityType.form, ActivityType.exam];
    const results: any[] = [];
    for (const type of types) {
      const where: any = { courseId };
      if (!isDirector) {
        where.status = TemplateStatus.approved;
      }
      const items = await this.delegate(type).findMany({
        where,
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      results.push(...items.map((t: any) => ({ ...t, activityType: type })));
    }
    return results;
  }

  async create(courseId: string, userId: string, userRole: string, dto: CreateTemplateDto) {
    const isDirector = userRole === 'director' || userRole === 'admin';
    const status = isDirector ? TemplateStatus.approved : TemplateStatus.pending;
    const common = {
      courseId, authorId: userId, status,
      title: dto.title, description: dto.description,
      xpReward: dto.xpReward ?? 50,
      difficulty: dto.difficulty,
      ...(isDirector ? { approvedById: userId, approvedAt: new Date() } : {}),
    };

    switch (dto.activityType) {
      case ActivityType.homework:
        if (!dto.instructions) throw new BadRequestException('instructions es requerido para tarea');
        return this.prisma.homeworkTemplate.create({
          data: { ...common, instructions: dto.instructions, defaultDueDays: dto.defaultDueDays ?? 7, attachmentUrl: dto.attachmentUrl },
        });
      case ActivityType.exercise:
        if (!dto.problems?.length) throw new BadRequestException('problems es requerido para ejercicio');
        return this.prisma.exerciseTemplate.create({ data: { ...common, problems: dto.problems } });
      case ActivityType.form:
        if (!dto.questions?.length) throw new BadRequestException('questions es requerido para formulario');
        return this.prisma.formTemplate.create({ data: { ...common, questions: dto.questions } });
      case ActivityType.exam:
        if (!dto.questions?.length || !dto.durationMinutes || !dto.passingScore || !dto.totalPoints)
          throw new BadRequestException('questions, durationMinutes, passingScore, totalPoints son requeridos para examen');
        return this.prisma.examTemplate.create({
          data: { ...common, questions: dto.questions, durationMinutes: dto.durationMinutes, passingScore: dto.passingScore, totalPoints: dto.totalPoints },
        });
    }
  }

  async update(id: string, activityType: ActivityType, userId: string, userRole: string, dto: Partial<CreateTemplateDto>) {
    const template = await this.findOneRaw(id, activityType);
    const isDirector = userRole === 'director' || userRole === 'admin';
    if (!isDirector && template.authorId !== userId) throw new ForbiddenException('No tienes permiso');
    if (!isDirector && template.status === TemplateStatus.approved) throw new ForbiddenException('No puedes editar una plantilla aprobada');

    const { activityType: _at, ...data } = dto as any;
    return this.delegate(activityType).update({ where: { id }, data });
  }

  async review(id: string, activityType: ActivityType, directorId: string, approved: boolean, note?: string) {
    const template = await this.findOneRaw(id, activityType);
    if (template.status !== TemplateStatus.pending) {
      throw new BadRequestException(`Solo se pueden revisar plantillas en estado "pending"`);
    }

    const status = approved ? TemplateStatus.approved : TemplateStatus.rejected;
    const updated = await this.delegate(activityType).update({
      where: { id },
      data: {
        status,
        rejectionNote: approved ? null : (note ?? null),
        approvedById: approved ? directorId : null,
        approvedAt: approved ? new Date() : null,
      },
    });

    try {
      const c = this.notifications.buildNotificationContent('template_review', { approved, title: template.title, note });
      await this.notifications.create(template.authorId, { type: 'template_review', ...c });
    } catch { /* best-effort */ }

    return updated;
  }

  async remove(id: string, activityType: ActivityType) {
    await this.findOneRaw(id, activityType);
    await this.delegate(activityType).delete({ where: { id } });
    return { message: 'Plantilla eliminada' };
  }

  async findOneRaw(id: string, activityType: ActivityType) {
    const t = await this.delegate(activityType).findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Plantilla no encontrada');
    return t;
  }
}
