import { Test } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  course: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('CoursesService', () => {
  let service: CoursesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(CoursesService);
    jest.clearAllMocks();
  });

  it('findAll returns active courses', async () => {
    mockPrisma.course.findMany.mockResolvedValue([{ id: '1', name: 'Álgebra' }]);
    const result = await service.findAll();
    expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
    expect(result).toHaveLength(1);
  });

  it('deactivate throws if course not found', async () => {
    mockPrisma.course.findUnique.mockResolvedValue(null);
    await expect(service.deactivate('bad-id')).rejects.toThrow(NotFoundException);
  });
});
