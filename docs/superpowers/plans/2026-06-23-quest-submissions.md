# Quest Submissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an evidence submission and teacher-approval workflow to quests so students upload a file, teachers approve or reject it, and XP is awarded only on approval.

**Architecture:** Backend extends the existing `QuestsService` and `QuestsController` with five new endpoints and a new `QuestSubmission` Prisma model. Files land on disk under `uploads/submissions/` (already served as static by `main.ts`). The frontend adds a submission modal to the existing student quests page and a new teacher submissions-inbox page.

**Tech Stack:** NestJS + Prisma + PostgreSQL (backend); Angular 18 standalone + TailwindCSS (frontend); Multer for file handling (already installed via `@nestjs/platform-express`).

## Global Constraints

- Angular 18 standalone components — no NgModules
- All new routes use lazy `loadComponent`
- Every new HTML element must carry `dark:` Tailwind variants
- No `[class.dark:*]` bindings — use `[ngClass]` for conditional dark-mode classes
- New `@Body()` params must use DTO classes with `class-validator`, not inline types
- Allowed submission file types: image/jpeg, image/png, image/gif, image/webp, application/pdf
- Max file size: 10 MB per upload
- `QuestStudent.isCompleted` is set by the existing `complete()` helper; `approveSubmission()` calls it — never duplicate XP award logic
- Notifications use `NotificationsService.create()` — inject via `NotificationsModule` in `QuestsModule`
- `SubmissionStatus` enum values (Prisma + TypeScript): `pending`, `approved`, `rejected`
- Do NOT add Co-Authored-By to commits — attribute solely to JuanAguirre10

---

### Task 1: Prisma — QuestSubmission model + schema extensions

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Produces: `QuestSubmission` Prisma model, `SubmissionStatus` enum, `quest_submission` / `quest_approved` / `quest_rejected` `NotificationType` values — all used by Tasks 2–3

- [ ] **Step 1: Add new values to `NotificationType` enum**

In `backend/prisma/schema.prisma`, find the `NotificationType` enum (around line 90):

```prisma
enum NotificationType {
  level_up
  achievement
  reward_status
  reward_pending
  template_review
}
```

Replace with:

```prisma
enum NotificationType {
  level_up
  achievement
  reward_status
  reward_pending
  template_review
  quest_submission
  quest_approved
  quest_rejected
}
```

- [ ] **Step 2: Add `requiresSubmission` and `maxAttempts` to the `Quest` model**

In the `Quest` model, find the `status` field line and add the two new fields directly after it:

```prisma
  requiresSubmission Boolean  @default(false)
  maxAttempts        Int      @default(1)
```

Also add the relation field at the bottom of the `Quest` model (after the existing `students` relation):

```prisma
  submissions QuestSubmission[]
```

- [ ] **Step 3: Add `questSubmissions` relation to the `User` model**

In the `User` model, after the `notifications` relation field, add:

```prisma
  questSubmissions QuestSubmission[]
```

- [ ] **Step 4: Add `SubmissionStatus` enum and `QuestSubmission` model**

At the end of `schema.prisma`, after the last model, add:

```prisma
// ─── QuestSubmission ──────────────────────────────────────────────────────────

enum SubmissionStatus {
  pending
  approved
  rejected
}

model QuestSubmission {
  id            String           @id @default(cuid())
  questId       String
  studentId     String
  fileUrl       String
  fileName      String
  status        SubmissionStatus @default(pending)
  attemptNumber Int
  teacherNotes  String?
  submittedAt   DateTime         @default(now())
  reviewedAt    DateTime?

  quest   Quest @relation(fields: [questId],   references: [id], onDelete: Cascade)
  student User  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([questId, studentId, attemptNumber])
  @@index([questId])
  @@index([studentId])
  @@map("quest_submissions")
}
```

- [ ] **Step 5: Run migration**

```bash
cd backend
npm run db:migrate
# When prompted for migration name, enter: add_quest_submissions
```

Expected: migration applied, no errors.

- [ ] **Step 6: Regenerate Prisma client**

```bash
npm run db:generate
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(quests): add QuestSubmission model and SubmissionStatus enum"
```

---

### Task 2: Backend — submission upload helper + QuestsService new methods (TDD)

**Files:**
- Create: `backend/src/common/upload/submission-upload.ts`
- Modify: `backend/src/quests/quests.service.ts`
- Modify: `backend/src/quests/quests.module.ts`
- Modify: `backend/src/notifications/notifications.service.ts`
- Create: `backend/src/quests/quests.service.spec.ts`

**Interfaces:**
- Consumes: `QuestSubmission` Prisma model (Task 1), `NotificationsService.create()`
- Produces:
  - `QuestsService.submitEvidence(questId, studentId, file): Promise<QuestSubmission>`
  - `QuestsService.getPendingSubmissions(teacherId): Promise<QuestSubmission[]>`
  - `QuestsService.getQuestSubmissions(questId, teacherId): Promise<QuestSubmission[]>`
  - `QuestsService.approveSubmission(subId, teacherId, dto): Promise<void>`
  - `QuestsService.rejectSubmission(subId, teacherId, dto): Promise<void>`
  - `QuestsService.findForStudent` — extended to include `latestSubmission: QuestSubmission | null`

- [ ] **Step 1: Create `submission-upload.ts`**

