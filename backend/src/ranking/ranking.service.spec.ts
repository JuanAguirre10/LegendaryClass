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
