import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RankingGateway } from '../ranking/ranking.gateway';
import { CreateClassroomDto } from './dto/create-classroom.dto';

@Injectable()
export class ClassroomsService {
  constructor(
    private prisma: PrismaService,
    private rankingGateway: RankingGateway,
  ) {}

  // ─── Teacher operations ─────────────────────────────────────────────────

  async create(teacherId: string, dto: CreateClassroomDto) {
    const slug = await this.generateUniqueSlug(dto.name, dto.subject, dto.gradeLevel);
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

  async findBySlug(slug: string, requesterId: string) {
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

    // Regenerate slug if name/subject/gradeLevel changed
    const needsNewSlug = data.name || data.subject || data.gradeLevel;
    const newSlug = needsNewSlug
      ? await this.generateUniqueSlug(
          data.name ?? classroom.name,
          data.subject ?? classroom.subject ?? undefined,
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

  async adjustPoints(slug: string, teacherId: string, studentId: string, points: number, notes?: string) {
    const classroom = await this.findOwnedClassroom(slug, teacherId);
    const sp = await this.prisma.studentPoint.findUnique({
      where: { studentId_classroomId: { studentId, classroomId: classroom.id } },
    });
    const newTotal = Math.max(0, (sp?.totalPoints ?? 0) + points);
    await this.prisma.studentPoint.upsert({
      where: { studentId_classroomId: { studentId, classroomId: classroom.id } },
      create: { studentId, classroomId: classroom.id, totalPoints: newTotal, level: Math.floor(newTotal / 100) + 1 },
      update: { totalPoints: newTotal, level: Math.floor(newTotal / 100) + 1 },
    });
    await this.rankingGateway.emitRankingUpdate(classroom.id);
    return { message: 'Puntos ajustados', newTotal };
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
          select: { totalPoints: true, level: true, experiencePoints: true },
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