Create `backend/src/common/upload/submission-upload.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { UPLOADS_ROOT } from './avatar-upload';

export const SUBMISSIONS_DIR = join(UPLOADS_ROOT, 'submissions');

if (!existsSync(SUBMISSIONS_DIR)) mkdirSync(SUBMISSIONS_DIR, { recursive: true });

const ALLOWED_SUBMISSION_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
];

export function submissionFileFilter(
  _req: unknown,
  file: { mimetype: string },
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (ALLOWED_SUBMISSION_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Tipo de archivo no permitido (solo imágenes y PDF)'), false);
  }
}

export const multerSubmissionOptions = {
  storage: diskStorage({
    destination: SUBMISSIONS_DIR,
    filename: (_req: unknown, _file: unknown, cb: (e: Error | null, name: string) => void) =>
      cb(null, randomUUID()),
  }),
  fileFilter: submissionFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
};
```

- [ ] **Step 2: Write failing tests**

Create `backend/src/quests/quests.service.spec.ts`:

```typescript
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
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd backend
npm test -- quests.service
```

Expected: tests fail with "Cannot find module" or "QuestsService constructor does not accept 3 arguments".

- [ ] **Step 4: Update `NotificationsService.buildNotificationContent` to handle new types**

In `backend/src/notifications/notifications.service.ts`, find the `default:` case in `buildNotificationContent` and add the three new cases before it:

```typescript
      case 'quest_submission':
        return {
          title: '📎 Nueva entrega',
          message: `${data.studentName} entregó evidencia para "${data.questTitle}"`,
          link: '/teacher/quest-submissions',
        };
      case 'quest_approved':
        return {
          title: '✅ Entrega aprobada',
          message: `Tu entrega para "${data.questTitle}" fue aprobada. +${data.xpReward} XP`,
          link: '/student/quests',
        };
      case 'quest_rejected':
        return {
          title: '❌ Entrega rechazada',
          message: `Tu entrega para "${data.questTitle}" fue rechazada: ${data.teacherNotes}`,
          link: '/student/quests',
        };
```

- [ ] **Step 5: Replace `quests.service.ts` with the full extended implementation**

