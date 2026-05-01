import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { CreateQuestDto } from './dto/create-quest.dto';
import { QuestStatus } from '@prisma/client';

@Injectable()
export class QuestsService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
  ) {}

  async create(teacherId: string, dto: CreateQuestDto) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso sobre esta aula');

    const quest = await this.prisma.quest.create({
      data: {
        title: dto.title,
        description: dto.description,
        xpReward: dto.xpReward ?? 50,
        type: dto.type,
        classroomId: dto.classroomId,
        teacherId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });

    // Assign to specific students or all enrolled students
    const studentIds = dto.studentIds?.length
      ? dto.studentIds
      : (
          await this.prisma.classroomStudent.findMany({
            where: { classroomId: dto.classroomId },
            select: { studentId: true },
          })
        ).map((e) => e.studentId);

    if (studentIds.length > 0) {
      await this.prisma.questStudent.createMany({
        data: studentIds.map((studentId) => ({ questId: quest.id, studentId })),
        skipDuplicates: true,
      });
    }

    return quest;
  }

  async findByClassroom(classroomId: string) {
    return this.prisma.quest.findMany({
      where: { classroomId },
      include: {
        _count: { select: { students: true } },
        students: { where: { isCompleted: true }, select: { studentId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findForStudent(studentId: string, classroomId?: string) {
    return this.prisma.quest.findMany({
      where: {
        status: QuestStatus.active,
        students: { some: { studentId } },
        ...(classroomId ? { classroomId } : {}),
      },
      include: {
        students: { where: { studentId }, select: { isCompleted: true, completedAt: true } },
      },
    });
  }

  async complete(questId: string, studentId: string) {
    const qs = await this.prisma.questStudent.findUnique({
      where: { questId_studentId: { questId, studentId } },
      include: { quest: true },
    });
    if (!qs) throw new NotFoundException('Quest no encontrada o no asignada');
    if (qs.isCompleted) throw new BadRequestException('Ya completaste esta quest');
    if (qs.quest.status !== QuestStatus.active) throw new BadRequestException('Esta quest ya no está activa');

    await this.prisma.questStudent.update({
      where: { questId_studentId: { questId, studentId } },
      data: { isCompleted: true, completedAt: new Date() },
    });

    // XP reward with character bonus
    const result = await this.gamification.gainExperience(
      studentId,
      qs.quest.xpReward,
      qs.quest.type ?? 'quest',
      `Quest completada: ${qs.quest.title}`,
      qs.quest.classroomId,
    );

    // Increment quest counter
    const user = await this.prisma.user.update({
      where: { id: studentId },
      data: { questsCompleted: { increment: 1 } },
    });

    await this.gamification.checkQuestAchievements(studentId, user.questsCompleted);

    return { message: 'Quest completada', xpEarned: qs.quest.xpReward, ...result };
  }

  async delete(id: string, teacherId: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id } });
    if (!quest) throw new NotFoundException('Quest no encontrada');
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: quest.classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso');
    await this.prisma.quest.delete({ where: { id } });
    return { message: 'Quest eliminada' };
  }
}
