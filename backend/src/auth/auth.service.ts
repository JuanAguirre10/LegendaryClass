import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El email ya está registrado');

    const hashed = await bcrypt.hash(dto.password, 10);
    const role = dto.role ?? Role.student;

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        role,
        // Initial gamification values
        experiencePoints: 0,
        level: 1,
        points: 100,
        achievementsCount: 0,
        questsCompleted: 0,
        positivePoints: 0,
        negativePoints: 0,
        rewardsEarned: 0,
        loginStreak: 0,
        strength: 10,
        intelligence: 10,
        agility: 10,
        creativity: 10,
        leadership: 10,
        resilience: 10,
        firstCharacterSelection: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        level: true,
        experiencePoints: true,
        points: true,
        firstCharacterSelection: true,
        createdAt: true,
      },
    });

    const token = this.signToken(user.id, user.email, user.role);
    return { user, token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');
    if (!user.isActive) throw new UnauthorizedException('Tu cuenta está desactivada');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = this.signToken(user.id, user.email, user.role);
    const { password: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  private signToken(userId: string, email: string, role: Role): string {
    return this.jwtService.sign({ sub: userId, email, role });
  }
}
