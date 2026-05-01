import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParentService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(parentId: string) {
    const parentChildren = await this.prisma.parentChild.findMany({
      where: { parentId },
      include: {
        child: {
          select: {
            id: true, name: true, level: true, experiencePoints: true,
            points: true, characterType: true, avatar: true, loginStreak: true,
            questsCompleted: true, achievementsCount: true,
          },
        },
      },
    });

    return { children: parentChildren.map((pc) => pc.child) };
  }

  async getChildProgress(parentId: string, childId: string) {
    await this.verifyParentAccess(parentId, childId);

    const child = await this.prisma.user.findUnique({
      where: { id: childId },
      include: {
        achievements: { where: { isCompleted: true } },
        studentPoints: { include: { classroom: { select: { id: true, name: true } } } },
      },
    });
    if (!child) throw new NotFoundException('Hijo no encontrado');

    const recentBehaviors = await this.prisma.studentBehavior.findMany({
      where: { studentId: childId },
      include: { behavior: true, classroom: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
      take: 20,
    });

    return { child: { ...child, password: undefined }, recentBehaviors };
  }

  async linkChild(parentId: string, childEmail: string) {
    const child = await this.prisma.user.findUnique({ where: { email: childEmail } });
    if (!child) throw new NotFoundException('No se encontró ningún estudiante con ese email');
    if (child.role !== 'student') throw new ForbiddenException('El usuario no es un estudiante');

    const existing = await this.prisma.parentChild.findUnique({
      where: { parentId_childId: { parentId, childId: child.id } },
    });
    if (existing) throw new ConflictException('Ya estás vinculado con este estudiante');

    await this.prisma.parentChild.create({
      data: { parentId, childId: child.id },
    });

    return { message: `Vinculado con ${child.name}`, child: { id: child.id, name: child.name } };
  }

  async unlinkChild(parentId: string, childId: string) {
    const link = await this.prisma.parentChild.findUnique({
      where: { parentId_childId: { parentId, childId } },
    });
    if (!link) throw new NotFoundException('No estás vinculado con este estudiante');
    await this.prisma.parentChild.delete({ where: { id: link.id } });
    return { message: 'Vinculación eliminada' };
  }

  private async verifyParentAccess(parentId: string, childId: string) {
    const link = await this.prisma.parentChild.findUnique({
      where: { parentId_childId: { parentId, childId } },
    });
    if (!link) throw new ForbiddenException('No tienes acceso a este estudiante');
  }
}
