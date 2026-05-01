import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService, CHARACTER_INFO } from '../gamification/gamification.service';
import { CharacterType } from '@prisma/client';

@Injectable()
export class StudentService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
  ) {}

  // ─── Character selection ─────────────────────────────────────────────────

  async selectCharacter(studentId: string, characterType: CharacterType) {
    const user = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.firstCharacterSelection) {
      throw new BadRequestException('Ya seleccionaste tu personaje');
    }

    const charInfo = CHARACTER_INFO[characterType];

    return this.prisma.user.update({
      where: { id: studentId },
      data: {
        characterType,
        characterBonusType: charInfo.bonusType,
        firstCharacterSelection: true,
      },
      select: {
        id: true, name: true, characterType: true, characterBonusType: true,
        level: true, experiencePoints: true,
      },
    });
  }

  // ─── Dashboard data ──────────────────────────────────────────────────────

  async getDashboard(studentId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        achievements: { where: { isCompleted: true }, orderBy: { unlockedAt: 'desc' }, take: 5 },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const classrooms = await this.prisma.classroom.findMany({
      where: { students: { some: { studentId } }, isActive: true },
      include: {
        teacher: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
    });

    const studentPoints = await this.prisma.studentPoint.findMany({
      where: { studentId },
    });
    const pointsMap = new Map(studentPoints.map((sp) => [sp.classroomId, sp.totalPoints]));

    const classroomsWithPoints = classrooms.map((c) => ({
      ...c,
      myPoints: pointsMap.get(c.id) ?? 0,
      studentsCount: c._count.students,
    }));

    const quests = await this.prisma.quest.findMany({
      where: {
        status: 'active',
        students: { some: { studentId, isCompleted: false } },
      },
      take: 5,
    });

    const classroomIds = classrooms.map((c) => c.id);
    const rewards = classroomIds.length > 0
      ? await this.prisma.reward.findMany({
          where: { classroomId: { in: classroomIds }, isActive: true },
          take: 8,
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const level = this.gamification.calculateLevel(user.experiencePoints);
    const progress = this.gamification.getLevelProgress(user.experiencePoints, level);
    const nextLevelXp = this.gamification.getNextLevelXp(level);
    const currentLevelXp = this.gamification.getCurrentLevelXp(level);

    const stats = {
      strength:     user.strength,
      intelligence: user.intelligence,
      agility:      user.agility,
      creativity:   user.creativity,
      leadership:   user.leadership,
      resilience:   user.resilience,
    };

    const { password, ...safeUser } = user as any;

    return {
      user: safeUser,
      classrooms: classroomsWithPoints,
      quests,
      rewards,
      achievements: user.achievements,
      stats,
      xpInfo: { level, progress, nextLevelXp, currentLevelXp, xp: user.experiencePoints },
    };
  }

  // ─── Character info ──────────────────────────────────────────────────────

  getCharacterInfo(characterType: CharacterType) {
    return CHARACTER_INFO[characterType] ?? null;
  }

  async getCharacterProfile(studentId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        achievements: { orderBy: { unlockedAt: 'desc' } },
        experienceLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const level = user.level;
    const bonusType = user.characterBonusType;
    const tier = this.gamification.getTier(level);

    const stats = {
      strength:     this.gamification.calculateStat('strength',     level, bonusType),
      intelligence: this.gamification.calculateStat('intelligence', level, bonusType),
      agility:      this.gamification.calculateStat('agility',      level, bonusType),
      creativity:   this.gamification.calculateStat('creativity',   level, bonusType),
      leadership:   this.gamification.calculateStat('leadership',   level, bonusType),
      resilience:   this.gamification.calculateStat('resilience',   level, bonusType),
    };

    const totalPower = Object.values(stats).reduce((a, b) => a + b, 0);

    const evolution = [1, 2, 3, 4].map((t) => ({
      tier: t,
      name: this.gamification.getTierName(t),
      minLevel: [0, 1, 25, 50, 75][t],
      maxLevel: [0, 24, 49, 74, 999][t],
      isUnlocked: tier >= t,
      isCurrent: tier === t,
    }));

    return {
      user: { ...user, password: undefined },
      stats,
      totalPower,
      tier,
      tierName: this.gamification.getTierName(tier),
      evolution,
      characterInfo: user.characterType ? CHARACTER_INFO[user.characterType] : null,
    };
  }

  // ─── Stat upgrade ────────────────────────────────────────────────────────

  async upgradeStat(studentId: string, stat: string) {
    const validStats = ['strength', 'intelligence', 'agility', 'creativity', 'leadership', 'resilience'];
    if (!validStats.includes(stat)) throw new BadRequestException('Stat inválida');

    const UPGRADE_COST = 50;

    const user = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if ((user.points ?? 0) < UPGRADE_COST) {
      throw new BadRequestException(`Necesitas ${UPGRADE_COST} puntos para mejorar una estadística`);
    }

    await this.prisma.user.update({
      where: { id: studentId },
      data: { [stat]: { increment: 5 }, points: { decrement: UPGRADE_COST } },
    });

    return { message: `${stat} mejorada en +5`, cost: UPGRADE_COST, newPoints: (user.points ?? 0) - UPGRADE_COST };
  }

  // ─── Progress data ───────────────────────────────────────────────────────

  async getProgress(studentId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!user) throw new NotFoundException();

    const level = this.gamification.calculateLevel(user.experiencePoints);
    return {
      level,
      xp: user.experiencePoints,
      nextLevelXp: this.gamification.getNextLevelXp(level),
      currentLevelXp: this.gamification.getCurrentLevelXp(level),
      progress: this.gamification.getLevelProgress(user.experiencePoints, level),
    };
  }
}
