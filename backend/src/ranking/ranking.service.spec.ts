import { RankingService } from './ranking.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RankingService.buildRanking', () => {
  let service: RankingService;
  beforeEach(() => {
    service = new RankingService({} as PrismaService);
  });

  const row = (studentId: string, name: string, totalPoints: number, level = 1, characterType: string | null = null) =>
    ({ studentId, name, totalPoints, level, characterType });

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
