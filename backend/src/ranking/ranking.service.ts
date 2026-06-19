import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RankingInput {
  studentId: string;
  name: string;
  characterType: string | null;
  level: number;
  totalPoints: number;
}

export interface RankingEntry extends RankingInput {
  rank: number;
}

@Injectable()
export class RankingService {
  constructor(private prisma: PrismaService) {}

  buildRanking(rows: RankingInput[]): RankingEntry[] {
    return [...rows]
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.level !== a.level) return b.level - a.level;
        return a.name.localeCompare(b.name);
      })
      .map((row, i) => ({ ...row, rank: i + 1 }));
  }

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

  async getClassroomRanking(classroomId: string, user: { id: string; role: string }): Promise<RankingEntry[]> {
    await this.assertCanView(classroomId, user);
    return this.computeRanking(classroomId);
  }

  // Recalcula desde BD; usado por el endpoint REST y por el gateway tras un cambio de puntos.
  async computeRanking(classroomId: string): Promise<RankingEntry[]> {
    const points = await this.prisma.studentPoint.findMany({
      where: { classroomId },
      include: { student: { select: { id: true, name: true, characterType: true } } },
    });
    const rows = points.map((p) => ({
      studentId: p.studentId,
      name: p.student.name,
      characterType: p.student.characterType ?? null,
      level: p.level,
      totalPoints: p.totalPoints,
    }));
    return this.buildRanking(rows);
  }
}
