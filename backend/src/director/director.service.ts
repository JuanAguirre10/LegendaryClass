import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DirectorService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalTeachers, totalStudents, totalParents, totalClassrooms, activeClassrooms,
           totalBehaviorsAwarded, totalRewardsRedeemed] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.teacher } }),
      this.prisma.user.count({ where: { role: Role.student } }),
      this.prisma.user.count({ where: { role: Role.parent } }),
      this.prisma.classroom.count(),
      this.prisma.classroom.count({ where: { isActive: true } }),
      this.prisma.studentBehavior.count(),
      this.prisma.studentReward.count(),
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [monthlyBehaviors, monthlyRewards, newStudents, newTeachers] = await Promise.all([
      this.prisma.studentBehavior.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.studentReward.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { role: Role.student, createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { role: Role.teacher, createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    return {
      totalTeachers, totalStudents, totalParents,
      totalClassrooms, activeClassrooms,
      totalBehaviorsAwarded, totalRewardsRedeemed,
      monthly: {
        behaviorsAwarded: monthlyBehaviors,
        rewards: monthlyRewards,
        newStudents,
        newTeachers,
      },
    };
  }

  async getTeachers() {
    return this.prisma.user.findMany({
      where: { role: Role.teacher },
      select: {
        id: true, name: true, email: true, isActive: true, createdAt: true,
        _count: { select: { taughtClassrooms: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getStudents() {
    return this.prisma.user.findMany({
      where: { role: Role.student },
      select: {
        id: true, name: true, email: true, level: true, experiencePoints: true,
        points: true, characterType: true, isActive: true, createdAt: true,
      },
      orderBy: [{ level: 'desc' }, { experiencePoints: 'desc' }],
    });
  }

  async getAllClassrooms() {
    return this.prisma.classroom.findMany({
      include: {
        teacher: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(data: {
    name: string; email: string; password: string; role: Role;
  }) {
    const hashed = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: { ...data, password: hashed },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
  }

  async updateUserRole(userId: string, role: Role) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async toggleUserStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user?.isActive },
      select: { id: true, name: true, isActive: true },
    });
  }
}
