import { Test } from '@nestjs/testing';
import { TemplatesService } from './templates.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ActivityType, Difficulty, TemplateStatus } from '@prisma/client';

const mockPrisma = {
  homeworkTemplate: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  exerciseTemplate: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  formTemplate:     { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  examTemplate:     { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
};
const mockNotifications = { buildNotificationContent: jest.fn().mockReturnValue({ title: 't', message: 'm' }), create: jest.fn() };

describe('TemplatesService', () => {
  let service: TemplatesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = module.get(TemplatesService);
    jest.clearAllMocks();
  });

  it('director-created template is auto-approved', async () => {
    mockPrisma.homeworkTemplate.create.mockResolvedValue({ id: 't1', status: 'approved' });
    await service.create('course1', 'user1', 'director', {
      activityType: ActivityType.homework,
      title: 'T1',
      difficulty: Difficulty.easy,
      instructions: 'Do it',
    });
    expect(mockPrisma.homeworkTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: TemplateStatus.approved }) }),
    );
  });

  it('teacher-created template is pending', async () => {
    mockPrisma.homeworkTemplate.create.mockResolvedValue({ id: 't2', status: 'pending' });
    await service.create('course1', 'user2', 'teacher', {
      activityType: ActivityType.homework,
      title: 'T2',
      difficulty: Difficulty.easy,
      instructions: 'Do it',
    });
    expect(mockPrisma.homeworkTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: TemplateStatus.pending }) }),
    );
  });

  it('review rejects invalid transition (already approved)', async () => {
    mockPrisma.homeworkTemplate.findUnique.mockResolvedValue({ id: 't1', status: 'approved', authorId: 'a1' });
    await expect(
      service.review('t1', ActivityType.homework, 'dir1', true),
    ).rejects.toThrow(BadRequestException);
  });
});
