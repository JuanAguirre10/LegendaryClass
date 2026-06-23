import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RankingInput {
  studentId:     string;
  name:          string;
  avatar:        string | null;
  characterType: string | null;
  level:         number;
  totalPoints:   number;
  weeklyXpDelta: number;
  streakDays:    number;
}

export interface RankingEntry extends RankingInput {
  rank:       number;
  rankChange: number | null; // positive = moved up, negative = moved down, null = no snapshot
}

@Injectable()
export class RankingService {
  constructor(private prisma: PrismaService) {}

  // ─── Pure sort + rank — no DB calls ─────────────────────────────────────

  buildRanking(rows: RankingInput[]): RankingEntry[] {
    return [...rows]
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.level !== a.level) return b.level - a.level;
        return a.name.localeCompare(b.name);
      })
      .map((row, i) => ({ ...row, rank: i + 1, rankChange: null }));
  }

  // ─── Access guard ────────────────────────────────────────────────────────

  async assertCanView(classroomId: string, user: { id: string; role: string }): Promise<void> {
    if (user.role === 'director' || user.role === 'admin') return;
    if (user.role === 'teacher') {
      const owned = await this.prisma.classroom.findFirst({
        where: { id: classroomId, teacherId: user.id },
        select: { id: true },
      });
      if (owned) return;
    }
    if (user.role === 'student') {
      const enrolled = await this.prisma.classroomStudent.findUnique({
        where: { classroomId_studentId: { classroomId, studentId: user.id } },
        select: { id: true },
      });
      if (enrolled) return;
    }
    throw new ForbiddenException('No tienes acceso al ranking de esta aula');
  }

  // ─── Classroom ranking (used by REST endpoint + gateway) ─────────────────

  async getClassroomRanking(classroomId: string, user: { id: string; role: string }): Promise<RankingEntry[]> {
    await this.assertCanView(classroomId, user);
    return this.computeRanking(classroomId);
  }

  async computeRanking(classroomId: string): Promise<RankingEntry[]> {
    const [points, weeklyXpMap, snapshotMap] = await Promise.all([
      this.prisma.studentPoint.findMany({
        where: { classroomId },
        include: {
          student: { select: { id: true, name: true, avatar: true, characterType: true } },
        },
      }),
      this.getWeeklyXpMap(classroomId),
      this.getSnapshotMap(classroomId),
    ]);

    const rows: RankingInput[] = points.map((p) => ({
      studentId:     p.studentId,
      name:          p.student.name,
      avatar:        p.student.avatar ?? null,
      characterType: p.student.characterType ?? null,
      level:         p.level,
      totalPoints:   p.totalPoints,
      weeklyXpDelta: weeklyXpMap.get(p.studentId) ?? 0,
      streakDays:    p.streakDays,
    }));

    const ranked = this.buildRanking(rows);
    const withChange = this.applyRankChange(ranked, snapshotMap);

    if (snapshotMap.size === 0) {
      await this.takeWeeklySnapshot(classroomId, ranked);
    }

    return withChange;
  }

  // ─── Global ranking ──────────────────────────────────────────────────────

  async getGlobalRanking(requestingUser: { id: string; role: string }): Promise<RankingEntry[]> {
    let studentIdFilter: string[] | undefined;

    if (requestingUser.role === 'teacher') {
      const classrooms = await this.prisma.classroom.findMany({
        where: { teacherId: requestingUser.id },
        select: { id: true },
      });
      const enrollments = await this.prisma.classroomStudent.findMany({
        where: { classroomId: { in: classrooms.map((c) => c.id) } },
        select: { studentId: true },
      });
      studentIdFilter = [...new Set(enrollments.map((e) => e.studentId))];
    }

    const [users, weeklyXpMap, snapshotMap] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          role: 'student',
          ...(studentIdFilter ? { id: { in: studentIdFilter } } : {}),
        },
        select: {
          id: true, name: true, avatar: true, characterType: true,
          experiencePoints: true, level: true, loginStreak: true,
        },
        orderBy: { experiencePoints: 'desc' },
      }),
      this.getGlobalWeeklyXpMap(studentIdFilter),
      this.getSnapshotMap('global'),
    ]);

    const rows: RankingInput[] = users.map((u) => ({
      studentId:     u.id,
      name:          u.name,
      avatar:        u.avatar ?? null,
      characterType: u.characterType ?? null,
      level:         u.level,
      totalPoints:   u.experiencePoints,
      weeklyXpDelta: weeklyXpMap.get(u.id) ?? 0,
      streakDays:    u.loginStreak,
    }));

    const ranked = this.buildRanking(rows);
    const withChange = this.applyRankChange(ranked, snapshotMap);

    if (snapshotMap.size === 0) {
      await this.takeWeeklySnapshot('global', ranked);
    }

    return withChange;
  }

  // ─── Snapshot management ─────────────────────────────────────────────────

  async takeWeeklySnapshot(scope: string, entries: RankingEntry[]): Promise<void> {
    const weekStart = this.currentWeekStart();
    await Promise.all(
      entries.map((e) =>
        this.prisma.rankingSnapshot.upsert({
          where: { studentId_scope_weekStart: { studentId: e.studentId, scope, weekStart } },
          create: { studentId: e.studentId, scope, rank: e.rank, points: e.totalPoints, weekStart },
          update: { rank: e.rank, points: e.totalPoints },
        }),
      ),
    );
  }

  async takeSnapshotForScope(scope: string): Promise<void> {
    if (scope === 'global') {
      const ranking = await this.getGlobalRanking({ id: '', role: 'director' });
      await this.takeWeeklySnapshot('global', ranking);
    } else {
      const ranking = await this.computeRanking(scope);
      await this.takeWeeklySnapshot(scope, ranking);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async getWeeklyXpMap(classroomId: string): Promise<Map<string, number>> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.experienceLog.groupBy({
      by: ['userId'],
      where: { classroomId, createdAt: { gte: since } },
      _sum: { points: true },
    });
    return new Map(rows.map((r) => [r.userId, r._sum.points ?? 0]));
  }

  private async getGlobalWeeklyXpMap(studentIds?: string[]): Promise<Map<string, number>> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.experienceLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: since },
        ...(studentIds ? { userId: { in: studentIds } } : {}),
      },
      _sum: { points: true },
    });
    return new Map(rows.map((r) => [r.userId, r._sum.points ?? 0]));
  }

  private async getSnapshotMap(scope: string): Promise<Map<string, number>> {
    const weekStart = this.currentWeekStart();
    const snaps = await this.prisma.rankingSnapshot.findMany({
      where: { scope, weekStart },
      select: { studentId: true, rank: true },
    });
    return new Map(snaps.map((s) => [s.studentId, s.rank]));
  }

  private applyRankChange(ranked: RankingEntry[], snapshotMap: Map<string, number>): RankingEntry[] {
    if (snapshotMap.size === 0) return ranked;
    return ranked.map((r) => ({
      ...r,
      rankChange: snapshotMap.has(r.studentId)
        ? snapshotMap.get(r.studentId)! - r.rank
        : null,
    }));
  }

  currentWeekStart(from: Date = new Date()): Date {
    const day = from.getUTCDay(); // 0=Sun, 1=Mon...
    const daysToMonday = day === 0 ? -6 : 1 - day;
    return new Date(Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate() + daysToMonday,
    ));
  }
}
