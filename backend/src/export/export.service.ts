import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface StudentInfo {
  id: string;
  name: string;
  level: number;
  experiencePoints: number;
  characterType: string | null;
}

export interface PointRow {
  studentId: string;
  totalPoints: number;
}

export interface BehaviorStat {
  studentId: string;
  _sum: { pointsAwarded: number | null };
  _count: { id: number };
}

export interface DashboardStats {
  totalTeachers: number;
  totalStudents: number;
  totalParents: number;
  totalClassrooms: number;
  activeClassrooms: number;
  totalBehaviorsAwarded: number;
  totalRewardsRedeemed: number;
  monthly: {
    behaviorsAwarded: number;
    rewards: number;
    newStudents: number;
    newTeachers: number;
  };
}

export interface RankingRow {
  Estudiante: string;
  Personaje: string;
  Nivel: number;
  XP: number;
  'Puntos de aula': number;
}

export interface BehaviorRow {
  Estudiante: string;
  'Puntos por comportamiento': number;
  'Nº de registros': number;
}

export interface StudentSheetRow {
  Nombre: string;
  Email: string;
  Nivel: number;
  XP: number;
  Puntos: number;
  Personaje: string;
  Activo: string;
}

export interface TeacherSheetRow {
  Nombre: string;
  Email: string;
  'Nº de aulas': number;
  Activo: string;
}

export interface ClassroomSheetRow {
  Aula: string;
  Materia: string;
  Docente: string;
  'Código': string;
  'Nº de estudiantes': number;
  Activa: string;
}

export interface SummaryRow {
  'Métrica': string;
  'Valor': number;
}

const yesNo = (b: boolean) => (b ? 'Sí' : 'No');

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  buildClassroomRankingRows(students: StudentInfo[], studentPoints: PointRow[]): RankingRow[] {
    const pointsById = new Map(studentPoints.map((p) => [p.studentId, p.totalPoints]));
    return students
      .map((s) => ({
        Estudiante: s.name,
        Personaje: s.characterType ?? '—',
        Nivel: s.level,
        XP: s.experiencePoints,
        'Puntos de aula': pointsById.get(s.id) ?? 0,
      }))
      .sort((a, b) => b['Puntos de aula'] - a['Puntos de aula']);
  }

  buildClassroomBehaviorRows(students: StudentInfo[], behaviorStats: BehaviorStat[]): BehaviorRow[] {
    const byId = new Map(behaviorStats.map((x) => [x.studentId, x]));
    return students.map((s) => {
      const stat = byId.get(s.id);
      return {
        Estudiante: s.name,
        'Puntos por comportamiento': stat?._sum.pointsAwarded ?? 0,
        'Nº de registros': stat?._count.id ?? 0,
      };
    });
  }

  buildStudentRows(
    users: {
      name: string;
      email: string;
      level: number;
      experiencePoints: number;
      points: number;
      characterType: string | null;
      isActive: boolean;
    }[],
  ): StudentSheetRow[] {
    return users.map((u) => ({
      Nombre: u.name,
      Email: u.email,
      Nivel: u.level,
      XP: u.experiencePoints,
      Puntos: u.points,
      Personaje: u.characterType ?? '—',
      Activo: yesNo(u.isActive),
    }));
  }

  buildTeacherRows(
    users: {
      name: string;
      email: string;
      isActive: boolean;
      _count: { taughtClassrooms: number };
    }[],
  ): TeacherSheetRow[] {
    return users.map((u) => ({
      Nombre: u.name,
      Email: u.email,
      'Nº de aulas': u._count.taughtClassrooms,
      Activo: yesNo(u.isActive),
    }));
  }

  buildClassroomRows(
    classrooms: {
      name: string;
      subject: string | null;
      classCode: string;
      isActive: boolean;
      teacher: { name: string } | null;
      _count: { students: number };
    }[],
  ): ClassroomSheetRow[] {
    return classrooms.map((c) => ({
      Aula: c.name,
      Materia: c.subject ?? '—',
      Docente: c.teacher?.name ?? '—',
      'Código': c.classCode,
      'Nº de estudiantes': c._count.students,
      Activa: yesNo(c.isActive),
    }));
  }

  buildSummaryRows(stats: DashboardStats): SummaryRow[] {
    return [
      { 'Métrica': 'Total profesores', 'Valor': stats.totalTeachers },
      { 'Métrica': 'Total estudiantes', 'Valor': stats.totalStudents },
      { 'Métrica': 'Total padres', 'Valor': stats.totalParents },
      { 'Métrica': 'Total aulas', 'Valor': stats.totalClassrooms },
      { 'Métrica': 'Aulas activas', 'Valor': stats.activeClassrooms },
      { 'Métrica': 'Comportamientos asignados (total)', 'Valor': stats.totalBehaviorsAwarded },
      { 'Métrica': 'Canjes de recompensa (total)', 'Valor': stats.totalRewardsRedeemed },
      { 'Métrica': 'Comportamientos (último mes)', 'Valor': stats.monthly.behaviorsAwarded },
      { 'Métrica': 'Canjes (último mes)', 'Valor': stats.monthly.rewards },
      { 'Métrica': 'Estudiantes nuevos (último mes)', 'Valor': stats.monthly.newStudents },
      { 'Métrica': 'Profesores nuevos (último mes)', 'Valor': stats.monthly.newTeachers },
    ];
  }
}