Replace the entire content of `backend/src/quests/quests.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateQuestDto } from './dto/create-quest.dto';
import { ApproveSubmissionDto, RejectSubmissionDto } from './dto/quest-submission.dto';
import { QuestStatus } from '@prisma/client';

@Injectable()
export class QuestsService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
    private notifications: NotificationsService,
  ) {}

  async create(teacherId: string, dto: CreateQuestDto) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso sobre esta aula');

    const quest = await this.prisma.quest.create({
      data: {
        title: dto.title,
        description: dto.description,
        xpReward: dto.xpReward ?? 50,
        type: dto.type,
        classroomId: dto.classroomId,
        teacherId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        requiresSubmission: dto.requiresSubmission ?? false,
        maxAttempts: dto.maxAttempts ?? 1,
      },
    });

    const studentIds = dto.studentIds?.length
      ? dto.studentIds
      : (
          await this.prisma.classroomStudent.findMany({
            where: { classroomId: dto.classroomId },
            select: { studentId: true },
          })
        ).map((e) => e.studentId);

    if (studentIds.length > 0) {
      await this.prisma.questStudent.createMany({
        data: studentIds.map((studentId) => ({ questId: quest.id, studentId })),
        skipDuplicates: true,
      });
    }

    return quest;
  }

  async findByClassroom(classroomId: string) {
    return this.prisma.quest.findMany({
      where: { classroomId },
      include: {
        _count: { select: { students: true } },
        students: { where: { isCompleted: true }, select: { studentId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findForStudent(studentId: string, classroomId?: string) {
    const quests = await this.prisma.quest.findMany({
      where: {
        status: QuestStatus.active,
        students: { some: { studentId } },
        ...(classroomId ? { classroomId } : {}),
      },
      include: {
        students: { where: { studentId }, select: { isCompleted: true, completedAt: true } },
      },
    });

    const submissionQuestIds = quests.filter((q) => q.requiresSubmission).map((q) => q.id);
    if (submissionQuestIds.length === 0) return quests;

    const submissions = await this.prisma.questSubmission.findMany({
      where: { questId: { in: submissionQuestIds }, studentId },
      orderBy: { attemptNumber: 'desc' },
    });

    const latestMap = new Map<string, (typeof submissions)[0]>();
    for (const sub of submissions) {
      if (!latestMap.has(sub.questId)) latestMap.set(sub.questId, sub);
    }

    return quests.map((q) => ({ ...q, latestSubmission: latestMap.get(q.id) ?? null }));
  }

  async complete(questId: string, studentId: string) {
    const qs = await this.prisma.questStudent.findUnique({
      where: { questId_studentId: { questId, studentId } },
      include: { quest: true },
    });
    if (!qs) throw new NotFoundException('Quest no encontrada o no asignada');
    if (qs.isCompleted) throw new BadRequestException('Ya completaste esta quest');
    if (qs.quest.status !== QuestStatus.active) throw new BadRequestException('Esta quest ya no está activa');

    await this.prisma.questStudent.update({
      where: { questId_studentId: { questId, studentId } },
      data: { isCompleted: true, completedAt: new Date() },
    });

    const result = await this.gamification.gainExperience(
      studentId,
      qs.quest.xpReward,
      qs.quest.type ?? 'quest',
      `Quest completada: ${qs.quest.title}`,
      qs.quest.classroomId,
    );

    const user = await this.prisma.user.update({
      where: { id: studentId },
      data: { questsCompleted: { increment: 1 } },
    });

    await this.gamification.checkQuestAchievements(studentId, user.questsCompleted);

    return { message: 'Quest completada', xpEarned: qs.quest.xpReward, ...result };
  }

  async delete(id: string, teacherId: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id } });
    if (!quest) throw new NotFoundException('Quest no encontrada');
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: quest.classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso');
    await this.prisma.quest.delete({ where: { id } });
    return { message: 'Quest eliminada' };
  }

  // ─── Submission flow ────────────────────────────────────────────────────────

  async submitEvidence(questId: string, studentId: string, file: Express.Multer.File) {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
      select: { requiresSubmission: true, maxAttempts: true, status: true, dueDate: true, teacherId: true, classroomId: true, title: true },
    });
    if (!quest) throw new NotFoundException('Quest no encontrada');
    if (!quest.requiresSubmission) throw new BadRequestException('Esta quest no requiere entrega de evidencia');
    if (quest.status !== QuestStatus.active) throw new BadRequestException('Esta quest ya no está activa');
    if (quest.dueDate && quest.dueDate < new Date()) throw new BadRequestException('El plazo de entrega ha vencido');

    const attemptCount = await this.prisma.questSubmission.count({ where: { questId, studentId } });
    if (attemptCount >= quest.maxAttempts) throw new ForbiddenException('Sin intentos restantes');

    const pending = await this.prisma.questSubmission.findFirst({
      where: { questId, studentId, status: 'pending' },
    });
    if (pending) throw new BadRequestException('Ya tienes una entrega pendiente de revisión para esta misión');

    const submission = await this.prisma.questSubmission.create({
      data: {
        questId,
        studentId,
        fileUrl: `/uploads/submissions/${file.filename}`,
        fileName: file.originalname,
        attemptNumber: attemptCount + 1,
      },
    });

    await this.notifications.create(quest.teacherId, {
      type: 'quest_submission',
      title: '📎 Nueva entrega',
      message: `Un estudiante entregó evidencia para "${quest.title}"`,
      link: '/teacher/quest-submissions',
    });

    return submission;
  }

  async getPendingSubmissions(teacherId: string) {
    const classrooms = await this.prisma.classroom.findMany({
      where: { teacherId },
      select: { id: true },
    });
    return this.prisma.questSubmission.findMany({
      where: {
        status: 'pending',
        quest: { classroomId: { in: classrooms.map((c) => c.id) } },
      },
      include: {
        quest: { select: { id: true, title: true, classroomId: true, xpReward: true } },
        student: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async getQuestSubmissions(questId: string, teacherId: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId }, select: { classroomId: true } });
    if (!quest) throw new NotFoundException('Quest no encontrada');
    const classroom = await this.prisma.classroom.findFirst({ where: { id: quest.classroomId, teacherId } });
    if (!classroom) throw new ForbiddenException('No tienes permiso');
    return this.prisma.questSubmission.findMany({
      where: { questId },
      include: { student: { select: { id: true, name: true, avatar: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  private async loadAndVerifySubmission(subId: string, teacherId: string) {
    const sub = await this.prisma.questSubmission.findUnique({
      where: { id: subId },
      include: { quest: { select: { id: true, title: true, xpReward: true, classroomId: true, teacherId: true } } },
    });
    if (!sub) throw new NotFoundException('Entrega no encontrada');
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: sub.quest.classroomId, teacherId },
    });
    if (!classroom) throw new ForbiddenException('No tienes permiso');
    return sub;
  }

  async approveSubmission(subId: string, teacherId: string, dto: ApproveSubmissionDto) {
    const sub = await this.loadAndVerifySubmission(subId, teacherId);
    await this.prisma.questSubmission.update({
      where: { id: subId },
      data: { status: 'approved', teacherNotes: dto.teacherNotes ?? null, reviewedAt: new Date() },
    });
    await this.complete(sub.questId, sub.studentId);
    await this.notifications.create(sub.studentId, {
      type: 'quest_approved',
      title: '✅ Entrega aprobada',
      message: `Tu entrega para "${sub.quest.title}" fue aprobada. +${sub.quest.xpReward} XP`,
      link: '/student/quests',
    });
  }

  async rejectSubmission(subId: string, teacherId: string, dto: RejectSubmissionDto) {
    const sub = await this.loadAndVerifySubmission(subId, teacherId);
    await this.prisma.questSubmission.update({
      where: { id: subId },
      data: { status: 'rejected', teacherNotes: dto.teacherNotes, reviewedAt: new Date() },
    });
    await this.notifications.create(sub.studentId, {
      type: 'quest_rejected',
      title: '❌ Entrega rechazada',
      message: `Tu entrega para "${sub.quest.title}" fue rechazada: ${dto.teacherNotes}`,
      link: '/student/quests',
    });
  }
}
```

- [ ] **Step 6: Update `quests.module.ts` to import `NotificationsModule`**

Replace the entire content of `backend/src/quests/quests.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { QuestsService } from './quests.service';
import { QuestsController } from './quests.controller';
import { GamificationModule } from '../gamification/gamification.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [GamificationModule, NotificationsModule],
  providers: [QuestsService],
  controllers: [QuestsController],
})
export class QuestsModule {}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd backend
npm test -- quests.service
```

Expected: all tests PASS (10 tests total).

- [ ] **Step 8: Commit**

