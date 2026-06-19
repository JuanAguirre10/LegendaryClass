import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as XLSX from 'xlsx';
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

  async assertTeacherCanExport(classroomId: string, user: { id: string; role: string }): Promise<string> {
    const where =
      user.role === 'director' || user.role === 'admin'
        ? { id: classroomId }
        : { id: classroomId, teacherId: user.id };
    const classroom = await this.prisma.classroom.findFirst({ where, select: { slug: true } });
    if (!classroom) throw new ForbiddenException('No tienes acceso a esta aula');
    return classroom.slug;
  }

  async buildClassroomWorkbook(classroomId: string): Promise<Buffer> {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        students: { include: { student: { select: { id: true, name: true, level: true, experiencePoints: true, characterType: true } } } },
      },
    });
    const students = (classroom?.students ?? []).map((s) => s.student);
    const studentPoints = await this.prisma.studentPoint.findMany({
      where: { classroomId }, select: { studentId: true, totalPoints: true },
    });
    const behaviorStats = await this.prisma.studentBehavior.groupBy({
      by: ['studentId'], where: { classroomId }, _sum: { pointsAwarded: true }, _count: { id: true },
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.buildClassroomRankingRows(students, studentPoints)), 'Ranking');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.buildClassroomBehaviorRows(students, behaviorStats)), 'Comportamientos');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async buildInstitutionWorkbook(): Promise<Buffer> {
    const [students, teachers, classrooms] = await Promise.all([
      this.prisma.user.findMany({ where: { role: Role.student }, select: { name: true, email: true, level: true, experiencePoints: true, points: true, characterType: true, isActive: true }, orderBy: { name: 'asc' } }),
      this.prisma.user.findMany({ where: { role: Role.teacher }, select: { name: true, email: true, isActive: true, _count: { select: { taughtClassrooms: true } } }, orderBy: { name: 'asc' } }),
      this.prisma.classroom.findMany({ select: { name: true, subject: true, classCode: true, isActive: true, teacher: { select: { name: true } }, _count: { select: { students: true } } }, orderBy: { name: 'asc' } }),
    ]);
    const stats = await this.computeStats();

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.buildStudentRows(students)), 'Estudiantes');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.buildTeacherRows(teachers)), 'Profesores');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.buildClassroomRows(classrooms)), 'Aulas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.buildSummaryRows(stats)), 'Resumen');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private async computeStats(): Promise<DashboardStats> {
    const [totalTeachers, totalStudents, totalParents, totalClassrooms, activeClassrooms, totalBehaviorsAwarded, totalRewardsRedeemed] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.teacher } }),
      this.prisma.user.count({ where: { role: Role.student } }),
      this.prisma.user.count({ where: { role: Role.parent } }),
      this.prisma.classroom.count(),
      this.prisma.classroom.count({ where: { isActive: true } }),
      this.prisma.studentBehavior.count(),
      this.prisma.studentReward.count(),
    ]);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [behaviorsAwarded, rewards, newStudents, newTeachers] = await Promise.all([
      this.prisma.studentBehavior.count({ where: { createdAt: { gte: since } } }),
      this.prisma.studentReward.count({ where: { createdAt: { gte: since } } }),
      this.prisma.user.count({ where: { role: Role.student, createdAt: { gte: since } } }),
      this.prisma.user.count({ where: { role: Role.teacher, createdAt: { gte: since } } }),
    ]);
    return { totalTeachers, totalStudents, totalParents, totalClassrooms, activeClassrooms, totalBehaviorsAwarded, totalRewardsRedeemed, monthly: { behaviorsAwarded, rewards, newStudents, newTeachers } };
  }
}
