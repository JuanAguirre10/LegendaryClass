import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.course.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            homeworkTemplates: true,
            exerciseTemplates: true,
            formTemplates: true,
            examTemplates: true,
          },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  create(dto: CreateCourseDto) {
    return this.prisma.course.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateCourseDto>) {
    await this.findOne(id);
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    await this.prisma.course.update({ where: { id }, data: { isActive: false } });
    return { message: 'Curso desactivado' };
  }

  private async findOne(id: string) {
    const c = await this.prisma.course.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Curso no encontrado');
    return c;
  }
}
