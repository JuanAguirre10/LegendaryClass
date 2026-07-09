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
        questions: dto.questions ?? undefined,
        passingScore: dto.passingScore ?? undefined,
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

  async findOneForStudent(questId: string, studentId: string) {
    const quest = await this.prisma.quest.findFirst({
      where: { id: questId, status: 'active', students: { some: { studentId } } },
      include: { students: { where: { studentId }, select: { isCompleted: true, completedAt: true } } },
    });
    if (!quest) throw new NotFoundException('Misión no encontrada');

    const sub = await this.prisma.questSubmission.findFirst({
      where: { questId, studentId },
      orderBy: { attemptNumber: 'desc' },
    });

    return { ...quest, questions: this.sanitizeQuestions(quest.questions), latestSubmission: sub ?? null };
  }

  // Strip correctAnswer so students cannot see answers via network tab
  private sanitizeQuestions(questions: unknown) {
    return Array.isArray(questions)
      ? (questions as any[]).map(({ correctAnswer: _c, ...q }) => q)
      : questions;
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

    const safeQuests = quests.map((q) => ({ ...q, questions: this.sanitizeQuestions(q.questions) }));

    const submissionQuestIds = safeQuests.filter((q) => q.requiresSubmission).map((q) => q.id);
    if (submissionQuestIds.length === 0) return safeQuests;

    const submissions = await this.prisma.questSubmission.findMany({
      where: { questId: { in: submissionQuestIds }, studentId },
      orderBy: { attemptNumber: 'desc' },
    });

    const latestMap = new Map<string, (typeof submissions)[0]>();
    for (const sub of submissions) {
      if (!latestMap.has(sub.questId)) latestMap.set(sub.questId, sub);
    }

    return safeQuests.map((q) => ({ ...q, latestSubmission: latestMap.get(q.id) ?? null }));
  }

  async complete(questId: string, studentId: string) {
    const qs = await this.prisma.questStudent.findUnique({
      where: { questId_studentId: { questId, studentId } },
      include: { quest: true },
    });
    if (!qs) throw new NotFoundException('Quest no encontrada o no asignada');
    if (qs.isCompleted) throw new BadRequestException('Ya completaste esta quest');
    if (qs.quest.status !== QuestStatus.active) throw new BadRequestException('Esta quest ya no está activa');

    // Mark completed — XP stays pending in inbox until student claims it
    await this.prisma.questStudent.update({
      where: { questId_studentId: { questId, studentId } },
      data: { isCompleted: true, completedAt: new Date(), xpClaimed: false },
    });

    const user = await this.prisma.user.update({
      where: { id: studentId },
      data: { questsCompleted: { increment: 1 } },
    });

    await this.gamification.checkQuestAchievements(studentId, user.questsCompleted);

    return { message: 'Quest completada', xpPending: qs.quest.xpReward };
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

  private async getQuestForSubmission(questId: string) {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
      select: { requiresSubmission: true, maxAttempts: true, status: true, dueDate: true,
                teacherId: true, classroomId: true, title: true, questions: true, passingScore: true },
    });
    if (!quest) throw new NotFoundException('Quest no encontrada');
    if (!quest.requiresSubmission) throw new BadRequestException('Esta quest no requiere entrega');
    if (quest.status !== QuestStatus.active) throw new BadRequestException('Esta quest ya no está activa');
    if (quest.dueDate && quest.dueDate < new Date()) throw new BadRequestException('El plazo de entrega ha vencido');
    return quest;
  }

  async submitEvidence(questId: string, studentId: string, file: Express.Multer.File) {
    const quest = await this.getQuestForSubmission(questId);

    const attemptCount = await this.prisma.questSubmission.count({ where: { questId, studentId } });
    if (attemptCount >= quest.maxAttempts) throw new ForbiddenException('Sin intentos restantes');

    const pending = await this.prisma.questSubmission.findFirst({ where: { questId, studentId, status: 'pending' } });
    if (pending) throw new BadRequestException('Ya tienes una entrega pendiente de revisión');

    const submission = await this.prisma.questSubmission.create({
      data: {
        questId, studentId,
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

  async submitAnswers(questId: string, studentId: string, answers: Record<string, any>) {
    const quest = await this.getQuestForSubmission(questId);
    if (!quest.questions) throw new BadRequestException('Esta misión no tiene formulario en línea');

    const qs = await this.prisma.questStudent.findUnique({
      where: { questId_studentId: { questId, studentId } },
    });
    if (!qs) throw new NotFoundException('Misión no encontrada o no asignada');
    if (qs.isCompleted) throw new BadRequestException('Ya completaste esta misión');

    const attemptCount = await this.prisma.questSubmission.count({ where: { questId, studentId } });
    if (attemptCount >= quest.maxAttempts) throw new ForbiddenException('Sin intentos restantes');

    const pending = await this.prisma.questSubmission.findFirst({ where: { questId, studentId, status: 'pending' } });
    if (pending) throw new BadRequestException('Ya tienes una entrega pendiente de revisión');

    const questions = quest.questions as any[];
    let totalPoints = 0;
    let earnedPoints = 0;
    let hasOpen = false;

    for (const q of questions) {
      const pts = q.points ?? 1;
      totalPoints += pts;
      if (q.type === 'open') {
        hasOpen = true;
      } else {
        const given = String(answers[q.id] ?? '').trim().toLowerCase();
        const correct = String(q.correctAnswer ?? '').trim().toLowerCase();
        if (given === correct) earnedPoints += pts;
      }
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passing = quest.passingScore ?? 60;
    const autoApprove = !hasOpen && score >= passing;
    // A failed all-objective attempt is graded automatically as rejected:
    // it must not sit as 'pending' (that would block the retry and put a
    // fake item in the teacher's review queue).
    const autoReject = !hasOpen && !autoApprove;
    const attemptsLeft = quest.maxAttempts - (attemptCount + 1);

    await this.prisma.questSubmission.create({
      data: {
        questId, studentId,
        answers: answers as any,
        score,
        attemptNumber: attemptCount + 1,
        status: autoApprove ? 'approved' : autoReject ? 'rejected' : 'pending',
        reviewedAt: hasOpen ? null : new Date(),
        teacherNotes: autoReject
          ? `Calificación automática: ${score}% (mínimo ${passing}%)`
          : null,
      },
    });

    if (autoApprove) {
      await this.complete(questId, studentId);
      return { autoApproved: true, score, passed: true, message: `¡Aprobado! Obtuviste ${score}%` };
    }

    if (hasOpen) {
      await this.notifications.create(quest.teacherId, {
        type: 'quest_submission',
        title: '📝 Nueva entrega en línea',
        message: `Un estudiante respondió el formulario de "${quest.title}"`,
        link: '/teacher/quest-submissions',
      });
    }

    return { autoApproved: false, score, passed: false,
      message: hasOpen
        ? 'Respuestas enviadas. El profesor las revisará pronto.'
        : `Puntaje: ${score}%. Necesitas ${passing}% para aprobar.` +
          (attemptsLeft > 0 ? ' Intenta de nuevo.' : ' Sin intentos restantes.') };
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
        quest: { select: { id: true, title: true, classroomId: true, xpReward: true, questions: true } },
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
    if (sub.status !== 'pending') {
      throw new BadRequestException('Esta entrega ya fue revisada');
    }
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
    if (sub.status !== 'pending') {
      throw new BadRequestException('Esta entrega ya fue revisada');
    }
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
