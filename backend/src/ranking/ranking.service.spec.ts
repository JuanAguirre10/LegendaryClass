import { RankingService, RankingInput } from './ranking.service';
import { PrismaService } from '../prisma/prisma.service';

// Helper: creates a minimal RankingInput
const row = (
  studentId: string,
  name: string,
  totalPoints: number,
  level = 1,
  characterType: string | null = null,
): RankingInput => ({
  studentId, name, totalPoints, level, characterType,
  avatar: null, weeklyXpDelta: 0, streakDays: 0,
});

describe('RankingService.buildRanking', () => {
  let service: RankingService;
  beforeEach(() => { service = new RankingService({} as PrismaService); });

  it('ordena por puntos descendente y asigna rank 1..N', () => {
    const result = service.buildRanking([row('a', 'Ana', 100), row('b', 'Beto', 300), row('c', 'Cris', 200)]);
    expect(result.map((r) => r.studentId)).toEqual(['b', 'c', 'a']);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('desempata por level descendente cuando hay igual puntaje', () => {
    const result = service.buildRanking([row('a', 'Ana', 200, 2), row('b', 'Beto', 200, 5)]);
    expect(result.map((r) => r.studentId)).toEqual(['b', 'a']);
  });

  it('desempata por nombre A-Z cuando puntaje y level son iguales', () => {
    const result = service.buildRanking([row('z', 'Zoe', 200, 3), row('a', 'Ana', 200, 3)]);
    expect(result.map((r) => r.name)).toEqual(['Ana', 'Zoe']);
  });

  it('devuelve lista vacía para entrada vacía', () => {
    expect(service.buildRanking([])).toEqual([]);
  });
});

describe('RankingService.assertCanView', () => {
  it('permite a director sin tocar la BD', async () => {
    const svc = new RankingService({} as any);
    await expect(svc.assertCanView('c1', { id: 'd', role: 'director' })).resolves.toBeUndefined();
  });

  it('permite al profesor dueño del aula', async () => {
    const prisma: any = { classroom: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) } };
    const svc = new RankingService(prisma);
    await expect(svc.assertCanView('c1', { id: 't', role: 'teacher' })).resolves.toBeUndefined();
  });

  it('rechaza al profesor que NO es dueño del aula', async () => {
    const prisma: any = { classroom: { findFirst: jest.fn().mockResolvedValue(null) } };
    const svc = new RankingService(prisma);
    await expect(svc.assertCanView('c1', { id: 't', role: 'teacher' })).rejects.toThrow();
  });

  it('permite al alumno matriculado', async () => {
    const enrolled: any = { classroomStudent: { findUnique: jest.fn().mockResolvedValue({ id: 'e1' }) } };
    await expect(new RankingService(enrolled).assertCanView('c1', { id: 's', role: 'student' })).resolves.toBeUndefined();
  });

  it('rechaza al alumno no matriculado', async () => {
    const notEnrolled: any = { classroomStudent: { findUnique: jest.fn().mockResolvedValue(null) } };
    await expect(new RankingService(notEnrolled).assertCanView('c1', { id: 's', role: 'student' })).rejects.toThrow();
  });
});

describe('RankingService.currentWeekStart', () => {
  it('devuelve el lunes anterior a las 00:00 UTC', () => {
    const svc = new RankingService({} as PrismaService);
    // Wednesday 2026-06-24 → Monday 2026-06-22
    const wednesday = new Date('2026-06-24T15:00:00Z');
    const result = (svc as any).currentWeekStart(wednesday);
    expect(result.toISOString()).toBe('2026-06-22T00:00:00.000Z');
  });

  it('un lunes devuelve ese mismo lunes', () => {
    const svc = new RankingService({} as PrismaService);
    const monday = new Date('2026-06-22T08:00:00Z');
    const result = (svc as any).currentWeekStart(monday);
    expect(result.toISOString()).toBe('2026-06-22T00:00:00.000Z');
  });
});

describe('RankingService.takeWeeklySnapshot', () => {
  it('hace upsert idempotente — segunda llamada no crea duplicados', async () => {
    const upsertMock = jest.fn().mockResolvedValue({});
    const prisma: any = { rankingSnapshot: { upsert: upsertMock } };
    const svc = new RankingService(prisma);
    const entries = [
      { ...row('s1', 'Ana', 300, 3), rank: 1, rankChange: null },
      { ...row('s2', 'Beto', 200, 2), rank: 2, rankChange: null },
    ];
    await svc.takeWeeklySnapshot('classroom_1', entries);
    await svc.takeWeeklySnapshot('classroom_1', entries);
    // 2 students × 2 calls = 4 upsert calls total
    expect(upsertMock).toHaveBeenCalledTimes(4);
  });
});

describe('RankingService.getGlobalRanking', () => {
  it('director ve todos los estudiantes', async () => {
    const prisma: any = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 's1', name: 'Ana', avatar: null, characterType: null, experiencePoints: 500, level: 3, loginStreak: 5 },
          { id: 's2', name: 'Beto', avatar: null, characterType: null, experiencePoints: 300, level: 2, loginStreak: 2 },
        ]),
      },
      experienceLog: { groupBy: jest.fn().mockResolvedValue([]) },
      rankingSnapshot: { findMany: jest.fn().mockResolvedValue([]) , upsert: jest.fn().mockResolvedValue({}) },
    };
    const svc = new RankingService(prisma);
    const result = await svc.getGlobalRanking({ id: 'd1', role: 'director' });
    expect(result).toHaveLength(2);
    expect(result[0].studentId).toBe('s1');
    expect(result[0].rank).toBe(1);
    // Director query must NOT filter by studentId
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ id: expect.anything() }) })
    );
  });

  it('teacher solo ve estudiantes de sus salones', async () => {
    const prisma: any = {
      classroom: { findMany: jest.fn().mockResolvedValue([{ id: 'c1' }]) },
      classroomStudent: { findMany: jest.fn().mockResolvedValue([{ studentId: 's1' }]) },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 's1', name: 'Ana', avatar: null, characterType: null, experiencePoints: 500, level: 3, loginStreak: 5 },
        ]),
      },
      experienceLog: { groupBy: jest.fn().mockResolvedValue([]) },
      rankingSnapshot: { findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn().mockResolvedValue({}) },
    };
    const svc = new RankingService(prisma);
    const result = await svc.getGlobalRanking({ id: 't1', role: 'teacher' });
    expect(result).toHaveLength(1);
    // Teacher query must filter by studentId list
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ['s1'] } }) })
    );
  });
});
