import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(teacherId: string) {
    const classrooms = await this.prisma.classroom.findMany({
      where: { teacherId },
      include: { _count: { select: { students: true } } },
    });

    const classroomIds = classrooms.map((c) => c.id);

    const [recentBehaviors, pendingRewards] = await Promise.all([
      this.prisma.studentBehavior.findMany({
        where: { classroomId: { in: classroomIds } },
        include: {
          student: { select: { id: true, name: true } },
          behavior: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.studentReward.findMany({
        where: { classroomId: { in: classroomIds }, status: 'pending' },
        include: {
          student: { select: { id: true, name: true } },
          reward: { select: { name: true } },
        },
        take: 10,
      }),
    ]);

    return { classrooms, recentBehaviors, pendingRewards };
  }

  async getClassroomReport(classroomId: string, teacherId: string) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, teacherId },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true, name: true, level: true, experiencePoints: true,
                characterType: true,
              },
            },
          },
        },
      },
    });

    const studentPoints = await this.prisma.studentPoint.findMany({
      where: { classroomId },
      orderBy: { totalPoints: 'desc' },
    });

    const behaviorStats = await this.prisma.studentBehavior.groupBy({
      by: ['studentId'],
      where: { classroomId },
      _sum: { pointsAwarded: true },
      _count: { id: true },
    });

    return { classroom, studentPoints, behaviorStats };
  }
}