```bash
git add backend/src/common/upload/submission-upload.ts \
        backend/src/quests/quests.service.ts \
        backend/src/quests/quests.service.spec.ts \
        backend/src/quests/quests.module.ts \
        backend/src/notifications/notifications.service.ts
git commit -m "feat(quests): add submitEvidence, approveSubmission, rejectSubmission to QuestsService"
```

---

### Task 3: Backend — DTOs + Controller new endpoints

**Files:**
- Create: `backend/src/quests/dto/quest-submission.dto.ts`
- Modify: `backend/src/quests/dto/create-quest.dto.ts`
- Modify: `backend/src/quests/quests.controller.ts`

**Interfaces:**
- Consumes: all five new `QuestsService` methods (Task 2)
- Produces:
  - `POST /api/v1/quests/:id/submit` (student, multipart/form-data)
  - `GET /api/v1/quests/submissions/pending` (teacher)
  - `GET /api/v1/quests/:id/submissions` (teacher)
  - `PATCH /api/v1/quests/submissions/:subId/approve` (teacher)
  - `PATCH /api/v1/quests/submissions/:subId/reject` (teacher)

- [ ] **Step 1: Create `quest-submission.dto.ts`**

Create `backend/src/quests/dto/quest-submission.dto.ts`:

```typescript
import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class ApproveSubmissionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherNotes?: string;
}

export class RejectSubmissionDto {
  @ApiProperty({ description: 'Feedback obligatorio al rechazar' })
  @IsString()
  @MinLength(1)
  teacherNotes!: string;
}
```

- [ ] **Step 2: Extend `create-quest.dto.ts`**

In `backend/src/quests/dto/create-quest.dto.ts`, add the following two fields at the end of the class (before the closing `}`):

```typescript
  @ApiPropertyOptional({ description: 'Si true, el alumno debe subir evidencia para completar la misión' })
  @IsOptional()
  @IsBoolean()
  requiresSubmission?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, default: 1, description: 'Intentos permitidos (solo si requiresSubmission = true)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;
```

Also add `IsBoolean` to the imports from `class-validator` at the top of the file.

- [ ] **Step 3: Replace `quests.controller.ts`**

Replace the entire content of `backend/src/quests/quests.controller.ts`:

```typescript
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QuestsService } from './quests.service';
import { CreateQuestDto } from './dto/create-quest.dto';
import { ApproveSubmissionDto, RejectSubmissionDto } from './dto/quest-submission.dto';
import { multerSubmissionOptions } from '../common/upload/submission-upload';

@ApiTags('Quests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quests')
export class QuestsController {
  constructor(private questsService: QuestsService) {}

  @Post()
  @Roles(Role.teacher)
  create(@CurrentUser() user: any, @Body() dto: CreateQuestDto) {
    return this.questsService.create(user.id, dto);
  }

  @Get('classroom/:classroomId')
  @Roles(Role.teacher)
  findByClassroom(@Param('classroomId') classroomId: string) {
    return this.questsService.findByClassroom(classroomId);
  }

  @Get('my-quests')
  @Roles(Role.student)
  myQuests(@CurrentUser() user: any, @Query('classroomId') classroomId?: string) {
    return this.questsService.findForStudent(user.id, classroomId);
  }

  @Post(':id/complete')
  @Roles(Role.student)
  complete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.questsService.complete(id, user.id);
  }

  @Delete(':id')
  @Roles(Role.teacher)
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.questsService.delete(id, user.id);
  }

  // ─── Submission endpoints ─────────────────────────────────────────────────

  @Post(':id/submit')
  @Roles(Role.student)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', multerSubmissionOptions))
  submitEvidence(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.questsService.submitEvidence(id, user.id, file);
  }

  // IMPORTANT: this route must be declared BEFORE /:id/submissions to avoid
  // NestJS treating "submissions" as the :id parameter value.
  @Get('submissions/pending')
  @Roles(Role.teacher)
  getPendingSubmissions(@CurrentUser() user: any) {
    return this.questsService.getPendingSubmissions(user.id);
  }

  @Get(':id/submissions')
  @Roles(Role.teacher)
  getQuestSubmissions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.questsService.getQuestSubmissions(id, user.id);
  }

  @Patch('submissions/:subId/approve')
  @Roles(Role.teacher)
  approveSubmission(
    @Param('subId') subId: string,
    @CurrentUser() user: any,
    @Body() dto: ApproveSubmissionDto,
  ) {
    return this.questsService.approveSubmission(subId, user.id, dto);
  }

  @Patch('submissions/:subId/reject')
  @Roles(Role.teacher)
  rejectSubmission(
    @Param('subId') subId: string,
    @CurrentUser() user: any,
    @Body() dto: RejectSubmissionDto,
  ) {
    return this.questsService.rejectSubmission(subId, user.id, dto);
  }
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/quests/dto/quest-submission.dto.ts \
        backend/src/quests/dto/create-quest.dto.ts \
        backend/src/quests/quests.controller.ts
git commit -m "feat(quests): add submission endpoints to QuestsController"
```

---

### Task 4: Frontend — StudentQuestsComponent submission modal + status display

**Files:**
- Modify: `frontend/src/app/features/student/quests/student-quests.component.ts`
- Modify: `frontend/src/app/features/student/quests/student-quests.component.html`

**Interfaces:**
- Consumes: `POST /api/v1/quests/:id/submit` (multipart), quest responses now include `latestSubmission`, `requiresSubmission`, `maxAttempts`

- [ ] **Step 1: Replace `student-quests.component.ts`**

Replace the entire content of `frontend/src/app/features/student/quests/student-quests.component.ts`:

