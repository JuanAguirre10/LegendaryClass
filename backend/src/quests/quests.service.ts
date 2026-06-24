import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateQuestDto } from './dto/create-quest.dto';
import { ApproveSubmissionDto, RejectSubmissionDto } from './dto/quest-submission.dto';
import { QuestStatus } from '@prisma/client';

@Injectable()
export class QuestsService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
    private notifications: NotificationsService,
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
        requiresSubmission: dto.requiresSubmission ?? false,
        maxAttempts: dto.maxAttempts ?? 1,
      },
    });

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
    const quests = await this.prisma.quest.findMany({
      where: {
        status: QuestStatus.active,
        students: { some: { studentId } },
        ...(classroomId ? { classroomId } : {}),
      },
      include: {
        students: { where: { studentId }, select: { isCompleted: true, completedAt: true } },
      },
    });

    const submissionQuestIds = quests.filter((q) => q.requiresSubmission).map((q) => q.id);
    if (submissionQuestIds.length === 0) return quests;

    const submissions = await this.prisma.questSubmission.findMany({
      where: { questId: { in: submissionQuestIds }, studentId },
      orderBy: { attemptNumber: 'desc' },
    });

    const latestMap = new Map<string, (typeof submissions)[0]>();
    for (const sub of submissions) {
      if (!latestMap.has(sub.questId)) latestMap.set(sub.questId, sub);
    }

    return quests.map((q) => ({ ...q, latestSubmission: latestMap.get(q.id) ?? null }));
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

    const result = await this.gamification.gainExperience(
      studentId,
      qs.quest.xpReward,
      qs.quest.type ?? 'quest',
      `Quest completada: ${qs.quest.title}`,
      qs.quest.classroomId,
    );

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

  // ─── Submission flow ────────────────────────────────────────────────────────

  async submitEvidence(questId: string, studentId: string, file: Express.Multer.File) {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
      select: { requiresSubmission: true, maxAttempts: true, status: true, dueDate: true, teacherId: true, classroomId: true, title: true },
    });
    if (!quest) throw new NotFoundException('Quest no encontrada');
    if (!quest.requiresSubmission) throw new BadRequestException('Esta quest no requiere entrega de evidencia');
    if (quest.status !== QuestStatus.active) throw new BadRequestException('Esta quest ya no está activa');
    if (quest.dueDate && quest.dueDate < new Date()) throw new BadRequestException('El plazo de entrega ha vencido');

    const attemptCount = await this.prisma.questSubmission.count({ where: { questId, studentId } });
    if (attemptCount >= quest.maxAttempts) throw new ForbiddenException('Sin intentos restantes');

    const pending = await this.prisma.questSubmission.findFirst({
      where: { questId, studentId, status: 'pending' },
    });
    if (pending) throw new BadRequestException('Ya tienes una entrega pendiente de revisión para esta misión');

    const submission = await this.prisma.questSubmission.create({
      data: {
        questId,
        studentId,
        fileUrl: `/uploads/submissions/${file.filename}`,
        fileName: file.originalname,
        attemptNumber: attemptCount + 1,
      },
    });

    await this.notifications.create(quest.teacherId, {
      type: 'quest_submission',
      title: '📎 Nueva entrega',
      message: `Un estudiante entregó evidencia para "${quest.title}"`,
      link: '/teacher/quest-submissions',
    });

    return submission;
  }

  async getPendingSubmissions(teacherId: string) {
    const classrooms = await this.prisma.classroom.findMany({
      where: { teacherId },
      select: { id: true },
    });
    return this.prisma.questSubmission.findMany({
      where: {
        status: 'pending',
        quest: { classroomId: { in: classrooms.map((c) => c.id) } },
      },
      include: {
        quest: { select: { id: true, title: true, classroomId: true, xpReward: true } },
        student: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async getQuestSubmissions(questId: string, teacherId: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId }, select: { classroomId: true } });
    if (!quest) throw new NotFoundException('Quest no encontrada');
    const classroom = await this.prisma.classroom.findFirst({ where: { id: quest.classroomId, teacherId } });
    if (!classroom) throw new ForbiddenException('No tienes permiso');
    return this.prisma.questSubmission.findMany({
      where: { questId },
      include: { student: { select: { id: true, name: true, avatar: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  private async loadAndVerifySubmission(subId: string, teacherId: string) {
    const sub = await this.prisma.questSubmission.findUnique({
      where: { id: subId },
      include: { quest: { select: { id: true, title: true, xpReward: true, classroomId: true, teacherId: true } } },
    });
    if (!sub) throw new NotFoundException('Entrega no encontrada');
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: sub.quest.classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso');
    return sub;
  }

  async approveSubmission(subId: string, teacherId: string, dto: ApproveSubmissionDto) {
    const sub = await this.loadAndVerifySubmission(subId, teacherId);
    await this.prisma.questSubmission.update({
      where: { id: subId },
      data: { status: 'approved', teacherNotes: dto.teacherNotes ?? null, reviewedAt: new Date() },
    });
    await this.complete(sub.questId, sub.studentId);
    await this.notifications.create(sub.studentId, {
      type: 'quest_approved',
      title: '✅ Entrega aprobada',
      message: `Tu entrega para "${sub.quest.title}" fue aprobada. +${sub.quest.xpReward} XP`,
      link: '/student/quests',
    });
  }

  async rejectSubmission(subId: string, teacherId: string, dto: RejectSubmissionDto) {
    const sub = await this.loadAndVerifySubmission(subId, teacherId);
    await this.prisma.questSubmission.update({
      where: { id: subId },
      data: { status: 'rejected', teacherNotes: dto.teacherNotes, reviewedAt: new Date() },
    });
    await this.notifications.create(sub.studentId, {
      type: 'quest_rejected',
      title: '❌ Entrega rechazada',
      message: `Tu entrega para "${sub.quest.title}" fue rechazada: ${dto.teacherNotes}`,
      link: '/student/quests',
    });
  }
}
