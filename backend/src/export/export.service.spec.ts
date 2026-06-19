import { ExportService } from './export.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExportService — pure row mappers', () => {
  let svc: ExportService;
  beforeEach(() => { svc = new ExportService({} as PrismaService); });

  describe('buildClassroomRankingRows', () => {
    it('une estudiante con sus puntos y ordena por puntos desc', () => {
      const students = [
        { id: 'a', name: 'Ana', level: 2, experiencePoints: 150, characterType: 'mago' },
        { id: 'b', name: 'Beto', level: 3, experiencePoints: 400, characterType: null },
      ];
      const points = [{ studentId: 'a', totalPoints: 100 }, { studentId: 'b', totalPoints: 300 }];
      const rows = svc.buildClassroomRankingRows(students, points);
      expect(rows).toEqual([
        { Estudiante: 'Beto', Personaje: '—', Nivel: 3, XP: 400, 'Puntos de aula': 300 },
        { Estudiante: 'Ana', Personaje: 'mago', Nivel: 2, XP: 150, 'Puntos de aula': 100 },
      ]);
    });

    it('usa 0 puntos cuando el estudiante no tiene registro de StudentPoint', () => {
      const rows = svc.buildClassroomRankingRows(
        [{ id: 'a', name: 'Ana', level: 1, experiencePoints: 0, characterType: null }],
        [],
      );
      expect(rows[0]['Puntos de aula']).toBe(0);
    });
  });

  describe('buildClassroomBehaviorRows', () => {
    it('mapea totales y conteo por estudiante, 0 si no hay stats', () => {
      const students = [{ id: 'a', name: 'Ana', level: 1, experiencePoints: 0, characterType: null }];
      const stats = [{ studentId: 'a', _sum: { pointsAwarded: 45 }, _count: { id: 3 } }];
      expect(svc.buildClassroomBehaviorRows(students, stats)).toEqual([
        { Estudiante: 'Ana', 'Puntos por comportamiento': 45, 'Nº de registros': 3 },
      ]);
      expect(svc.buildClassroomBehaviorRows(students, [])).toEqual([
        { Estudiante: 'Ana', 'Puntos por comportamiento': 0, 'Nº de registros': 0 },
      ]);
    });
  });

  describe('buildSummaryRows', () => {
    it('aplana las stats del dashboard en pares Métrica/Valor', () => {
      const stats = {
        totalTeachers: 2, totalStudents: 10, totalParents: 4, totalClassrooms: 3,
        activeClassrooms: 3, totalBehaviorsAwarded: 50, totalRewardsRedeemed: 7,
        monthly: { behaviorsAwarded: 12, rewards: 2, newStudents: 1, newTeachers: 0 },
      };
      const rows = svc.buildSummaryRows(stats);
      expect(rows).toContainEqual({ 'Métrica': 'Total estudiantes', 'Valor': 10 });
      expect(rows).toContainEqual({ 'Métrica': 'Comportamientos (último mes)', 'Valor': 12 });
    });
  });

  describe('buildStudentRows / buildTeacherRows / buildClassroomRows', () => {
    it('mapea estudiantes a columnas con Activo legible', () => {
      const rows = svc.buildStudentRows([
        { name: 'Ana', email: 'a@x.com', level: 2, experiencePoints: 150, points: 30, characterType: 'mago', isActive: true },
      ]);
      expect(rows).toEqual([
        { Nombre: 'Ana', Email: 'a@x.com', Nivel: 2, XP: 150, Puntos: 30, Personaje: 'mago', Activo: 'Sí' },
      ]);
    });

    it('mapea profesores con nº de aulas', () => {
      const rows = svc.buildTeacherRows([
        { name: 'Prof', email: 'p@x.com', isActive: false, _count: { taughtClassrooms: 4 } },
      ]);
      expect(rows).toEqual([{ Nombre: 'Prof', Email: 'p@x.com', 'Nº de aulas': 4, Activo: 'No' }]);
    });

    it('mapea aulas con docente y nº de estudiantes', () => {
      const rows = svc.buildClassroomRows([
        { name: 'Mate', subject: 'Matemáticas', classCode: 'ABC123', isActive: true,
          teacher: { name: 'Prof' }, _count: { students: 12 } },
      ]);
      expect(rows).toEqual([
        { Aula: 'Mate', Materia: 'Matemáticas', Docente: 'Prof', 'Código': 'ABC123', 'Nº de estudiantes': 12, Activa: 'Sí' },
      ]);
    });
  });
});
