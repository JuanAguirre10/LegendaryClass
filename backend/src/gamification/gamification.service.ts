import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RankingGateway } from '../ranking/ranking.gateway';
import { CharacterBonusType, CharacterType } from '@prisma/client';

// ─── Character definitions ─────────────────────────────────────────────────

export const CHARACTER_INFO: Record<
  CharacterType,
  { icon: string; name: string; bonusType: CharacterBonusType; description: string; bonusActions: string[] }
> = {
  mago: {
    icon: '🧙‍♂️',
    name: 'Mago',
    bonusType: CharacterBonusType.knowledge,
    description: 'Domina el conocimiento y la sabiduría arcana',
    bonusActions: ['homework', 'quiz', 'reading', 'study'],
  },
  guerrero: {
    icon: '⚔️',
    name: 'Guerrero',
    bonusType: CharacterBonusType.strength,
    description: 'Enfrenta los retos con fuerza y perseverancia',
    bonusActions: ['project', 'challenge', 'persistence', 'effort'],
  },
  ninja: {
    icon: '🥷',
    name: 'Ninja',
    bonusType: CharacterBonusType.agility,
    description: 'Actúa con velocidad y precisión en todo momento',
    bonusActions: ['participation', 'quick_response', 'active'],
  },
  arquero: {
    icon: '🏹',
    name: 'Arquero',
    bonusType: CharacterBonusType.precision,
    description: 'Encuentra la respuesta exacta con enfoque y detalle',
    bonusActions: ['accuracy', 'detail', 'careful', 'perfect'],
  },
  lanzador: {
    icon: '🎯',
    name: 'Lanzador',
    bonusType: CharacterBonusType.creativity,
    description: 'Innova y crea soluciones únicas con creatividad',
    bonusActions: ['creative', 'art', 'innovation', 'original'],
  },
};

// ─── Stat multipliers by bonus type ───────────────────────────────────────

const STAT_MULTIPLIERS: Record<CharacterBonusType, Partial<Record<string, number>>> = {
  knowledge:  { intelligence: 1.5 },
  strength:   { strength: 1.5, resilience: 1.2 },
  agility:    { agility: 1.5 },
  precision:  { intelligence: 1.2, agility: 1.2 },
  creativity: { creativity: 1.5, intelligence: 1.2 },
};

// ─── Achievement definitions ───────────────────────────────────────────────

export const ACHIEVEMENT_DEFINITIONS = [
  // Quest achievements
  { key: 'first_quest',   name: 'Primera Aventura',           icon: '🗡️',  xpReward: 25,  category: 'quests',   maxProgress: 1  },
  { key: 'quest_5',       name: 'Aventurero Comprometido',    icon: '🎯',  xpReward: 50,  category: 'quests',   maxProgress: 5  },
  { key: 'quest_master',  name: 'Maestro de Misiones',        icon: '🏆',  xpReward: 100, category: 'quests',   maxProgress: 10 },
  // Level achievements
  { key: 'level_5',       name: 'Aventurero Experimentado',   icon: '⭐',  xpReward: 75,  category: 'levels',   maxProgress: 1  },
  { key: 'level_10',      name: 'Héroe Veterano',             icon: '🌟',  xpReward: 150, category: 'levels',   maxProgress: 1  },
  { key: 'level_25',      name: 'Leyenda Ascendente',         icon: '👑',  xpReward: 250, category: 'levels',   maxProgress: 1  },
  { key: 'level_50',      name: 'Héroe Épico',                icon: '💫',  xpReward: 500, category: 'levels',   maxProgress: 1  },
  { key: 'level_75',      name: 'Leyenda Legendaria',         icon: '💎',  xpReward: 1000,category: 'levels',   maxProgress: 1  },
  // Points achievements
  { key: 'first_hundred', name: 'Primer Centenar',            icon: '💯',  xpReward: 20,  category: 'points',   maxProgress: 1  },
  { key: 'five_hundred',  name: 'Club de los 500',            icon: '🔥',  xpReward: 50,  category: 'points',   maxProgress: 1  },
  { key: 'thousand_club', name: 'Maestro de Puntos',          icon: '🎖️',  xpReward: 100, category: 'points',   maxProgress: 1  },
  // Streak achievements
  { key: 'week_warrior',  name: 'Guerrero Semanal',           icon: '📅',  xpReward: 75,  category: 'streaks',  maxProgress: 1  },
  { key: 'month_champ',   name: 'Campeón del Mes',            icon: '🗓️',  xpReward: 150, category: 'streaks',  maxProgress: 1  },
];

