import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { CreateBehaviorDto } from './dto/create-behavior.dto';

@Injectable()
export class BehaviorsService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
  ) {}

  async create(teacherId: string, dto: CreateBehaviorDto) {
    // Verify teacher owns the classroom
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso sobre esta aula');

    return this.prisma.behavior.create({
      data: { ...dto, createdById: teacherId },
    });
  }

  async findAllByClassroom(classroomId: string) {
    return this.prisma.behavior.findMany({
      where: { classroomId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const behavior = await this.prisma.behavior.findUnique({
      where: { id },
      include: { _count: { select: { studentBehaviors: true } } },
    });
    if (!behavior) throw new NotFoundException('Comportamiento no encontrado');
    return behavior;
  }

  async update(id: string, teacherId: string, data: Partial<CreateBehaviorDto>) {
    const behavior = await this.findOne(id);
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: behavior.classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso');
    return this.prisma.behavior.update({ where: { id }, data });
  }

  async delete(id: string, teacherId: string) {
    const behavior = await this.findOne(id);
    const usageCount = (behavior as any)._count?.studentBehaviors ?? 0;
    if (usageCount > 0) {
      throw new BadRequestException('No puedes eliminar un comportamiento que ya fue asignado a estudiantes');
    }
    await this.prisma.behavior.delete({ where: { id } });
    return { message: 'Comportamiento eliminado' };
  }

  // ─── Award behavior to student ──────────────────────────────────────────

  async awardToStudent(
    teacherId: string,
    studentId: string,
    behaviorId: string,
    classroomId: string,
    notes?: string,
  ) {
    // Verify ownership
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso sobre esta aula');

    const behavior = await this.prisma.behavior.findUnique({ where: { id: behaviorId } });
    if (!behavior) throw new NotFoundException('Comportamiento no encontrado');

    // Record the behavior
    const studentBehavior = await this.prisma.studentBehavior.create({
      data: {
        studentId,
        behaviorId,
        classroomId,
        pointsAwarded: behavior.points,
        awardedById: teacherId,
        notes,
      },
    });

    // Update classroom points
    await this.gamification.updateStudentPoints(studentId, classroomId, behavior.points);

    // Gain global XP (positive behaviors only)
    if (behavior.points > 0) {
      await this.gamification.gainExperience(
        studentId,
        behavior.points,
        behavior.category,
        `Comportamiento: ${behavior.name}`,
        classroomId,
      );
    }

    return studentBehavior;
  }

  async deleteStudentBehavior(id: string, teacherId: string) {
    const record = await this.prisma.studentBehavior.findUnique({
      where: { id },
      include: { behavior: true },
    });
    if (!record) throw new NotFoundException('Registro no encontrado');

    const classroom = await this.prisma.classroom.findFirst({
      where: { id: record.classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso');

    // Revert the points
    await this.gamification.updateStudentPoints(
      record.studentId,
      record.classroomId,
      -record.pointsAwarded,
    );

    await this.prisma.studentBehavior.delete({ where: { id } });
    return { message: 'Comportamiento revertido y eliminado' };
  }

  async getStudentBehaviors(classroomId: string, studentId?: string) {
    return this.prisma.studentBehavior.findMany({
      where: { classroomId, ...(studentId ? { studentId } : {}) },
      include: {
        behavior: true,
        student: { select: { id: true, name: true, avatar: true } },
        awardedBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }
}
