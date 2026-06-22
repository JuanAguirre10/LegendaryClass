import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { TemplatesService } from '../templates/templates.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { ImportActivityDto } from './dto/import-activity.dto';
import { localAvatarDiskPath } from '../common/upload/avatar-upload';
import { promises as fsp } from 'fs';

@Injectable()
export class ClassroomsService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
    private templates: TemplatesService,
  ) {}

  // ─── Teacher operations ─────────────────────────────────────────────────

  async create(teacherId: string, dto: CreateClassroomDto) {
    const slug = await this.generateUniqueSlug(dto.name, undefined, dto.gradeLevel);
    const classCode = await this.generateUniqueCode();
    const schoolYear = dto.schoolYear ?? this.getCurrentSchoolYear();

    return this.prisma.classroom.create({
      data: {
        ...dto,
        schoolYear,
        slug,
        classCode,
        teacherId,
      },
      include: { teacher: { select: { id: true, name: true } } },
    });
  }

  async findAllByTeacher(teacherId: string) {
    return this.prisma.classroom.findMany({
      where: { teacherId },
      include: {
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlug(slug: string, _requesterId: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { slug },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        students: {
          include: {
            student: {
              select: {
                id: true, name: true, email: true, level: true,
                experiencePoints: true, points: true, characterType: true, avatar: true,
              },
            },
          },
        },
        behaviors: { where: { isActive: true }, orderBy: { type: 'desc' } },
        rewards: { where: { isActive: true } },
        quests: { where: { status: 'active' } },
        studentPoints: true,
        _count: { select: { students: true } },
      },
    });

    if (!classroom) throw new NotFoundException('Aula no encontrada');
    return classroom;
  }

  async update(slug: string, teacherId: string, data: Partial<CreateClassroomDto>) {
    const classroom = await this.findOwnedClassroom(slug, teacherId);

    // Regenerate slug if name/gradeLevel changed
    const needsNewSlug = data.name || data.gradeLevel;
    const newSlug = needsNewSlug
      ? await this.generateUniqueSlug(
          data.name ?? classroom.name,
          undefined,
          data.gradeLevel ?? classroom.gradeLevel ?? undefined,
          classroom.id,
        )
      : undefined;

    return this.prisma.classroom.update({
      where: { id: classroom.id },
      data: { ...data, ...(newSlug ? { slug: newSlug } : {}) },
    });
  }

  async delete(slug: string, teacherId: string) {
    const classroom = await this.findOwnedClassroom(slug, teacherId);
    await this.prisma.classroom.delete({ where: { id: classroom.id } });
    return { message: 'Aula eliminada correctamente' };
  }

  async regenerateCode(slug: string, teacherId: string) {
    const classroom = await this.findOwnedClassroom(slug, teacherId);
    const classCode = await this.generateUniqueCode();
    return this.prisma.classroom.update({
      where: { id: classroom.id },
      data: { classCode },
    });
  }

  async removeStudent(slug: string, teacherId: string, studentId: string) {
    const classroom = await this.findOwnedClassroom(slug, teacherId);
    await this.prisma.classroomStudent.deleteMany({
      where: { classroomId: classroom.id, studentId },
    });
    return { message: 'Estudiante eliminado del aula' };
  }

  async removeAllStudents(slug: string, teacherId: string) {
    const classroom = await this.findOwnedClassroom(slug, teacherId);
    await this.prisma.classroomStudent.deleteMany({ where: { classroomId: classroom.id } });
    return { message: 'Todos los estudiantes fueron eliminados' };
  }

  async adjustPoints(slug: string, teacherId: string, studentId: string, points: number, _notes?: string) {
    const classroom = await this.findOwnedClassroom(slug, teacherId);
    // Route through gamification so User.points, positivePoints/negativePoints,
    // achievements, streak and ranking emit are all handled consistently.
    await this.gamification.updateStudentPoints(studentId, classroom.id, points, 'behavior');
    const sp = await this.prisma.studentPoint.findUnique({
      where: { studentId_classroomId: { studentId, classroomId: classroom.id } },
      select: { totalPoints: true },
    });
    return { message: 'Puntos ajustados', newTotal: sp?.totalPoints ?? 0 };
  }

  // ─── Student operations ─────────────────────────────────────────────────

  async joinByCode(studentId: string, classCode: string) {
    const classroom = await this.prisma.classroom.findUnique({ where: { classCode } });
    if (!classroom) throw new NotFoundException('Código de aula no encontrado');
    if (!classroom.isActive) throw new ForbiddenException('Esta aula no está activa');

    const alreadyEnrolled = await this.prisma.classroomStudent.findUnique({
      where: { classroomId_studentId: { classroomId: classroom.id, studentId } },
    });
    if (alreadyEnrolled) throw new ConflictException('Ya estás inscrito en esta aula');

    await this.prisma.classroomStudent.create({
      data: { classroomId: classroom.id, studentId },
    });

    return { message: `Te has unido a ${classroom.name}`, classroom };
  }

  async findAllByStudent(studentId: string) {
    return this.prisma.classroom.findMany({
      where: { students: { some: { studentId } } },
      include: {
        teacher: { select: { id: true, name: true } },
        _count: { select: { students: true } },
        studentPoints: {
          where: { studentId },
          select: { totalPoints: true, level: true },
        },
      },
    });
  }

  async leaveClassroom(studentId: string, classroomId: string) {
    const enrollment = await this.prisma.classroomStudent.findUnique({
      where: { classroomId_studentId: { classroomId, studentId } },
    });
    if (!enrollment) throw new NotFoundException('No estás inscrito en esta aula');
    await this.prisma.classroomStudent.delete({ where: { id: enrollment.id } });
    return { message: 'Has salido del aula' };
  }

  async setAvatar(slug: string, user: { id: string; role: string }, avatarUrl: string): Promise<{ avatar: string }> {
    const where =
      user.role === 'director' || user.role === 'admin' ? { slug } : { slug, teacherId: user.id };
    const classroom = await this.prisma.classroom.findFirst({ where, select: { id: true, avatar: true } });
    if (!classroom) throw new ForbiddenException('No tienes acceso a esta aula');
    await this.prisma.classroom.update({ where: { id: classroom.id }, data: { avatar: avatarUrl } });
    const prev = localAvatarDiskPath(classroom.avatar ?? null);
    if (prev) fsp.unlink(prev).catch(() => undefined);
    return { avatar: avatarUrl };
  }

  // ─── Classroom Activities ────────────────────────────────────────────────

  async listActivities(slug: string, requesterId: string, requesterRole: string) {
    const classroom = await this.prisma.classroom.findUnique({ where: { slug } });
    if (!classroom) throw new NotFoundException('Aula no encontrada');

    // teacher must own it; student must be enrolled
    if (requesterRole === 'teacher' && classroom.teacherId !== requesterId) {
      throw new ForbiddenException('No tienes permiso sobre esta aula');
    }
    if (requesterRole === 'student') {
      const enrollment = await this.prisma.classroomStudent.findUnique({
        where: { classroomId_studentId: { classroomId: classroom.id, studentId: requesterId } },
      });
      if (!enrollment) throw new ForbiddenException('No estás inscrito en esta aula');
    }

    return this.prisma.classroomActivity.findMany({
      where: { classroomId: classroom.id, isActive: true },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async importActivity(slug: string, teacherId: string, dto: ImportActivityDto) {
    const classroom = await this.findOwnedClassroom(slug, teacherId);

    // If templateId provided and mode=copy, take a snapshot of the template content
    let overrides = dto.overrides ?? {};
    if (dto.templateId && dto.mode === 'copy') {
      const template = await this.templates.findOneRaw(dto.templateId, dto.activityType);
      const { id: _id, courseId: _c, authorId: _a, approvedById: _ab, createdAt: _cr, updatedAt: _up, status: _st, ...snapshot } = template as any;
      overrides = { ...snapshot, ...overrides };
    }

    return this.prisma.classroomActivity.create({
      data: {
        classroomId: classroom.id,
        activityType: dto.activityType,
        templateId: dto.templateId ?? null,
        mode: dto.mode,
        overrides,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
  }

  async updateActivity(
    slug: string,
    teacherId: string,
    activityId: string,
    data: { dueDate?: string; overrides?: Record<string, any>; isActive?: boolean },
  ) {
    const classroom = await this.findOwnedClassroom(slug, teacherId);
    const activity = await this.prisma.classroomActivity.findFirst({
      where: { id: activityId, classroomId: classroom.id },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');

    return this.prisma.classroomActivity.update({
      where: { id: activityId },
      data: {
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
        ...(data.overrides !== undefined ? { overrides: data.overrides } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async removeActivity(slug: string, teacherId: string, activityId: string) {
    const classroom = await this.findOwnedClassroom(slug, teacherId);
    const activity = await this.prisma.classroomActivity.findFirst({
      where: { id: activityId, classroomId: classroom.id },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    await this.prisma.classroomActivity.delete({ where: { id: activityId } });
    return { message: 'Actividad eliminada' };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private async findOwnedClassroom(slug: string, teacherId: string) {
    const classroom = await this.prisma.classroom.findUnique({ where: { slug } });
    if (!classroom) throw new NotFoundException('Aula no encontrada');
    if (classroom.teacherId !== teacherId) throw new ForbiddenException('No tienes permiso sobre esta aula');
    return classroom;
  }

  private async generateUniqueSlug(
    name: string,
    subject?: string,
    gradeLevel?: string,
    excludeId?: string,
  ): Promise<string> {
    const base = [name, subject, gradeLevel]
      .filter(Boolean)
      .join('-')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = base;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.classroom.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) break;
      slug = `${base}-${counter++}`;
    }

    return slug;
  }

  private async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (await this.prisma.classroom.findUnique({ where: { classCode: code } }));
    return code;
  }

  private getCurrentSchoolYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    return `${year}-${year + 1}`;
  }
}