@Injectable()
export class GamificationService {
  constructor(
    private prisma: PrismaService,
    private rankingGateway: RankingGateway,
  ) {}

  // ─── XP & Level formulas ────────────────────────────────────────────────

  calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  getNextLevelXp(level: number): number {
    return level * level * 100;
  }

  getCurrentLevelXp(level: number): number {
    return (level - 1) * (level - 1) * 100;
  }

  getLevelProgress(xp: number, level: number): number {
    const current = this.getCurrentLevelXp(level);
    const next = this.getNextLevelXp(level);
    return Math.round(((xp - current) / (next - current)) * 100);
  }

  // ─── Character bonus ────────────────────────────────────────────────────

  shouldApplyCharacterBonus(bonusType: CharacterBonusType, actionType: string): boolean {
    const actions = STAT_MULTIPLIERS[bonusType];
    // We reuse ACHIEVEMENT_DEFINITIONS bonus actions via CHARACTER_INFO
    const entry = Object.values(CHARACTER_INFO).find((c) => c.bonusType === bonusType);
    return entry ? entry.bonusActions.includes(actionType) : false;
  }

  // ─── Gain experience ────────────────────────────────────────────────────

  async gainExperience(
    userId: string,
    points: number,
    action: string,
    description?: string,
    classroomId?: string,
  ): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; newXp: number }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Apply character bonus (20% extra XP)
    let multiplier = 1.0;
    if (user.characterBonusType && this.shouldApplyCharacterBonus(user.characterBonusType, action)) {
      multiplier = 1.2;
    }

    const earnedPoints = Math.round(points * multiplier);
    const newXp = user.experiencePoints + earnedPoints;
    const oldLevel = user.level;
    const newLevel = this.calculateLevel(newXp);

    await this.prisma.user.update({
      where: { id: userId },
      data: { experiencePoints: newXp, level: newLevel },
    });

    await this.prisma.experienceLog.create({
      data: {
        userId,
        points: earnedPoints,
        action,
        description,
        classroomId,
        multiplier,
      },
    });

    const leveledUp = newLevel > oldLevel;
    if (leveledUp) {
      await this.handleLevelUp(userId, oldLevel, newLevel);
    }

    return { leveledUp, oldLevel, newLevel, newXp };
  }

  // ─── Level up handler ───────────────────────────────────────────────────

  private async handleLevelUp(userId: string, oldLevel: number, newLevel: number) {
    // Bonus XP for leveling up: 10 * new level
    const bonusXp = 10 * newLevel;
    await this.prisma.user.update({
      where: { id: userId },
      data: { experiencePoints: { increment: bonusXp } },
    });

    await this.checkLevelAchievements(userId, newLevel);
  }

  // ─── Achievement checks ─────────────────────────────────────────────────

  async checkLevelAchievements(userId: string, level: number) {
    const milestones: Record<number, { key: string; xp: number }> = {
      5:  { key: 'level_5',  xp: 75  },
      10: { key: 'level_10', xp: 150 },
      25: { key: 'level_25', xp: 250 },
      50: { key: 'level_50', xp: 500 },
      75: { key: 'level_75', xp: 1000},
    };

    if (milestones[level]) {
      await this.unlockAchievement(userId, milestones[level].key, milestones[level].xp);
    }
  }

  async checkQuestAchievements(userId: string, questsCompleted: number) {
    if (questsCompleted === 1)  await this.unlockAchievement(userId, 'first_quest',  25);
    if (questsCompleted === 5)  await this.unlockAchievement(userId, 'quest_5',      50);
    if (questsCompleted === 10) await this.unlockAchievement(userId, 'quest_master', 100);
  }

  async checkPointAchievements(userId: string, totalPoints: number) {
    if (totalPoints >= 100)  await this.unlockAchievement(userId, 'first_hundred', 20);
    if (totalPoints >= 500)  await this.unlockAchievement(userId, 'five_hundred',  50);
    if (totalPoints >= 1000) await this.unlockAchievement(userId, 'thousand_club', 100);
  }

  async checkStreakAchievements(userId: string, streakDays: number) {
    if (streakDays >= 7)  await this.unlockAchievement(userId, 'week_warrior', 75);
    if (streakDays >= 30) await this.unlockAchievement(userId, 'month_champ',  150);
  }

  private async unlockAchievement(userId: string, key: string, xpReward: number) {
    const definition = ACHIEVEMENT_DEFINITIONS.find((a) => a.key === key);
    if (!definition) return;

    // Upsert: only mark complete if not already done
    const existing = await this.prisma.achievement.findUnique({
      where: { userId_key: { userId, key } },
    });

    if (existing?.isCompleted) return;

    await this.prisma.achievement.upsert({
      where: { userId_key: { userId, key } },
      create: {
        userId,
        key,
        name: definition.name,
        icon: definition.icon,
        xpReward,
        category: definition.category,
        maxProgress: definition.maxProgress,
        progress: definition.maxProgress,
        isCompleted: true,
        unlockedAt: new Date(),
      },
      update: {
        progress: definition.maxProgress,
        isCompleted: true,
        unlockedAt: new Date(),
      },
    });

    // Award XP for unlocking achievement
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        achievementsCount: { increment: 1 },
        experiencePoints: { increment: xpReward },
      },
    });
  }

  // ─── Character stats calculation ────────────────────────────────────────

  calculateStat(statType: string, level: number, bonusType: CharacterBonusType | null): number {
    const base = 10 + level * 2;
    const tier = this.getTier(level);
    const tierBonus = [0, 0, 25, 50, 100][tier];
    const multiplier = bonusType ? (STAT_MULTIPLIERS[bonusType]?.[statType] ?? 1.0) : 1.0;
    return Math.round(base * multiplier + tierBonus);
  }

  getTier(level: number): number {
    if (level >= 75) return 4;
    if (level >= 50) return 3;
    if (level >= 25) return 2;
    return 1;
  }

  getTierName(tier: number): string {
    return ['', 'Novato', 'Veterano', 'Épico', 'Legendario'][tier];
  }

  // ─── Classroom points ────────────────────────────────────────────────────

  async updateStudentPoints(
    studentId: string,
    classroomId: string,
    pointsDelta: number,
  ): Promise<void> {
    const record = await this.prisma.studentPoint.findUnique({
      where: { studentId_classroomId: { studentId, classroomId } },
    });

    const currentTotal = record?.totalPoints ?? 0;
    // Points cannot go below 0
    const newTotal = Math.max(0, currentTotal + pointsDelta);
    const newLevel = Math.floor(newTotal / 100) + 1;

    // Streak logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastActivity = record?.lastActivity;
    let streakDays = record?.streakDays ?? 0;

    if (pointsDelta > 0) {
      if (!lastActivity) {
        streakDays = 1;
      } else {
        const lastDate = new Date(lastActivity);
        lastDate.setHours(0, 0, 0, 0);
        if (lastDate.getTime() === today.getTime()) {
          // same day — no change
        } else if (lastDate.getTime() === yesterday.getTime()) {
          streakDays += 1;
        } else {
          streakDays = 1;
        }
      }
    }

    await this.prisma.studentPoint.upsert({
      where: { studentId_classroomId: { studentId, classroomId } },
      create: {
        studentId,
        classroomId,
        totalPoints: newTotal,
        level: newLevel,
        streakDays: pointsDelta > 0 ? 1 : 0,
        lastActivity: new Date(),
      },
      update: {
        totalPoints: newTotal,
        level: newLevel,
        streakDays,
        lastActivity: pointsDelta > 0 ? new Date() : record?.lastActivity,
      },
    });

    // Mirror to user global points
    await this.prisma.user.update({
      where: { id: studentId },
      data: {
        points: { increment: pointsDelta },
        positivePoints: pointsDelta > 0 ? { increment: pointsDelta } : undefined,
        negativePoints: pointsDelta < 0 ? { increment: Math.abs(pointsDelta) } : undefined,
      },
    });

    await this.checkPointAchievements(studentId, newTotal);
    await this.checkStreakAchievements(studentId, streakDays);

    await this.rankingGateway.emitRankingUpdate(classroomId);
  }
}
