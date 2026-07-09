import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RankingGateway } from '../ranking/ranking.gateway';
import { NotificationsService } from '../notifications/notifications.service';
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
  // Welcome gifts — se desbloquean al elegir personaje y quedan en el buzón de XP
  { key: 'welcome',         name: 'Bienvenido al Reino',      icon: '🎁',  xpReward: 50,  category: 'welcome',  maxProgress: 1  },
  { key: 'first_character', name: 'Identidad Heroica',        icon: '🛡️',  xpReward: 75,  category: 'welcome',  maxProgress: 1  },
  { key: 'ready_adventure', name: 'Listo para la Aventura',   icon: '🚀',  xpReward: 25,  category: 'welcome',  maxProgress: 1  },
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
    private notifications: NotificationsService,
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
    const { leveledUp, oldLevel, newLevel, newXp } = await this.gainExperienceBatch(userId, [
      { points, action, description, classroomId },
    ]);
    return { leveledUp, oldLevel, newLevel, newXp };
  }

  // Single implementation of the XP engine: applies the character bonus per
  // item, updates the user once and writes one ExperienceLog row per item.
  async gainExperienceBatch(
    userId: string,
    items: { points: number; action: string; description?: string; classroomId?: string }[],
  ): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; newXp: number; earnedPoints: number }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const logs = items.map((item) => {
      // Apply character bonus (20% extra XP)
      const bonus =
        user.characterBonusType && this.shouldApplyCharacterBonus(user.characterBonusType, item.action);
      const multiplier = bonus ? 1.2 : 1.0;
      return {
        userId,
        points: Math.round(item.points * multiplier),
        action: item.action,
        description: item.description,
        classroomId: item.classroomId,
        multiplier,
      };
    });

    const earnedPoints = logs.reduce((sum, log) => sum + log.points, 0);
    const newXp = user.experiencePoints + earnedPoints;
    const oldLevel = user.level;
    const newLevel = this.calculateLevel(newXp);

    await this.prisma.user.update({
      where: { id: userId },
      data: { experiencePoints: newXp, level: newLevel },
    });

    await this.prisma.experienceLog.createMany({ data: logs });

    const leveledUp = newLevel > oldLevel;
    if (leveledUp) {
      await this.handleLevelUp(userId, oldLevel, newLevel);
    }

    return { leveledUp, oldLevel, newLevel, newXp, earnedPoints };
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

    try {
      const c = this.notifications.buildNotificationContent('level_up', { level: newLevel });
      await this.notifications.create(userId, { type: 'level_up', ...c });
    } catch { /* best-effort */ }
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

  // Regalos de bienvenida: logros ya completados que quedan como XP por
  // reclamar en el buzón del estudiante nuevo (150 XP → nivel 2 al canjear)
  async grantWelcomeGifts(userId: string) {
    await this.unlockAchievement(userId, 'welcome', 50);
    await this.unlockAchievement(userId, 'first_character', 75);
    await this.unlockAchievement(userId, 'ready_adventure', 25);
  }

  private async unlockAchievement(userId: string, key: string, xpReward: number) {
    const definition = ACHIEVEMENT_DEFINITIONS.find((a) => a.key === key);
    if (!definition) return;

    // Upsert: only mark complete if not already done
    const existing = await this.prisma.achievement.findUnique({
      where: { userId_key: { userId, key } },
    });

    if (existing?.isCompleted) return;

    // Mark achievement — XP stays pending in inbox until student claims it
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
        xpClaimed: false,
        unlockedAt: new Date(),
      },
      update: {
        progress: definition.maxProgress,
        isCompleted: true,
        xpClaimed: false,
        unlockedAt: new Date(),
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { achievementsCount: { increment: 1 } },
    });

    try {
      const c = this.notifications.buildNotificationContent('achievement', { name: definition.name });
      await this.notifications.create(userId, { type: 'achievement', ...c });
    } catch { /* best-effort */ }
  }

  // ─── XP Inbox ───────────────────────────────────────────────────────────

  async getXpInbox(studentId: string) {
    const [quests, behaviors, achievements] = await Promise.all([
      this.prisma.questStudent.findMany({
        where: { studentId, isCompleted: true, xpClaimed: false },
        include: { quest: { select: { title: true, xpReward: true, type: true } } },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.studentBehavior.findMany({
        where: { studentId, xpClaimed: false, xpAmount: { gt: 0 } },
        include: { behavior: { select: { name: true, icon: true, category: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.achievement.findMany({
        where: { userId: studentId, isCompleted: true, xpClaimed: false },
        orderBy: { unlockedAt: 'desc' },
      }),
    ]);

    const items = [
      ...quests.map((qs) => ({
        id: qs.id,
        type: 'quest' as const,
        label: qs.quest.title,
        icon: '🗡️',
        xp: qs.quest.xpReward,
        earnedAt: qs.completedAt,
      })),
      ...behaviors.map((sb) => ({
        id: sb.id,
        type: 'behavior' as const,
        label: sb.behavior.name,
        icon: sb.behavior.icon ?? '⭐',
        xp: sb.xpAmount,
        earnedAt: sb.createdAt,
      })),
      ...achievements.map((a) => ({
        id: a.id,
        type: 'achievement' as const,
        label: a.name,
        icon: a.icon ?? '🏆',
        xp: a.xpReward,
        earnedAt: a.unlockedAt ?? a.createdAt,
      })),
    ].sort((a, b) => new Date(b.earnedAt ?? 0).getTime() - new Date(a.earnedAt ?? 0).getTime());

    const totalPending = items.reduce((sum, i) => sum + i.xp, 0);
    return { items, totalPending };
  }

  async claimXp(studentId: string, claims: { type: 'quest' | 'behavior' | 'achievement'; id: string }[]) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: studentId } });
    const oldLevel = user.level;
    const emptyResult = { totalXpClaimed: 0, leveledUp: false, oldLevel, newLevel: oldLevel, newXp: user.experiencePoints };

    const questIds = claims.filter((c) => c.type === 'quest').map((c) => c.id);
    const behaviorIds = claims.filter((c) => c.type === 'behavior').map((c) => c.id);
    const achievementIds = claims.filter((c) => c.type === 'achievement').map((c) => c.id);

    const [quests, behaviors, achievements] = await Promise.all([
      questIds.length
        ? this.prisma.questStudent.findMany({
            where: { id: { in: questIds }, studentId, isCompleted: true, xpClaimed: false },
            include: { quest: { select: { title: true, xpReward: true, type: true, classroomId: true } } },
          })
        : [],
      behaviorIds.length
        ? this.prisma.studentBehavior.findMany({
            where: { id: { in: behaviorIds }, studentId, xpClaimed: false, xpAmount: { gt: 0 } },
            include: { behavior: { select: { name: true, category: true } } },
          })
        : [],
      achievementIds.length
        ? this.prisma.achievement.findMany({
            where: { id: { in: achievementIds }, userId: studentId, isCompleted: true, xpClaimed: false },
          })
        : [],
    ]);

    // Each item keeps its original action type and classroom so the character
    // bonus and per-classroom XP history behave exactly as an immediate award.
    type PendingClaim = {
      xp: { points: number; action: string; description: string; classroomId?: string };
      mark: () => Promise<{ count: number }>;
      revert: () => Promise<unknown>;
    };
    const candidates: PendingClaim[] = [
      ...quests.map((qs) => ({
        xp: {
          points: qs.quest.xpReward,
          action: qs.quest.type ?? 'quest',
          description: `Misión completada: ${qs.quest.title}`,
          classroomId: qs.quest.classroomId,
        },
        mark: () => this.prisma.questStudent.updateMany({ where: { id: qs.id, xpClaimed: false }, data: { xpClaimed: true } }),
        revert: () => this.prisma.questStudent.update({ where: { id: qs.id }, data: { xpClaimed: false } }),
      })),
      ...behaviors.map((sb) => ({
        xp: {
          points: sb.xpAmount,
          action: sb.behavior.category as string,
          description: `Comportamiento: ${sb.behavior.name}`,
          classroomId: sb.classroomId,
        },
        mark: () => this.prisma.studentBehavior.updateMany({ where: { id: sb.id, xpClaimed: false }, data: { xpClaimed: true } }),
        revert: () => this.prisma.studentBehavior.update({ where: { id: sb.id }, data: { xpClaimed: false } }),
      })),
      ...achievements.map((a) => ({
        xp: {
          points: a.xpReward,
          action: 'achievement',
          description: `Logro desbloqueado: ${a.name}`,
        },
        mark: () => this.prisma.achievement.updateMany({ where: { id: a.id, xpClaimed: false }, data: { xpClaimed: true } }),
        revert: () => this.prisma.achievement.update({ where: { id: a.id }, data: { xpClaimed: false } }),
      })),
    ];

    // Per-item guarded mark: a concurrent claim of the same item sees count 0
    // and drops it, so the XP can never be paid twice.
    const markResults = await Promise.all(candidates.map((c) => c.mark()));
    const claimed = candidates.filter((_, i) => markResults[i].count > 0);
    if (claimed.length === 0) return emptyResult;

    try {
      const result = await this.gainExperienceBatch(studentId, claimed.map((c) => c.xp));
      return {
        totalXpClaimed: result.earnedPoints,
        leveledUp: result.leveledUp,
        oldLevel,
        newLevel: result.newLevel,
        newXp: result.newXp,
      };
    } catch (err) {
      // Un-mark the items so the XP is not lost when granting fails
      await Promise.all(claimed.map((c) => c.revert().catch(() => undefined)));
      throw err;
    }
  }

  async claimAllXp(studentId: string) {
    const { items } = await this.getXpInbox(studentId);
    if (items.length === 0) return { totalXpClaimed: 0, leveledUp: false, oldLevel: 0, newLevel: 0, newXp: 0 };
    return this.claimXp(studentId, items.map(({ type, id }) => ({ type, id })));
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

    await this.rankingGateway
      .emitRankingUpdate(classroomId)
      .catch((err) => console.error('classroom ranking emit failed', err));

    await this.rankingGateway
      .emitGlobalRankingUpdate()
      .catch((err) => console.error('global ranking emit failed', err));
  }
}
