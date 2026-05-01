import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AchievementsService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string) {
    return this.prisma.achievement.findMany({
      where: { userId },
      orderBy: [{ isCompleted: 'desc' }, { unlockedAt: 'desc' }],
    });
  }

  async getProgress(userId: string) {
    const achievements = await this.findByUser(userId);
    const completed = achievements.filter((a) => a.isCompleted).length;
    const total = achievements.length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }
}
