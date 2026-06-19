import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { RewardStatus } from '@prisma/client';
import { PaginationQueryDto, paginate } from '../common/dto/pagination-query.dto';

@Injectable()
export class RewardsService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
  ) {}

  async create(teacherId: string, dto: CreateRewardDto) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso sobre esta aula');

    return this.prisma.reward.create({
      data: { ...dto, createdById: teacherId },
    });
  }

  async findByClassroom(classroomId: string, activeOnly = false) {
    return this.prisma.reward.findMany({
      where: { classroomId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: [{ rarity: 'asc' }, { costPoints: 'asc' }],
    });
  }

  async findOne(id: string) {
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward) throw new NotFoundException('Recompensa no encontrada');
    return reward;
  }

  async update(id: string, teacherId: string, data: Partial<CreateRewardDto>) {
    await this.findOwnedReward(id, teacherId);
    return this.prisma.reward.update({ where: { id }, data });
  }

  async delete(id: string, teacherId: string) {
    await this.findOwnedReward(id, teacherId);
    await this.prisma.reward.delete({ where: { id } });
    return { message: 'Recompensa eliminada' };
  }

  async toggleStatus(id: string, teacherId: string) {
    const reward = await this.findOwnedReward(id, teacherId);
    return this.prisma.reward.update({
      where: { id },
      data: { isActive: !reward.isActive },
    });
  }

  // ─── Student: redeem reward ──────────────────────────────────────────────

  async redeem(studentId: string, rewardId: string, classroomId: string) {
    const reward = await this.prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('Recompensa no encontrada');
    if (!reward.isActive) throw new BadRequestException('Esta recompensa no está disponible');

    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Estudiante no encontrado');

    // Level requirement check
    if (reward.levelRequirement && student.level < reward.levelRequirement) {
      throw new ForbiddenException(`Necesitas nivel ${reward.levelRequirement} para canjear esta recompensa`);
    }

    // Character specific check
    if (reward.characterSpecific && (reward.characterSpecific as string[]).length > 0) {
      if (!student.characterType || !(reward.characterSpecific as string[]).includes(student.characterType)) {
        throw new ForbiddenException('Esta recompensa es solo para ciertos personajes');
      }
    }

    // Max uses per student
    if (reward.maxUsesPerStudent) {
      const usedCount = await this.prisma.studentReward.count({
        where: {
          studentId,
          rewardId,
          status: { in: [RewardStatus.approved, RewardStatus.delivered] },
        },
      });
      if (usedCount >= reward.maxUsesPerStudent) {
        throw new BadRequestException('Has alcanzado el máximo de usos para esta recompensa');
      }
    }

    // Stock check
    if (reward.stockQuantity !== null && reward.stockQuantity === 0) {
      throw new BadRequestException('Esta recompensa está agotada');
    }

    // Points check — use classroom-specific points
    const sp = await this.prisma.studentPoint.findUnique({
      where: { studentId_classroomId: { studentId, classroomId } },
    });
    const availablePoints = sp?.totalPoints ?? 0;
    if (availablePoints < reward.costPoints) {
      throw new BadRequestException(
        `Puntos insuficientes. Necesitas ${reward.costPoints}, tienes ${availablePoints}`,
      );
    }

    // Deduct points
    await this.gamification.updateStudentPoints(studentId, classroomId, -reward.costPoints);

    // Decrement stock if applicable
    if (reward.stockQuantity !== null) {
      await this.prisma.reward.update({
        where: { id: rewardId },
        data: { stockQuantity: { decrement: 1 } },
      });
    }

    // Create student reward record
    const studentReward = await this.prisma.studentReward.create({
      data: {
        studentId,
        rewardId,
        classroomId,
        pointsSpent: reward.costPoints,
        status: RewardStatus.pending,
        expiresAt: reward.durationHours
          ? new Date(Date.now() + reward.durationHours * 3_600_000)
          : null,
      },
      include: { reward: true },
    });

    await this.prisma.user.update({
      where: { id: studentId },
      data: { rewardsEarned: { increment: 1 } },
    });

    return studentReward;
  }

  // ─── Teacher: update reward status ──────────────────────────────────────

  async updateStatus(id: string, teacherId: string, status: RewardStatus, notes?: string) {
    const sr = await this.prisma.studentReward.findUnique({
      where: { id },
      include: { reward: true },
    });
    if (!sr) throw new NotFoundException('Canje no encontrado');

    const classroom = await this.prisma.classroom.findFirst({
      where: { id: sr.classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso');

    // Apply XP bonus on approval
    if (status === RewardStatus.approved && sr.reward.xpBonus > 0) {
      await this.gamification.gainExperience(
        sr.studentId,
        sr.reward.xpBonus,
        'reward',
        `Recompensa aprobada: ${sr.reward.name}`,
        sr.classroomId,
      );
    }

    return this.prisma.studentReward.update({
      where: { id },
      data: {
        status,
        notes,
        approvedById: status === RewardStatus.approved ? teacherId : undefined,
        approvedAt: status === RewardStatus.approved ? new Date() : undefined,
      },
    });
  }

  async approveAllPending(rewardId: string, teacherId: string) {
    const pending = await this.prisma.studentReward.findMany({
      where: { rewardId, status: RewardStatus.pending },
      include: { reward: true },
    });

    for (const sr of pending) {
      await this.updateStatus(sr.id, teacherId, RewardStatus.approved);
    }

    return { message: `${pending.length} canjes aprobados` };
  }

  async getStudentRewards(
    studentId: string,
    classroomId?: string,
    pagination: PaginationQueryDto = {},
  ) {
    return paginate(
      this.prisma.studentReward,
      {
        where: { studentId, ...(classroomId ? { classroomId } : {}) },
        include: { reward: true },
        orderBy: { redeemedAt: 'desc' },
      },
      pagination,
    );
  }

  async getClassroomRedemptions(
    classroomId: string,
    teacherId: string,
    pagination: PaginationQueryDto = {},
  ) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso sobre esta aula');

    return paginate(
      this.prisma.studentReward,
      {
        where: { classroomId },
        include: {
          student: { select: { id: true, name: true } },
          reward: { select: { id: true, name: true, icon: true, costPoints: true } },
        },
        orderBy: { redeemedAt: 'desc' },
      },
      pagination,
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async findOwnedReward(id: string, teacherId: string) {
    const reward = await this.findOne(id);
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: reward.classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso sobre esta recompensa');
    return reward;
  }
}
