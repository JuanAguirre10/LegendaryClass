import { QuestsService } from './quests.service';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

const makeService = (prismaOverrides: any = {}) =>
  new QuestsService(
    prismaOverrides as PrismaService,
    {} as GamificationService,
    {} as NotificationsService,
  );

const fakeFile = { filename: 'uuid-abc', originalname: 'foto.jpg' } as Express.Multer.File;

describe('QuestsService.submitEvidence', () => {
  it('lanza BadRequest si la quest no requiere evidencia', async () => {
    const prisma: any = {
      quest: { findUnique: jest.fn().mockResolvedValue({ id: 'q1', requiresSubmission: false, status: 'active', dueDate: null, teacherId: 't1', classroomId: 'c1' }) },
    };
    await expect(makeService(prisma).submitEvidence('q1', 's1', fakeFile)).rejects.toThrow(BadRequestException);
  });

  it('lanza Forbidden cuando se han agotado los intentos', async () => {
    const prisma: any = {
      quest: { findUnique: jest.fn().mockResolvedValue({ id: 'q1', requiresSubmission: true, maxAttempts: 2, status: 'active', dueDate: null, teacherId: 't1', classroomId: 'c1', title: 'Test' }) },
      questSubmission: {
        count: jest.fn().mockResolvedValue(2),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    await expect(makeService(prisma).submitEvidence('q1', 's1', fakeFile)).rejects.toThrow(ForbiddenException);
  });

  it('lanza BadRequest si ya hay una entrega pendiente', async () => {
    const prisma: any = {
      quest: { findUnique: jest.fn().mockResolvedValue({ id: 'q1', requiresSubmission: true, maxAttempts: 3, status: 'active', dueDate: null, teacherId: 't1', classroomId: 'c1', title: 'Test' }) },
      questSubmission: {
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue({ id: 'sub1', status: 'pending' }),
        create: jest.fn(),
      },
    };
    await expect(makeService(prisma).submitEvidence('q1', 's1', fakeFile)).rejects.toThrow(BadRequestException);
  });

  it('crea la entrega con attemptNumber = intentos_previos + 1', async () => {
    const createMock = jest.fn().mockResolvedValue({ id: 'sub1' });
    const notifCreate = jest.fn().mockResolvedValue({});
    const prisma: any = {
      quest: { findUnique: jest.fn().mockResolvedValue({ id: 'q1', requiresSubmission: true, maxAttempts: 3, status: 'active', dueDate: null, teacherId: 't1', classroomId: 'c1', title: 'Test' }) },
      questSubmission: { count: jest.fn().mockResolvedValue(1), findFirst: jest.fn().mockResolvedValue(null), create: createMock },
    };
    const notif: any = { create: notifCreate };
    const svc = new QuestsService(prisma as PrismaService, {} as GamificationService, notif);
    await svc.submitEvidence('q1', 's1', fakeFile);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ attemptNumber: 2 }) }),
    );
  });
});

describe('QuestsService.approveSubmission', () => {
  it('establece status approved y llama a complete()', async () => {
    const updateMock = jest.fn().mockResolvedValue({});
    const notifCreate = jest.fn().mockResolvedValue({});
    const prisma: any = {
      questSubmission: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'sub1', status: 'pending', questId: 'q1', studentId: 's1',
          quest: { id: 'q1', xpReward: 50, title: 'T', classroomId: 'c1', teacherId: 't1' },
        }),
        update: updateMock,
      },
      classroom: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
    };
    const svc = new QuestsService(prisma as PrismaService, {} as GamificationService, { create: notifCreate } as any);
    const completeSpy = jest.spyOn(svc, 'complete').mockResolvedValue({} as any);
    await svc.approveSubmission('sub1', 't1', {});
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'approved' }) }),
    );
    expect(completeSpy).toHaveBeenCalledWith('q1', 's1');
  });
});

describe('QuestsService.rejectSubmission', () => {
  it('establece status rejected y NO llama a complete()', async () => {
    const updateMock = jest.fn().mockResolvedValue({});
    const notifCreate = jest.fn().mockResolvedValue({});
    const prisma: any = {
      questSubmission: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'sub1', status: 'pending', questId: 'q1', studentId: 's1',
          quest: { id: 'q1', title: 'T', classroomId: 'c1', teacherId: 't1' },
        }),
        update: updateMock,
      },
      classroom: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
    };
    const svc = new QuestsService(prisma as PrismaService, {} as GamificationService, { create: notifCreate } as any);
    const completeSpy = jest.spyOn(svc, 'complete').mockResolvedValue({} as any);
    await svc.rejectSubmission('sub1', 't1', { teacherNotes: 'Falta más detalle' });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'rejected', teacherNotes: 'Falta más detalle' }) }),
    );
    expect(completeSpy).not.toHaveBeenCalled();
  });
});
