import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, avatar: true,
        isActive: true, characterType: true, characterBonusType: true,
        level: true, experiencePoints: true, points: true,
        strength: true, intelligence: true, agility: true,
        creativity: true, leadership: true, resilience: true,
        loginStreak: true, questsCompleted: true, achievementsCount: true,
        firstCharacterSelection: true, gradeLevel: true, phone: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: string, data: { name?: string; avatar?: string; gradeLevel?: string; phone?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updatePassword(id: string, hashedPassword: string) {
    return this.prisma.user.update({ where: { id }, data: { password: hashedPassword } });
  }

  async delete(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Cuenta eliminada' };
  }
}