```typescript
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ThemeToggleComponent } from '../../../shared/theme-toggle/theme-toggle.component';

interface QuestSubmission {
  id:            string;
  questId:       string;
  studentId:     string;
  fileUrl:       string;
  fileName:      string;
  status:        'pending' | 'approved' | 'rejected';
  attemptNumber: number;
  teacherNotes:  string | null;
  submittedAt:   string;
  reviewedAt:    string | null;
}

@Component({
  selector: 'app-student-quests',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ThemeToggleComponent],
  templateUrl: './student-quests.component.html',
})
export class StudentQuestsComponent implements OnInit {
  quests    = signal<any[]>([]);
  loading   = signal(true);
  toasts    = signal<{ id: number; message: string; type: string }[]>([]);

  // Submission modal state
  modalQuestId  = signal<string | null>(null);
  selectedFile  = signal<File | null>(null);
  submitting    = signal(false);
  fileError     = signal('');
  previewUrl    = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadQuests();
  }

  loadQuests() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/quests/my-quests`).subscribe({
      next: (res) => { this.quests.set(res ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  activeQuests    = computed(() => this.quests().filter((q) => !q.students?.[0]?.isCompleted));
  completedQuests = computed(() => this.quests().filter((q) =>  q.students?.[0]?.isCompleted));
  totalXp         = computed(() => this.quests().reduce((s: number, q: any) => s + (q.xpReward ?? 0), 0));

  questIcon(type: string): string {
    const icons: Record<string, string> = { homework: '📚', project: '🔨', writing: '✍️', reading: '📖' };
    return icons[type] ?? '⚔️';
  }

  // ─── Instant complete (non-submission quests) ─────────────────────────────

  completeQuest(questId: string) {
    this.http.post(`${environment.apiUrl}/quests/${questId}/complete`, {}).subscribe({
      next: (res: any) => {
        const msg = `¡Misión completada! +${res.xpEarned ?? 0} XP` + (res.leveledUp ? ` 🎉 ¡Subiste al nivel ${res.newLevel}!` : '');
        this.showToast(msg, 'success');
        this.loadQuests();
      },
      error: (err) => this.showToast(err.error?.message ?? 'Error al completar la misión', 'error'),
    });
  }

  // ─── Submission modal ─────────────────────────────────────────────────────

  openModal(questId: string) {
    this.modalQuestId.set(questId);
    this.selectedFile.set(null);
    this.fileError.set('');
    this.previewUrl.set(null);
  }

  closeModal() {
    this.modalQuestId.set(null);
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.fileError.set('');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fileError.set('');
    if (!file) { this.selectedFile.set(null); this.previewUrl.set(null); return; }
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
    if (!allowed.includes(file.type)) {
      this.fileError.set('Tipo no permitido. Usa imágenes (JPG/PNG/GIF/WEBP) o PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.fileError.set('El archivo supera el límite de 10 MB.');
      return;
    }
    this.selectedFile.set(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      this.previewUrl.set(null);
    }
  }

  submitEvidence() {
    const questId = this.modalQuestId();
    const file = this.selectedFile();
    if (!questId || !file || this.submitting()) return;
    this.submitting.set(true);
    const form = new FormData();
    form.append('file', file);
    this.http.post(`${environment.apiUrl}/quests/${questId}/submit`, form).subscribe({
      next: () => {
        this.showToast('✅ Evidencia enviada. El profesor la revisará pronto.', 'success');
        this.closeModal();
        this.loadQuests();
        this.submitting.set(false);
      },
      error: (err) => {
        this.showToast(err.error?.message ?? 'Error al enviar la evidencia', 'error');
        this.submitting.set(false);
      },
    });
  }

  // ─── Submission status helpers ────────────────────────────────────────────

  latestSub(quest: any): QuestSubmission | null {
    return quest.latestSubmission ?? null;
  }

  attemptsRemaining(quest: any): number {
    const used = quest.latestSubmission?.attemptNumber ?? 0;
    return Math.max(0, (quest.maxAttempts ?? 1) - used);
  }

  canSubmit(quest: any): boolean {
    const sub = this.latestSub(quest);
    if (!sub) return true;
    if (sub.status === 'pending') return false;
    if (sub.status === 'approved') return false;
    // rejected: can resubmit if attempts remain
    return this.attemptsRemaining(quest) > 0;
  }

  submissionBadge(quest: any): { label: string; cls: string } | null {
    const sub = this.latestSub(quest);
    if (!sub) return null;
    if (sub.status === 'pending') return { label: '⏳ Pendiente revisión', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
    if (sub.status === 'approved') return { label: '✅ Aprobada', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
    return { label: '❌ Rechazada', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Date.now();
    this.toasts.update((t) => [...t, { id, message, type }]);
    setTimeout(() => this.toasts.update((t) => t.filter((x) => x.id !== id)), 4500);
  }
}
```

- [ ] **Step 2: Update `student-quests.component.html` quest card section**

In `student-quests.component.html`, find the section inside `@for (q of activeQuests(); ...)` that renders the "Completar" button. It looks like:

```html
<button (click)="completeQuest(q.id)"
```

Replace that button (and its enclosing div if necessary) with this conditional block that handles both instant-complete and submission quests:

```html
<!-- Submission status badge -->
@if (q.requiresSubmission && submissionBadge(q)) {
  <div class="mt-3 flex items-center gap-2 flex-wrap">
    <span class="font-cinzel text-xs font-bold px-3 py-1 rounded-full"
      [ngClass]="submissionBadge(q)!.cls">
      {{ submissionBadge(q)!.label }}
    </span>
    @if (latestSub(q)?.status === 'rejected' && latestSub(q)?.teacherNotes) {
      <span class="font-playfair text-xs text-red-600 dark:text-red-400 italic">
        "{{ latestSub(q)!.teacherNotes }}"
      </span>
    }
  </div>
}

<!-- Attempts remaining -->
@if (q.requiresSubmission) {
  <p class="font-cinzel text-xs text-gray-400 dark:text-slate-500 mt-2">
    Intentos: {{ (q.latestSubmission?.attemptNumber ?? 0) }} / {{ q.maxAttempts ?? 1 }}
  </p>
}

<!-- Action button -->
@if (!q.requiresSubmission) {
  <button (click)="completeQuest(q.id)"
    class="mt-4 w-full font-cinzel font-bold text-sm py-3 rounded-xl text-white transition-all duration-300"
    style="background:linear-gradient(135deg,#16a34a,#15803d);">
    ⚔️ Completar Misión
  </button>
} @else if (canSubmit(q)) {
  <button (click)="openModal(q.id)"
    class="mt-4 w-full font-cinzel font-bold text-sm py-3 rounded-xl text-white transition-all duration-300"
    style="background:linear-gradient(135deg,#7c3aed,#5b21b6);">
    📎 {{ latestSub(q)?.status === 'rejected' ? 'Volver a entregar' : 'Entregar Evidencia' }}
  </button>
}
```

Also add `FormsModule` is NOT needed (no ngModel). Add `[ngClass]` — `CommonModule` is already imported so `ngClass` is available.

- [ ] **Step 3: Add submission modal at the bottom of `student-quests.component.html`**

Before the closing `</div>` of the outermost wrapper, add the modal:

```html
<!-- Submission modal -->
@if (modalQuestId()) {
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    (click)="closeModal()">
    <div class="legendary-card p-8 w-full max-w-md mx-4 animate-fade-in-up"
      (click)="$event.stopPropagation()">
      <h2 class="font-cinzel font-bold text-xl text-gray-800 dark:text-slate-100 mb-6 text-center">
        📎 Entregar Evidencia
      </h2>

      <!-- Drop zone -->
      <label class="block cursor-pointer">
        <div class="border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-2xl p-8 text-center hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
          [ngClass]="selectedFile() ? 'border-purple-500 dark:border-purple-500' : ''">
          @if (previewUrl()) {
            <img [src]="previewUrl()" alt="preview" class="max-h-40 mx-auto rounded-xl mb-3 object-contain">
          } @else if (selectedFile()) {
            <div class="text-4xl mb-2">📄</div>
            <p class="font-cinzel text-sm text-gray-700 dark:text-slate-300">{{ selectedFile()!.name }}</p>
          } @else {
            <div class="text-5xl mb-3">☁️</div>
            <p class="font-cinzel text-sm text-gray-500 dark:text-slate-400">
              Arrastra o haz clic para seleccionar
            </p>
            <p class="font-playfair text-xs text-gray-400 dark:text-slate-500 mt-1">
              JPG · PNG · GIF · WEBP · PDF — máx. 10 MB
            </p>
          }
        </div>
        <input type="file" class="hidden" accept="image/*,.pdf" (change)="onFileSelected($event)">
      </label>

      @if (fileError()) {
        <p class="text-red-500 dark:text-red-400 text-sm font-playfair mt-2">{{ fileError() }}</p>
      }

      <div class="flex gap-3 mt-6">
        <button (click)="closeModal()"
          class="flex-1 font-cinzel font-bold text-sm py-3 rounded-xl border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
          Cancelar
        </button>
        <button (click)="submitEvidence()"
          [disabled]="!selectedFile() || submitting()"
          class="flex-1 font-cinzel font-bold text-sm py-3 rounded-xl text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          style="background:linear-gradient(135deg,#7c3aed,#5b21b6);">
          {{ submitting() ? '⏳ Enviando...' : '📤 Enviar' }}
        </button>
      </div>
    </div>
  </div>
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/student/quests/
git commit -m "feat(quests): add evidence submission modal and status display to StudentQuestsComponent"
```

---

### Task 5: Frontend — TeacherQuestSubmissionsComponent + route + nav link

**Files:**
- Create: `frontend/src/app/features/teacher/quest-submissions/teacher-quest-submissions.component.ts`
- Modify: `frontend/src/app/features/teacher/teacher.routes.ts`
- Modify: `frontend/src/app/features/teacher/dashboard/teacher-dashboard.component.html`

**Interfaces:**
- Consumes: `GET /api/v1/quests/submissions/pending`, `PATCH /api/v1/quests/submissions/:subId/approve`, `PATCH /api/v1/quests/submissions/:subId/reject`

- [ ] **Step 1: Create `teacher-quest-submissions.component.ts`**

Create the directory `frontend/src/app/features/teacher/quest-submissions/` and create the component file:

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { ThemeToggleComponent } from '../../../shared/theme-toggle/theme-toggle.component';

interface PendingSubmission {
  id:            string;
  questId:       string;
  studentId:     string;
  fileUrl:       string;
  fileName:      string;
  status:        'pending' | 'approved' | 'rejected';
  attemptNumber: number;
  teacherNotes:  string | null;
  submittedAt:   string;
  quest:  { id: string; title: string; classroomId: string; xpReward: number };
  student: { id: string; name: string; avatar: string | null };
}

@Component({
  selector: 'app-teacher-quest-submissions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ThemeToggleComponent],
  template: `
  <nav class="legendary-nav sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
      <a routerLink="/teacher/dashboard" class="legendary-logo text-xl">📚 LegendaryClass</a>
      <div class="hidden md:flex gap-1">
        <a routerLink="/teacher/dashboard"          class="nav-link-epic">🏰 Inicio</a>
        <a routerLink="/teacher/classrooms"         class="nav-link-epic">🏛️ Aulas</a>
        <a routerLink="/teacher/behaviors"          class="nav-link-epic">⭐ Comportamientos</a>
        <a routerLink="/teacher/quests"             class="nav-link-epic">🗡️ Misiones</a>
        <a routerLink="/teacher/quest-submissions"  routerLinkActive="active" class="nav-link-epic">📋 Entregas</a>
        <a routerLink="/teacher/rewards"            class="nav-link-epic">🎁 Recompensas</a>
        <a routerLink="/teacher/settings"           class="nav-link-epic">⚙️ Config</a>
      </div>
      <div class="flex items-center gap-3">
        <app-theme-toggle />
        <a routerLink="/teacher/dashboard" class="btn-epic btn-blue text-xs py-2 px-4">← Dashboard</a>
      </div>
    </div>
  </nav>

  <div class="z-content py-10 max-w-5xl mx-auto px-6">

    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="epic-title" style="font-size:clamp(1.8rem,4vw,2.8rem);">📋 Bandeja de Entregas</h1>
        <p class="font-cinzel text-gray-500 dark:text-slate-400 text-sm mt-1">
          Revisa y aprueba las evidencias de tus estudiantes
        </p>
      </div>
      @if (submissions().length > 0) {
        <span class="font-cinzel font-black text-white text-lg px-5 py-2 rounded-full"
          style="background:linear-gradient(135deg,#7c3aed,#5b21b6);">
          {{ submissions().length }} pendientes
        </span>
      }
    </div>

    @if (loading()) {
      <div class="text-center py-16">
        <div class="text-8xl mb-4 animate-float">📋</div>
        <p class="font-cinzel text-gray-500 dark:text-slate-400">Cargando entregas...</p>
      </div>
    } @else if (submissions().length === 0) {
      <div class="legendary-card text-center py-16">
        <div class="text-6xl mb-4">✅</div>
        <h3 class="font-cinzel font-bold text-xl text-gray-700 dark:text-slate-200 mb-2">
          Sin entregas pendientes
        </h3>
        <p class="font-playfair text-gray-500 dark:text-slate-400">
          Todos los envíos han sido revisados.
        </p>
      </div>
    } @else {
      <div class="space-y-4">
        @for (sub of submissions(); track sub.id) {
          <div class="legendary-card p-5 animate-fade-in-up">
            <div class="flex items-start gap-4 flex-wrap">

              <!-- Avatar -->
              @if (sub.student.avatar) {
                <img [src]="sub.student.avatar" alt="" class="w-12 h-12 rounded-full object-cover flex-shrink-0">
              } @else {
                <div class="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <span class="font-cinzel font-black text-purple-700 dark:text-purple-400 text-lg">
                    {{ sub.student.name.charAt(0).toUpperCase() }}
                  </span>
                </div>
              }

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="font-cinzel font-bold text-gray-800 dark:text-slate-100">
                  {{ sub.student.name }}
                </p>
                <p class="font-playfair text-sm text-gray-500 dark:text-slate-400">
                  Misión: <span class="font-semibold text-gray-700 dark:text-slate-300">{{ sub.quest.title }}</span>
                  · <span class="text-purple-600 dark:text-purple-400 font-bold">+{{ sub.quest.xpReward }} XP</span>
                </p>
                <p class="font-playfair text-xs text-gray-400 dark:text-slate-500 mt-1">
                  Intento #{{ sub.attemptNumber }} · {{ sub.submittedAt | date:'d MMM yyyy, HH:mm' }}
                </p>
                <a [href]="apiBase + sub.fileUrl" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1 mt-2 font-cinzel text-xs text-purple-600 dark:text-purple-400 hover:underline">
                  📎 Ver archivo: {{ sub.fileName }}
                </a>
              </div>

              <!-- Approve / Reject buttons -->
              <div class="flex flex-col gap-2 min-w-[180px]">
                @if (rejectingId() !== sub.id) {
                  <button (click)="approve(sub)"
                    [disabled]="processingId() === sub.id"
                    class="btn-epic btn-green text-xs py-2 px-4 disabled:opacity-50">
                    {{ processingId() === sub.id ? '⏳...' : '✅ Aprobar' }}
                  </button>
                  <button (click)="startReject(sub.id)"
                    class="btn-epic text-xs py-2 px-4"
                    style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;">
                    ❌ Rechazar
                  </button>
                }

                @if (rejectingId() === sub.id) {
                  <textarea
                    [(ngModel)]="rejectNote"
                    placeholder="Motivo del rechazo (obligatorio)"
                    rows="3"
                    class="input-epic text-xs resize-none"></textarea>
                  <div class="flex gap-2">
                    <button (click)="confirmReject(sub)"
                      [disabled]="!rejectNote.trim() || processingId() === sub.id"
                      class="flex-1 btn-epic text-xs py-2 disabled:opacity-50"
                      style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;">
                      Confirmar rechazo
                    </button>
                    <button (click)="cancelReject()"
                      class="btn-epic btn-blue text-xs py-2 px-3">
                      Cancelar
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  </div>
  `,
})
export class TeacherQuestSubmissionsComponent implements OnInit {
  submissions = signal<PendingSubmission[]>([]);
  loading     = signal(true);
  processingId = signal<string | null>(null);
  rejectingId  = signal<string | null>(null);
  rejectNote   = '';
  apiBase      = environment.apiUrl.replace('/api/v1', '');

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<PendingSubmission[]>(`${environment.apiUrl}/quests/submissions/pending`).subscribe({
      next: (res) => { this.submissions.set(res ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  approve(sub: PendingSubmission) {
    this.processingId.set(sub.id);
    this.http.patch(`${environment.apiUrl}/quests/submissions/${sub.id}/approve`, {}).subscribe({
      next: () => {
        this.submissions.update((list) => list.filter((s) => s.id !== sub.id));
        this.processingId.set(null);
      },
      error: () => this.processingId.set(null),
    });
  }

  startReject(id: string) {
    this.rejectingId.set(id);
    this.rejectNote = '';
  }

  cancelReject() {
    this.rejectingId.set(null);
    this.rejectNote = '';
  }

  confirmReject(sub: PendingSubmission) {
    if (!this.rejectNote.trim()) return;
    this.processingId.set(sub.id);
    this.http.patch(`${environment.apiUrl}/quests/submissions/${sub.id}/reject`, { teacherNotes: this.rejectNote }).subscribe({
      next: () => {
        this.submissions.update((list) => list.filter((s) => s.id !== sub.id));
        this.processingId.set(null);
        this.rejectingId.set(null);
        this.rejectNote = '';
      },
      error: () => this.processingId.set(null),
    });
  }
}
```

- [ ] **Step 2: Add leaderboard route to `teacher.routes.ts`**

In `frontend/src/app/features/teacher/teacher.routes.ts`, add before the `{ path: '', redirectTo: ... }` catch-all entry:

```typescript
  {
    path: 'quest-submissions',
    loadComponent: () =>
      import('./quest-submissions/teacher-quest-submissions.component')
        .then((m) => m.TeacherQuestSubmissionsComponent),
  },
```

- [ ] **Step 3: Add nav link to teacher dashboard**

In `frontend/src/app/features/teacher/dashboard/teacher-dashboard.component.html`, find the hidden md nav block and add the Entregas link after the Misiones link:

```html
<a routerLink="/teacher/quest-submissions" routerLinkActive="active" class="nav-link-epic">📋 Entregas</a>
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/teacher/quest-submissions/ \
        frontend/src/app/features/teacher/teacher.routes.ts \
        frontend/src/app/features/teacher/dashboard/teacher-dashboard.component.html
git commit -m "feat(quests): add TeacherQuestSubmissionsComponent with approve/reject workflow"
```

---

### Task 6: Frontend — teacher quest creation form — requiresSubmission toggle

**Files:**
- Modify: `frontend/src/app/features/teacher/quests/teacher-quests.component.ts`

**Interfaces:**
- Consumes: extended `CreateQuestDto` (Task 3) — `requiresSubmission`, `maxAttempts` fields

- [ ] **Step 1: Extend `newQuest` initial object to include new fields**

In `teacher-quests.component.ts`, find the `newQuest` object declaration. It currently looks like:

```typescript
newQuest = { title: '', description: '', xpReward: 50, dueDate: '' };
```

Replace it with:

```typescript
newQuest = { title: '', description: '', xpReward: 50, dueDate: '', requiresSubmission: false, maxAttempts: 1 };
```

Also update the reset line inside `createQuest()` (after success):

```typescript
this.newQuest = { title: '', description: '', xpReward: 50, dueDate: '', requiresSubmission: false, maxAttempts: 1 };
```

- [ ] **Step 2: Include new fields in the `createQuest()` HTTP body**

In the `createQuest()` method, find the `body` object construction. It currently ends with:

```typescript
    if (this.newQuest.dueDate) body.dueDate = new Date(this.newQuest.dueDate).toISOString();
```

Add after that line:

```typescript
    body.requiresSubmission = this.newQuest.requiresSubmission;
    if (this.newQuest.requiresSubmission) body.maxAttempts = this.newQuest.maxAttempts;
```

- [ ] **Step 3: Add toggle and maxAttempts input to the creation form in the inline template**

In `teacher-quests.component.ts`, find the form section inside the template (inside the `@if (showCreate)` block). Find the `dueDate` field and add the following two fields directly after it:

```html
<!-- requiresSubmission toggle -->
<div class="flex items-center gap-3 mt-2">
  <input type="checkbox" id="requires-submission" [(ngModel)]="newQuest.requiresSubmission"
    class="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500">
  <label for="requires-submission" class="font-cinzel text-sm font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
    Requiere entrega de evidencia
  </label>
</div>

<!-- maxAttempts — shown only when requiresSubmission is true -->
@if (newQuest.requiresSubmission) {
  <div>
    <label class="block font-cinzel text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wide mb-1">
      Intentos permitidos (1–10)
    </label>
    <input type="number" [(ngModel)]="newQuest.maxAttempts" min="1" max="10"
      class="input-epic" />
  </div>
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/teacher/quests/teacher-quests.component.ts
git commit -m "feat(quests): add requiresSubmission toggle and maxAttempts to teacher quest creation form"
```
