# Course Catalog & Activity Bank — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Course catalog (Aritmética, Álgebra, etc.) managed by the director, link classrooms to a course, and provide a bank of typed activity templates (Homework, Exercise, Form, Exam) with a teacher-proposes / director-approves flow and copy-or-reference import into classrooms.

**Architecture:** Two new NestJS modules (`CoursesModule`, `TemplatesModule`) + classroom-scoped activity endpoints added to the existing `ClassroomsModule`. Five new Prisma models (`Course`, `HomeworkTemplate`, `ExerciseTemplate`, `FormTemplate`, `ExamTemplate`, `ClassroomActivity`) with polymorphic `templateId` resolved at the service layer. Six new Angular routes split between director and teacher feature folders.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL 16, Angular 18 standalone, TailwindCSS, class-validator, @nestjs/swagger.

## Global Constraints

- All backend routes live under the global `/api` prefix (set in `main.ts`).
- DTOs must declare every accepted field; `whitelist + forbidNonWhitelisted` is active globally.
- Guard routes with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`. `director` and `admin` bypass all role checks automatically.
- After any schema change run `npm run db:generate` from `backend/` then restart the dev server.
- Frontend uses standalone components (no NgModules). New routes use `loadComponent` / `loadChildren` in the appropriate routes file.
- Never add `Co-Authored-By` lines to commits.

---

## File Map

**Created:**
- `backend/prisma/migrations/20260622010000_course_catalog/migration.sql`
- `backend/src/courses/courses.module.ts`
- `backend/src/courses/courses.controller.ts`
- `backend/src/courses/courses.service.ts`
- `backend/src/courses/dto/create-course.dto.ts`
- `backend/src/templates/templates.module.ts`
- `backend/src/templates/templates.controller.ts`
- `backend/src/templates/templates.service.ts`
- `backend/src/templates/dto/create-template.dto.ts`
- `backend/src/templates/dto/review-template.dto.ts`
- `backend/src/classrooms/dto/import-activity.dto.ts`
- `frontend/src/app/features/director/courses/director-courses.component.ts`
- `frontend/src/app/features/director/courses/director-courses.component.html`
- `frontend/src/app/features/director/templates/director-templates.component.ts`
- `frontend/src/app/features/director/templates/director-templates.component.html`
- `frontend/src/app/features/teacher/templates/teacher-templates.component.ts`
- `frontend/src/app/features/teacher/templates/teacher-templates.component.html`

**Modified:**
- `backend/prisma/schema.prisma` — Course, 4 template models, ClassroomActivity, NotificationType, User relations, Classroom FK
- `backend/prisma/seed.ts` — seed initial courses
- `backend/src/app.module.ts` — register CoursesModule, TemplatesModule
- `backend/src/classrooms/classrooms.module.ts` — import TemplatesModule
- `backend/src/classrooms/classrooms.service.ts` — activity CRUD methods
- `backend/src/classrooms/classrooms.controller.ts` — activity endpoints
- `backend/src/classrooms/dto/create-classroom.dto.ts` — add courseId, remove subject from required
- `backend/src/notifications/notifications.service.ts` — add template_review case
- `frontend/src/app/features/director/director.routes.ts` — add courses + templates routes
- `frontend/src/app/features/teacher/teacher.routes.ts` — add templates route
- `frontend/src/app/features/teacher/classrooms/teacher-classrooms.component.ts` — add courseId to create form
- `frontend/src/app/features/teacher/classrooms/teacher-classrooms.component.html` — dropdown + remove subject
- Classroom detail component (teacher) — add Activities tab

---

### Task 1: Prisma schema — Course + Classroom FK

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260622010000_course_catalog/migration.sql`

**Interfaces:**
- Produces: `Course` model, `CourseCategory` enum, `courseId` nullable FK on `Classroom`

- [ ] **Step 1: Add CourseCategory enum and Course model to schema.prisma**

Find the block of enums (after `QuestStatus`) and append:

```prisma
enum CourseCategory {
  mathematics
  sciences
  language
  social
  arts
  other
}
```

Then add the `Course` model before the `Classroom` model:

```prisma
model Course {
  id          String         @id @default(cuid())
  name        String
  description String?
  icon        String?
  color       String?
  category    CourseCategory
  isActive    Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  classrooms Classroom[]

  @@map("courses")
}
```

- [ ] **Step 2: Add courseId FK to Classroom model**

In the `Classroom` model, after the `teacherId` line, add:

```prisma
  courseId    String?
  course      Course?  @relation(fields: [courseId], references: [id])
```

Also add `activities ClassroomActivity[]` at the end of the Classroom relations block (before `@@map`).

- [ ] **Step 3: Run migration**

```bash
cd backend
npx prisma migrate dev --name course_catalog
```

Expected: migration applied, `courses` table and `courseId` column on `classrooms` created.

- [ ] **Step 4: Seed initial courses**

Open `backend/prisma/seed.ts`. Find the end of the seed function and add course seeding before the final `console.log`:

```typescript
// Courses
const coursesData = [
  { name: 'Aritmética',              category: 'mathematics', icon: '🔢', color: '#3B82F6' },
  { name: 'Álgebra',                 category: 'mathematics', icon: '📐', color: '#8B5CF6' },
  { name: 'Geometría',               category: 'mathematics', icon: '📏', color: '#10B981' },
  { name: 'Razonamiento Matemático', category: 'mathematics', icon: '🧮', color: '#F59E0B' },
  { name: 'Trigonometría',           category: 'mathematics', icon: '📊', color: '#EF4444' },
  { name: 'Química',                 category: 'sciences',    icon: '⚗️',  color: '#06B6D4' },
  { name: 'Física',                  category: 'sciences',    icon: '⚡',  color: '#F97316' },
];
for (const c of coursesData) {
  await prisma.course.upsert({
    where: { id: `course_${c.name.toLowerCase().replace(/\s+/g, '_')}` },
    update: {},
    create: { id: `course_${c.name.toLowerCase().replace(/\s+/g, '_')}`, ...c } as any,
  });
}
```

Run: `npm run db:seed` from `backend/`

Expected: 7 courses inserted.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/prisma/seed.ts
git commit -m "feat(schema): add Course model and courseId FK on Classroom"
```

---

### Task 2: Prisma schema — 4 template models + ClassroomActivity

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Consumes: `Course` model from Task 1
- Produces: `HomeworkTemplate`, `ExerciseTemplate`, `FormTemplate`, `ExamTemplate`, `ClassroomActivity` models; `Difficulty`, `TemplateStatus`, `ActivityType`, `ActivityMode` enums; `template_review` added to `NotificationType`

- [ ] **Step 1: Add new enums to schema.prisma**

After the `CourseCategory` enum block added in Task 1, append:

```prisma
enum Difficulty {
  easy
  medium
  hard
}

enum TemplateStatus {
  draft
  pending
  approved
  rejected
}

enum ActivityType {
  homework
  exercise
  form
  exam
}

enum ActivityMode {
  reference
  copy
}
```

Also update the existing `NotificationType` enum — find it and add `template_review`:

```prisma
enum NotificationType {
  level_up
  achievement
  reward_status
  reward_pending
  template_review
}
```

- [ ] **Step 2: Add HomeworkTemplate model**

After the `Course` model:

```prisma
model HomeworkTemplate {
  id             String         @id @default(cuid())
  courseId       String
  title          String
  description    String?
  xpReward       Int            @default(50)
  difficulty     Difficulty
  status         TemplateStatus @default(pending)
  rejectionNote  String?
  authorId       String
  approvedById   String?
  approvedAt     DateTime?
  instructions   String
  defaultDueDays Int            @default(7)
  attachmentUrl  String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  course     Course @relation(fields: [courseId], references: [id])
  author     User   @relation("HomeworkAuthor",   fields: [authorId],     references: [id])
  approvedBy User?  @relation("HomeworkApprover", fields: [approvedById], references: [id])

  @@map("homework_templates")
}
```

- [ ] **Step 3: Add ExerciseTemplate model**

```prisma
model ExerciseTemplate {
  id            String         @id @default(cuid())
  courseId      String
  title         String
  description   String?
  xpReward      Int            @default(50)
  difficulty    Difficulty
  status        TemplateStatus @default(pending)
  rejectionNote String?
  authorId      String
  approvedById  String?
  approvedAt    DateTime?
  problems      Json
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  course     Course @relation(fields: [courseId], references: [id])
  author     User   @relation("ExerciseAuthor",   fields: [authorId],     references: [id])
  approvedBy User?  @relation("ExerciseApprover", fields: [approvedById], references: [id])

  @@map("exercise_templates")
}
```

- [ ] **Step 4: Add FormTemplate model**

```prisma
model FormTemplate {
  id            String         @id @default(cuid())
  courseId      String
  title         String
  description   String?
  xpReward      Int            @default(50)
  difficulty    Difficulty
  status        TemplateStatus @default(pending)
  rejectionNote String?
  authorId      String
  approvedById  String?
  approvedAt    DateTime?
  questions     Json
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  course     Course @relation(fields: [courseId], references: [id])
  author     User   @relation("FormAuthor",   fields: [authorId],     references: [id])
  approvedBy User?  @relation("FormApprover", fields: [approvedById], references: [id])

  @@map("form_templates")
}
```

- [ ] **Step 5: Add ExamTemplate model**

```prisma
model ExamTemplate {
  id              String         @id @default(cuid())
  courseId        String
  title           String
  description     String?
  xpReward        Int            @default(50)
  difficulty      Difficulty
  status          TemplateStatus @default(pending)
  rejectionNote   String?
  authorId        String
  approvedById    String?
  approvedAt      DateTime?
  questions       Json
  durationMinutes Int
  passingScore    Int
  totalPoints     Int
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  course     Course @relation(fields: [courseId], references: [id])
  author     User   @relation("ExamAuthor",   fields: [authorId],     references: [id])
  approvedBy User?  @relation("ExamApprover", fields: [approvedById], references: [id])

  @@map("exam_templates")
}
```

- [ ] **Step 6: Add ClassroomActivity model**

```prisma
model ClassroomActivity {
  id           String       @id @default(cuid())
  classroomId  String
  activityType ActivityType
  templateId   String?
  mode         ActivityMode
  overrides    Json         @default("{}")
  dueDate      DateTime?
  assignedAt   DateTime     @default(now())
  isActive     Boolean      @default(true)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  classroom Classroom @relation(fields: [classroomId], references: [id], onDelete: Cascade)

  @@map("classroom_activities")
}
```

- [ ] **Step 7: Add User back-relations**

In the `User` model, at the end of the relations block (before `@@map`), add:

```prisma
  homeworkAuthored  HomeworkTemplate[] @relation("HomeworkAuthor")
  homeworkApproved  HomeworkTemplate[] @relation("HomeworkApprover")
  exerciseAuthored  ExerciseTemplate[] @relation("ExerciseAuthor")
  exerciseApproved  ExerciseTemplate[] @relation("ExerciseApprover")
  formAuthored      FormTemplate[]     @relation("FormAuthor")
  formApproved      FormTemplate[]     @relation("FormApprover")
  examAuthored      ExamTemplate[]     @relation("ExamAuthor")
  examApproved      ExamTemplate[]     @relation("ExamApprover")
```

Also add `homeworkTemplates HomeworkTemplate[]` etc. to the `Course` model relations:

```prisma
  homeworkTemplates  HomeworkTemplate[]
  exerciseTemplates  ExerciseTemplate[]
  formTemplates      FormTemplate[]
  examTemplates      ExamTemplate[]
```

- [ ] **Step 8: Run migration and generate client**

```bash
cd backend
npx prisma migrate dev --name activity_templates
npm run db:generate
```

Expected: 5 new tables created, Prisma client regenerated with new models.

- [ ] **Step 9: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(schema): add 4 template models, ClassroomActivity, new enums"
```

---

### Task 3: Backend — CoursesModule

**Files:**
- Create: `backend/src/courses/dto/create-course.dto.ts`
- Create: `backend/src/courses/courses.service.ts`
- Create: `backend/src/courses/courses.controller.ts`
- Create: `backend/src/courses/courses.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Produces: `GET /api/courses`, `POST /api/courses`, `PATCH /api/courses/:id`, `DELETE /api/courses/:id`

- [ ] **Step 1: Write failing service test**

Create `backend/src/courses/courses.service.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
npm test -- courses.service --no-coverage
```

Expected: FAIL — `CoursesService` not found.

- [ ] **Step 3: Create DTO**

Create `backend/src/courses/dto/create-course.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseCategory } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(500) description?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() icon?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() color?: string;
  @ApiProperty({ enum: CourseCategory }) @IsEnum(CourseCategory) category: CourseCategory;
}
```

- [ ] **Step 4: Create CoursesService**

Create `backend/src/courses/courses.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.course.findMany({
      where: { isActive: true },
      include: { _count: { select: { homeworkTemplates: true, exerciseTemplates: true, formTemplates: true, examTemplates: true } } },
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
```

- [ ] **Step 5: Create CoursesController**

Create `backend/src/courses/courses.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private courses: CoursesService) {}

  @Get()
  findAll() { return this.courses.findAll(); }

  @Post()
  @Roles('director', 'admin')
  create(@Body() dto: CreateCourseDto) { return this.courses.create(dto); }

  @Patch(':id')
  @Roles('director', 'admin')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCourseDto>) {
    return this.courses.update(id, dto);
  }

  @Delete(':id')
  @Roles('director', 'admin')
  deactivate(@Param('id') id: string) { return this.courses.deactivate(id); }
}
```

- [ ] **Step 6: Create CoursesModule**

Create `backend/src/courses/courses.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
```

- [ ] **Step 7: Register in AppModule**

In `backend/src/app.module.ts`, add `CoursesModule` to the imports array (after `AchievementsModule`):

```typescript
import { CoursesModule } from './courses/courses.module';
// ...
imports: [
  // ... existing imports ...
  CoursesModule,
]
```

- [ ] **Step 8: Run tests**

```bash
cd backend
npm test -- courses.service --no-coverage
```

Expected: PASS — both tests green.

- [ ] **Step 9: Commit**

```bash
git add backend/src/courses backend/src/app.module.ts
git commit -m "feat(courses): add CoursesModule with CRUD endpoints"
```

---

### Task 4: Backend — TemplatesModule

**Files:**
- Create: `backend/src/templates/dto/create-template.dto.ts`
- Create: `backend/src/templates/dto/review-template.dto.ts`
- Create: `backend/src/templates/templates.service.ts`
- Create: `backend/src/templates/templates.controller.ts`
- Create: `backend/src/templates/templates.module.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/notifications/notifications.service.ts`

**Interfaces:**
- Consumes: `PrismaService`, `NotificationsService`
- Produces: `GET /api/courses/:courseId/templates`, `POST /api/courses/:courseId/templates`, `PATCH /api/templates/:id`, `PATCH /api/templates/:id/review`, `DELETE /api/templates/:id`

- [ ] **Step 1: Write failing service tests**

Create `backend/src/templates/templates.service.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
npm test -- templates.service --no-coverage
```

Expected: FAIL — `TemplatesService` not found.

- [ ] **Step 3: Create DTOs**

Create `backend/src/templates/dto/create-template.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsArray, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType, Difficulty } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty({ enum: ActivityType }) @IsEnum(ActivityType) activityType: ActivityType;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(1000) description?: string;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() xpReward?: number;
  @ApiProperty({ enum: Difficulty }) @IsEnum(Difficulty) difficulty: Difficulty;

  // homework
  @ApiPropertyOptional() @IsString() @IsOptional() instructions?: string;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() defaultDueDays?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() attachmentUrl?: string;

  // exercise
  @ApiPropertyOptional() @IsArray() @IsOptional() problems?: { question: string; hint?: string; answer?: string }[];

  // form + exam
  @ApiPropertyOptional() @IsArray() @IsOptional() questions?: any[];

  // exam
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() durationMinutes?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(100) @IsOptional() passingScore?: number;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() totalPoints?: number;
}
```

Create `backend/src/templates/dto/review-template.dto.ts`:

```typescript
import { IsBoolean, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewTemplateDto {
  @ApiProperty() @IsBoolean() approved: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() note?: string;
}
```

- [ ] **Step 4: Create TemplatesService**

Create `backend/src/templates/templates.service.ts`:

```typescript
import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ActivityType, TemplateStatus } from '@prisma/client';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  // Returns the correct Prisma delegate based on activityType
  private delegate(type: ActivityType) {
    const map = {
      [ActivityType.homework]: this.prisma.homeworkTemplate,
      [ActivityType.exercise]: this.prisma.exerciseTemplate,
      [ActivityType.form]:     this.prisma.formTemplate,
      [ActivityType.exam]:     this.prisma.examTemplate,
    } as Record<ActivityType, any>;
    return map[type];
  }

  async list(courseId: string, userId: string, userRole: string) {
    const isDirector = userRole === 'director' || userRole === 'admin';
    const types = [ActivityType.homework, ActivityType.exercise, ActivityType.form, ActivityType.exam];
    const results: any[] = [];
    for (const type of types) {
      const where: any = { courseId };
      if (!isDirector) {
        where.status = TemplateStatus.approved;
      }
      const items = await this.delegate(type).findMany({
        where,
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      results.push(...items.map((t: any) => ({ ...t, activityType: type })));
    }
    return results;
  }

  async create(courseId: string, userId: string, userRole: string, dto: CreateTemplateDto) {
    const isDirector = userRole === 'director' || userRole === 'admin';
    const status = isDirector ? TemplateStatus.approved : TemplateStatus.pending;
    const common = {
      courseId, authorId: userId, status,
      title: dto.title, description: dto.description,
      xpReward: dto.xpReward ?? 50,
      difficulty: dto.difficulty,
      ...(isDirector ? { approvedById: userId, approvedAt: new Date() } : {}),
    };

    switch (dto.activityType) {
      case ActivityType.homework:
        if (!dto.instructions) throw new BadRequestException('instructions es requerido para tarea');
        return this.prisma.homeworkTemplate.create({
          data: { ...common, instructions: dto.instructions, defaultDueDays: dto.defaultDueDays ?? 7, attachmentUrl: dto.attachmentUrl },
        });
      case ActivityType.exercise:
        if (!dto.problems?.length) throw new BadRequestException('problems es requerido para ejercicio');
        return this.prisma.exerciseTemplate.create({ data: { ...common, problems: dto.problems } });
      case ActivityType.form:
        if (!dto.questions?.length) throw new BadRequestException('questions es requerido para formulario');
        return this.prisma.formTemplate.create({ data: { ...common, questions: dto.questions } });
      case ActivityType.exam:
        if (!dto.questions?.length || !dto.durationMinutes || !dto.passingScore || !dto.totalPoints)
          throw new BadRequestException('questions, durationMinutes, passingScore, totalPoints son requeridos para examen');
        return this.prisma.examTemplate.create({
          data: { ...common, questions: dto.questions, durationMinutes: dto.durationMinutes, passingScore: dto.passingScore, totalPoints: dto.totalPoints },
        });
    }
  }

  async update(id: string, activityType: ActivityType, userId: string, userRole: string, dto: Partial<CreateTemplateDto>) {
    const template = await this.findOneRaw(id, activityType);
    const isDirector = userRole === 'director' || userRole === 'admin';
    if (!isDirector && template.authorId !== userId) throw new ForbiddenException('No tienes permiso');
    if (!isDirector && template.status === TemplateStatus.approved) throw new ForbiddenException('No puedes editar una plantilla aprobada');

    const { activityType: _at, ...data } = dto as any;
    return this.delegate(activityType).update({ where: { id }, data });
  }

  async review(id: string, activityType: ActivityType, directorId: string, approved: boolean, note?: string) {
    const template = await this.findOneRaw(id, activityType);
    if (template.status !== TemplateStatus.pending) {
      throw new BadRequestException(`Solo se pueden revisar plantillas en estado "pending"`);
    }

    const status = approved ? TemplateStatus.approved : TemplateStatus.rejected;
    const updated = await this.delegate(activityType).update({
      where: { id },
      data: {
        status,
        rejectionNote: approved ? null : (note ?? null),
        approvedById: approved ? directorId : null,
        approvedAt: approved ? new Date() : null,
      },
    });

    try {
      const c = this.notifications.buildNotificationContent('template_review', { approved, title: template.title, note });
      await this.notifications.create(template.authorId, { type: 'template_review', ...c });
    } catch { /* best-effort */ }

    return updated;
  }

  async remove(id: string, activityType: ActivityType) {
    await this.findOneRaw(id, activityType);
    await this.delegate(activityType).delete({ where: { id } });
    return { message: 'Plantilla eliminada' };
  }

  async findOneRaw(id: string, activityType: ActivityType) {
    const t = await this.delegate(activityType).findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Plantilla no encontrada');
    return t;
  }
}
```

- [ ] **Step 5: Create TemplatesController**

Create `backend/src/templates/templates.controller.ts`:

```typescript
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ReviewTemplateDto } from './dto/review-template.dto';
import { ActivityType } from '@prisma/client';

@ApiTags('templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TemplatesController {
  constructor(private templates: TemplatesService) {}

  @Get('courses/:courseId/templates')
  @Roles('teacher', 'director', 'admin')
  list(
    @Param('courseId') courseId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.templates.list(courseId, user.id, user.role);
  }

  @Post('courses/:courseId/templates')
  @Roles('teacher', 'director', 'admin')
  create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateTemplateDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.templates.create(courseId, user.id, user.role, dto);
  }

  @Patch('templates/:id')
  @Roles('teacher', 'director', 'admin')
  update(
    @Param('id') id: string,
    @Query('type') type: ActivityType,
    @Body() dto: Partial<CreateTemplateDto>,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.templates.update(id, type, user.id, user.role, dto);
  }

  @Patch('templates/:id/review')
  @Roles('director', 'admin')
  review(
    @Param('id') id: string,
    @Query('type') type: ActivityType,
    @Body() dto: ReviewTemplateDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.templates.review(id, type, user.id, dto.approved, dto.note);
  }

  @Delete('templates/:id')
  @Roles('director', 'admin')
  remove(@Param('id') id: string, @Query('type') type: ActivityType) {
    return this.templates.remove(id, type);
  }
}
```

- [ ] **Step 6: Create TemplatesModule**

Create `backend/src/templates/templates.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
```

- [ ] **Step 7: Register TemplatesModule in AppModule**

In `backend/src/app.module.ts`:

```typescript
import { TemplatesModule } from './templates/templates.module';
// add after CoursesModule
```

- [ ] **Step 8: Add template_review case to NotificationsService**

In `backend/src/notifications/notifications.service.ts`, find the `buildNotificationContent` switch and add before `default`:

```typescript
case 'template_review':
  return data.approved
    ? { title: 'Plantilla aprobada', message: `Tu plantilla "${data.title}" fue aprobada y ya está en el banco`, link: '/teacher/courses' }
    : { title: 'Plantilla rechazada', message: `Tu plantilla "${data.title}" fue rechazada${data.note ? ': ' + data.note : ''}`, link: '/teacher/courses' };
```

- [ ] **Step 9: Run tests**

```bash
cd backend
npm test -- templates.service --no-coverage
```

Expected: PASS — all 3 tests green.

- [ ] **Step 10: Commit**

```bash
git add backend/src/templates backend/src/app.module.ts backend/src/notifications/notifications.service.ts
git commit -m "feat(templates): add TemplatesModule with bank + approval flow"
```

---

### Task 5: Backend — Classroom Activities

**Files:**
- Create: `backend/src/classrooms/dto/import-activity.dto.ts`
- Modify: `backend/src/classrooms/classrooms.service.ts`
- Modify: `backend/src/classrooms/classrooms.controller.ts`
- Modify: `backend/src/classrooms/classrooms.module.ts`
- Modify: `backend/src/classrooms/dto/create-classroom.dto.ts`

**Interfaces:**
- Consumes: `TemplatesService` from Task 4
- Produces: `GET /api/classrooms/:slug/activities`, `POST /api/classrooms/:slug/activities`, `PATCH /api/classrooms/:slug/activities/:id`, `DELETE /api/classrooms/:slug/activities/:id`

- [ ] **Step 1: Update CreateClassroomDto**

In `backend/src/classrooms/dto/create-classroom.dto.ts`, add courseId field:

```typescript
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateClassroomDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(500) description?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() gradeLevel?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() schoolYear?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() courseId?: string;
}
```

Note: `subject` is removed from the DTO. It remains nullable in the DB for existing rows.

- [ ] **Step 2: Create ImportActivityDto**

Create `backend/src/classrooms/dto/import-activity.dto.ts`:

```typescript
import { IsEnum, IsOptional, IsString, IsDateString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType, ActivityMode } from '@prisma/client';

export class ImportActivityDto {
  @ApiProperty({ enum: ActivityType }) @IsEnum(ActivityType) activityType: ActivityType;
  @ApiPropertyOptional() @IsString() @IsOptional() templateId?: string;
  @ApiProperty({ enum: ActivityMode }) @IsEnum(ActivityMode) mode: ActivityMode;
  @ApiPropertyOptional() @IsDateString() @IsOptional() dueDate?: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() overrides?: Record<string, any>;
}
```

- [ ] **Step 3: Add activity methods to ClassroomsService**

At the end of `backend/src/classrooms/classrooms.service.ts`, before the Helpers section, add:

```typescript
// ─── Classroom Activities ────────────────────────────────────────────────

async listActivities(slug: string, requesterId: string, requesterRole: string) {
  const classroom = await this.prisma.classroom.findUnique({ where: { slug } });
  if (!classroom) throw new NotFoundException('Aula no encontrada');

  // teacher must own it; student must be enrolled
  if (requesterRole === 'teacher' && classroom.teacherId !== requesterId) {
    throw new ForbiddenException('No tienes permiso sobre esta aula');
  }
  if (requesterRole === 'student') {
    const enrollment = await this.prisma.classroomStudent.findUnique({
      where: { classroomId_studentId: { classroomId: classroom.id, studentId: requesterId } },
    });
    if (!enrollment) throw new ForbiddenException('No estás inscrito en esta aula');
  }

  return this.prisma.classroomActivity.findMany({
    where: { classroomId: classroom.id, isActive: true },
    orderBy: { assignedAt: 'desc' },
  });
}

async importActivity(slug: string, teacherId: string, dto: ImportActivityDto) {
  const classroom = await this.findOwnedClassroom(slug, teacherId);

  // If templateId provided and mode=copy, take a snapshot of the template content
  let overrides = dto.overrides ?? {};
  if (dto.templateId && dto.mode === 'copy') {
    const template = await this.templates.findOneRaw(dto.templateId, dto.activityType);
    const { id: _id, courseId: _c, authorId: _a, approvedById: _ab, createdAt: _cr, updatedAt: _up, status: _st, ...snapshot } = template as any;
    overrides = { ...snapshot, ...overrides };
  }

  return this.prisma.classroomActivity.create({
    data: {
      classroomId: classroom.id,
      activityType: dto.activityType,
      templateId: dto.templateId ?? null,
      mode: dto.mode,
      overrides,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    },
  });
}

async updateActivity(slug: string, teacherId: string, activityId: string, data: { dueDate?: string; overrides?: Record<string, any>; isActive?: boolean }) {
  const classroom = await this.findOwnedClassroom(slug, teacherId);
  const activity = await this.prisma.classroomActivity.findFirst({
    where: { id: activityId, classroomId: classroom.id },
  });
  if (!activity) throw new NotFoundException('Actividad no encontrada');

  return this.prisma.classroomActivity.update({
    where: { id: activityId },
    data: {
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(data.overrides !== undefined ? { overrides: data.overrides } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

async removeActivity(slug: string, teacherId: string, activityId: string) {
  const classroom = await this.findOwnedClassroom(slug, teacherId);
  const activity = await this.prisma.classroomActivity.findFirst({
    where: { id: activityId, classroomId: classroom.id },
  });
  if (!activity) throw new NotFoundException('Actividad no encontrada');
  await this.prisma.classroomActivity.delete({ where: { id: activityId } });
  return { message: 'Actividad eliminada' };
}
```

- [ ] **Step 4: Inject TemplatesService into ClassroomsService**

At the top of `ClassroomsService`, update the constructor:

```typescript
import { TemplatesService } from '../templates/templates.service';
import { ImportActivityDto } from './dto/import-activity.dto';

// ...

constructor(
  private prisma: PrismaService,
  private gamification: GamificationService,
  private templates: TemplatesService,
) {}
```

- [ ] **Step 5: Add activity endpoints to ClassroomsController**

In `backend/src/classrooms/classrooms.controller.ts`, add these endpoints (import `ImportActivityDto` and use `@CurrentUser()`):

```typescript
@Get(':slug/activities')
@Roles('teacher', 'student')
listActivities(
  @Param('slug') slug: string,
  @CurrentUser() user: { id: string; role: string },
) {
  return this.classrooms.listActivities(slug, user.id, user.role);
}

@Post(':slug/activities')
@Roles('teacher')
importActivity(
  @Param('slug') slug: string,
  @Body() dto: ImportActivityDto,
  @CurrentUser() user: { id: string },
) {
  return this.classrooms.importActivity(slug, user.id, dto);
}

@Patch(':slug/activities/:activityId')
@Roles('teacher')
updateActivity(
  @Param('slug') slug: string,
  @Param('activityId') activityId: string,
  @Body() data: { dueDate?: string; overrides?: Record<string, any>; isActive?: boolean },
  @CurrentUser() user: { id: string },
) {
  return this.classrooms.updateActivity(slug, user.id, activityId, data);
}

@Delete(':slug/activities/:activityId')
@Roles('teacher')
removeActivity(
  @Param('slug') slug: string,
  @Param('activityId') activityId: string,
  @CurrentUser() user: { id: string },
) {
  return this.classrooms.removeActivity(slug, user.id, activityId);
}
```

- [ ] **Step 6: Update ClassroomsModule to import TemplatesModule**

In `backend/src/classrooms/classrooms.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { ClassroomsController } from './classrooms.controller';
import { GamificationModule } from '../gamification/gamification.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [GamificationModule, TemplatesModule],
  providers: [ClassroomsService],
  controllers: [ClassroomsController],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}
```

- [ ] **Step 7: Start dev server and verify endpoints exist in Swagger**

```bash
cd backend
npm run start:dev
```

Open http://localhost:3000/api/docs and confirm you see:
- `GET /classrooms/{slug}/activities`
- `POST /classrooms/{slug}/activities`
- `GET /courses/{courseId}/templates`
- `POST /courses/{courseId}/templates`
- `PATCH /templates/{id}/review`

- [ ] **Step 8: Commit**

```bash
git add backend/src/classrooms backend/src/templates
git commit -m "feat(classrooms): add activity CRUD endpoints and courseId in DTO"
```

---

### Task 6: Frontend — Course selector in classroom creation form

**Files:**
- Modify: `frontend/src/app/features/teacher/classrooms/teacher-classrooms.component.ts`
- Modify: `frontend/src/app/features/teacher/classrooms/teacher-classrooms.component.html`

**Interfaces:**
- Consumes: `GET /api/courses`
- Produces: classroom creation form sends `courseId` instead of `subject`

- [ ] **Step 1: Add courses signal and load logic to component**

In `teacher-classrooms.component.ts`, add:

```typescript
import { signal, computed } from '@angular/core';
// Add to class:
courses = signal<{ id: string; name: string; category: string; icon: string }[]>([]);

// In constructor or ngOnInit, load courses:
private loadCourses(): void {
  this.http.get<any[]>(`${environment.apiUrl}/courses`).subscribe({
    next: (data) => this.courses.set(data),
    error: () => undefined,
  });
}
```

Call `this.loadCourses()` inside `ngOnInit`.

Also update `newClass` form object — replace `subject: ''` with `courseId: ''`:

```typescript
newClass = { name: '', courseId: '', gradeLevel: '', description: '' };
```

- [ ] **Step 2: Update template — replace subject input with course dropdown**

In `teacher-classrooms.component.html`, find the `subject` input field and replace it with:

```html
<div>
  <label class="block text-sm font-medium text-gray-700 mb-1">Curso</label>
  <select
    [(ngModel)]="newClass.courseId"
    name="courseId"
    required
    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
  >
    <option value="" disabled>Selecciona un curso</option>
    @for (course of courses(); track course.id) {
      <option [value]="course.id">{{ course.icon }} {{ course.name }}</option>
    }
  </select>
</div>
```

- [ ] **Step 3: Verify in browser**

Start frontend (`npm start` from `frontend/`). Navigate to the teacher classrooms page. The create form should show a **Curso** dropdown populated with the 7 seeded courses. Creating a classroom without selecting a course should fail validation.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/features/teacher/classrooms
git commit -m "feat(teacher): replace subject field with course selector in classroom form"
```

---

### Task 7: Frontend — Director courses management page

**Files:**
- Create: `frontend/src/app/features/director/courses/director-courses.component.ts`
- Create: `frontend/src/app/features/director/courses/director-courses.component.html`
- Modify: `frontend/src/app/features/director/director.routes.ts`

**Interfaces:**
- Consumes: `GET /api/courses`, `POST /api/courses`, `PATCH /api/courses/:id`, `DELETE /api/courses/:id`
- Produces: `/director/courses` route

- [ ] **Step 1: Create component**

Create `frontend/src/app/features/director/courses/director-courses.component.ts`:

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '@env/environment';

interface Course {
  id: string; name: string; description?: string; icon?: string;
  color?: string; category: string; isActive: boolean;
  _count?: { homeworkTemplates: number; exerciseTemplates: number; formTemplates: number; examTemplates: number };
}

@Component({
  selector: 'app-director-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './director-courses.component.html',
})
export class DirectorCoursesComponent implements OnInit {
  courses = signal<Course[]>([]);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  categories = ['mathematics', 'sciences', 'language', 'social', 'arts', 'other'];
  form = { name: '', description: '', icon: '', color: '#6366F1', category: 'mathematics' };

  constructor(private http: HttpClient) {}

  ngOnInit() { this.load(); }

  load() {
    this.http.get<Course[]>(`${environment.apiUrl}/courses`).subscribe({
      next: (data) => this.courses.set(data),
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.form = { name: '', description: '', icon: '', color: '#6366F1', category: 'mathematics' };
    this.showForm.set(true);
  }

  openEdit(c: Course) {
    this.editingId.set(c.id);
    this.form = { name: c.name, description: c.description ?? '', icon: c.icon ?? '', color: c.color ?? '#6366F1', category: c.category };
    this.showForm.set(true);
  }

  save() {
    const id = this.editingId();
    const obs = id
      ? this.http.patch(`${environment.apiUrl}/courses/${id}`, this.form)
      : this.http.post(`${environment.apiUrl}/courses`, this.form);
    obs.subscribe({ next: () => { this.showForm.set(false); this.load(); } });
  }

  deactivate(id: string) {
    if (!confirm('¿Desactivar este curso?')) return;
    this.http.delete(`${environment.apiUrl}/courses/${id}`).subscribe({ next: () => this.load() });
  }

  totalTemplates(c: Course): number {
    if (!c._count) return 0;
    return c._count.homeworkTemplates + c._count.exerciseTemplates + c._count.formTemplates + c._count.examTemplates;
  }
}
```

- [ ] **Step 2: Create template**

Create `frontend/src/app/features/director/courses/director-courses.component.html`:

```html
<div class="p-6 max-w-5xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Catálogo de Cursos</h1>
    <button (click)="openCreate()"
      class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
      + Nuevo curso
    </button>
  </div>

  <!-- Course table -->
  <div class="bg-white rounded-xl shadow overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 text-gray-500 uppercase text-xs">
        <tr>
          <th class="px-4 py-3 text-left">Curso</th>
          <th class="px-4 py-3 text-left">Categoría</th>
          <th class="px-4 py-3 text-center">Plantillas</th>
          <th class="px-4 py-3 text-center">Estado</th>
          <th class="px-4 py-3 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        @for (course of courses(); track course.id) {
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium">
              {{ course.icon }} {{ course.name }}
            </td>
            <td class="px-4 py-3 text-gray-500">{{ course.category }}</td>
            <td class="px-4 py-3 text-center text-gray-700">{{ totalTemplates(course) }}</td>
            <td class="px-4 py-3 text-center">
              <span [class]="course.isActive ? 'text-green-700 bg-green-100' : 'text-gray-500 bg-gray-100'"
                class="px-2 py-1 rounded-full text-xs font-medium">
                {{ course.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right space-x-2">
              <a [routerLink]="['/director/courses', course.id, 'templates']"
                class="text-purple-600 hover:underline text-xs">Plantillas</a>
              <button (click)="openEdit(course)" class="text-blue-600 hover:underline text-xs">Editar</button>
              <button (click)="deactivate(course.id)" class="text-red-500 hover:underline text-xs">Desactivar</button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>

  <!-- Modal form -->
  @if (showForm()) {
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h2 class="text-lg font-semibold mb-4">{{ editingId() ? 'Editar' : 'Nuevo' }} curso</h2>
        <div class="space-y-3">
          <input [(ngModel)]="form.name" placeholder="Nombre *" class="w-full border rounded-lg px-3 py-2 text-sm" />
          <input [(ngModel)]="form.description" placeholder="Descripción" class="w-full border rounded-lg px-3 py-2 text-sm" />
          <div class="flex gap-3">
            <input [(ngModel)]="form.icon" placeholder="Ícono (emoji)" class="w-24 border rounded-lg px-3 py-2 text-sm" />
            <input type="color" [(ngModel)]="form.color" class="h-10 w-16 border rounded-lg cursor-pointer" />
          </div>
          <select [(ngModel)]="form.category" class="w-full border rounded-lg px-3 py-2 text-sm">
            @for (cat of categories; track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>
        </div>
        <div class="flex gap-3 mt-5 justify-end">
          <button (click)="showForm.set(false)" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button (click)="save()" class="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">Guardar</button>
        </div>
      </div>
    </div>
  }
</div>
```

- [ ] **Step 3: Add route to director.routes.ts**

In `frontend/src/app/features/director/director.routes.ts`, add:

```typescript
{
  path: 'courses',
  loadComponent: () => import('./courses/director-courses.component').then(m => m.DirectorCoursesComponent),
},
{
  path: 'courses/:courseId/templates',
  loadComponent: () => import('./templates/director-templates.component').then(m => m.DirectorTemplatesComponent),
},
```

- [ ] **Step 4: Verify in browser**

Navigate to `/director/courses`. The table should show the 7 seeded courses. Creating and editing a course should work. Clicking "Plantillas" links to the templates page (created in Task 8).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/director/courses frontend/src/app/features/director/director.routes.ts
git commit -m "feat(director): add courses management page"
```

---

### Task 8: Frontend — Director template review page

**Files:**
- Create: `frontend/src/app/features/director/templates/director-templates.component.ts`
- Create: `frontend/src/app/features/director/templates/director-templates.component.html`

**Interfaces:**
- Consumes: `GET /api/courses/:courseId/templates`, `PATCH /api/templates/:id/review?type=...`, `DELETE /api/templates/:id?type=...`

- [ ] **Step 1: Create component**

Create `frontend/src/app/features/director/templates/director-templates.component.ts`:

```typescript
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@env/environment';

interface Template {
  id: string; title: string; description?: string; status: string;
  activityType: string; difficulty: string; xpReward: number;
  author: { id: string; name: string }; rejectionNote?: string;
}

@Component({
  selector: 'app-director-templates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './director-templates.component.html',
})
export class DirectorTemplatesComponent implements OnInit {
  courseId = '';
  templates = signal<Template[]>([]);
  tab = signal<'pending' | 'approved' | 'rejected'>('pending');
  rejectNote = '';
  rejectingId = signal<{ id: string; type: string } | null>(null);

  filtered = computed(() => this.templates().filter(t => t.status === this.tab()));
  pendingCount = computed(() => this.templates().filter(t => t.status === 'pending').length);

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('courseId') ?? '';
    this.load();
  }

  load() {
    this.http.get<Template[]>(`${environment.apiUrl}/courses/${this.courseId}/templates`).subscribe({
      next: (data) => this.templates.set(data),
    });
  }

  approve(t: Template) {
    this.http.patch(`${environment.apiUrl}/templates/${t.id}/review?type=${t.activityType}`,
      { approved: true }).subscribe({ next: () => this.load() });
  }

  openReject(t: Template) {
    this.rejectNote = '';
    this.rejectingId.set({ id: t.id, type: t.activityType });
  }

  confirmReject() {
    const r = this.rejectingId();
    if (!r) return;
    this.http.patch(`${environment.apiUrl}/templates/${r.id}/review?type=${r.type}`,
      { approved: false, note: this.rejectNote }).subscribe({ next: () => { this.rejectingId.set(null); this.load(); } });
  }

  remove(t: Template) {
    if (!confirm('¿Eliminar esta plantilla del banco?')) return;
    this.http.delete(`${environment.apiUrl}/templates/${t.id}?type=${t.activityType}`).subscribe({ next: () => this.load() });
  }
}
```

- [ ] **Step 2: Create template**

Create `frontend/src/app/features/director/templates/director-templates.component.html`:

```html
<div class="p-6 max-w-5xl mx-auto">
  <h1 class="text-2xl font-bold text-gray-900 mb-6">Banco de Plantillas</h1>

  <!-- Tabs -->
  <div class="flex gap-4 border-b border-gray-200 mb-6">
    @for (t of [['pending','Pendientes'],['approved','Aprobadas'],['rejected','Rechazadas']]; track t[0]) {
      <button (click)="tab.set(t[0] as any)"
        [class.border-b-2]="tab() === t[0]"
        [class.border-purple-600]="tab() === t[0]"
        [class.text-purple-600]="tab() === t[0]"
        class="pb-2 text-sm font-medium text-gray-500 transition-colors">
        {{ t[1] }}
        @if (t[0] === 'pending' && pendingCount() > 0) {
          <span class="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{{ pendingCount() }}</span>
        }
      </button>
    }
  </div>

  <!-- Template cards -->
  <div class="space-y-3">
    @for (tmpl of filtered(); track tmpl.id) {
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-semibold text-gray-900">{{ tmpl.title }}</p>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ tmpl.activityType }} · {{ tmpl.difficulty }} · {{ tmpl.xpReward }} XP · por {{ tmpl.author.name }}
            </p>
            @if (tmpl.description) {
              <p class="text-sm text-gray-600 mt-1">{{ tmpl.description }}</p>
            }
            @if (tmpl.rejectionNote) {
              <p class="text-xs text-red-600 mt-1">Rechazada: {{ tmpl.rejectionNote }}</p>
            }
          </div>
          <div class="flex gap-2 ml-4 shrink-0">
            @if (tab() === 'pending') {
              <button (click)="approve(tmpl)"
                class="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Aprobar</button>
              <button (click)="openReject(tmpl)"
                class="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600">Rechazar</button>
            }
            <button (click)="remove(tmpl)"
              class="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">Eliminar</button>
          </div>
        </div>
      </div>
    }
    @if (filtered().length === 0) {
      <p class="text-center text-gray-400 py-12">No hay plantillas en esta sección.</p>
    }
  </div>

  <!-- Reject modal -->
  @if (rejectingId()) {
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 class="font-semibold text-gray-900 mb-3">Rechazar plantilla</h3>
        <textarea [(ngModel)]="rejectNote" placeholder="Motivo del rechazo (opcional)"
          rows="3" class="w-full border rounded-lg px-3 py-2 text-sm resize-none"></textarea>
        <div class="flex gap-3 mt-4 justify-end">
          <button (click)="rejectingId.set(null)" class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button (click)="confirmReject()" class="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Rechazar</button>
        </div>
      </div>
    </div>
  }
</div>
```

- [ ] **Step 3: Verify in browser**

Navigate to `/director/courses`, click "Plantillas" on a course. You should see the three tabs. With no templates yet, all tabs show the empty state.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/features/director/templates
git commit -m "feat(director): add template review page with approve/reject flow"
```

---

### Task 9: Frontend — Teacher template bank + import modal

**Files:**
- Create: `frontend/src/app/features/teacher/templates/teacher-templates.component.ts`
- Create: `frontend/src/app/features/teacher/templates/teacher-templates.component.html`
- Modify: `frontend/src/app/features/teacher/teacher.routes.ts`

**Interfaces:**
- Consumes: `GET /api/courses/:courseId/templates`, `POST /api/classrooms/:slug/activities`
- Produces: `/teacher/courses/:courseId/templates` route

- [ ] **Step 1: Create component**

Create `frontend/src/app/features/teacher/templates/teacher-templates.component.ts`:

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@env/environment';

interface Template {
  id: string; title: string; description?: string;
  activityType: string; difficulty: string; xpReward: number;
}
interface Classroom { id: string; slug: string; name: string; }

@Component({
  selector: 'app-teacher-templates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-templates.component.html',
})
export class TeacherTemplatesComponent implements OnInit {
  courseId = '';
  templates = signal<Template[]>([]);
  classrooms = signal<Classroom[]>([]);
  importing = signal<Template | null>(null);
  importForm = { classroomSlug: '', mode: 'copy' as 'copy' | 'reference', dueDate: '' };
  importSuccess = signal(false);

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('courseId') ?? '';
    this.http.get<Template[]>(`${environment.apiUrl}/courses/${this.courseId}/templates`).subscribe({
      next: (data) => this.templates.set(data),
    });
    this.http.get<Classroom[]>(`${environment.apiUrl}/classrooms`).subscribe({
      next: (data) => this.classrooms.set(data),
    });
  }

  openImport(t: Template) {
    this.importForm = { classroomSlug: '', mode: 'copy', dueDate: '' };
    this.importing.set(t);
    this.importSuccess.set(false);
  }

  confirmImport() {
    const t = this.importing();
    if (!t || !this.importForm.classroomSlug) return;
    this.http.post(`${environment.apiUrl}/classrooms/${this.importForm.classroomSlug}/activities`, {
      activityType: t.activityType,
      templateId: t.id,
      mode: this.importForm.mode,
      dueDate: this.importForm.dueDate || undefined,
    }).subscribe({
      next: () => { this.importSuccess.set(true); setTimeout(() => this.importing.set(null), 1200); },
    });
  }
}
```

- [ ] **Step 2: Create template**

Create `frontend/src/app/features/teacher/templates/teacher-templates.component.html`:

```html
<div class="p-6 max-w-5xl mx-auto">
  <h1 class="text-2xl font-bold text-gray-900 mb-6">Banco de Plantillas</h1>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    @for (tmpl of templates(); track tmpl.id) {
      <div class="bg-white rounded-xl border border-gray-200 p-4 flex flex-col justify-between">
        <div>
          <span class="text-xs font-medium text-purple-600 uppercase tracking-wide">{{ tmpl.activityType }}</span>
          <p class="font-semibold text-gray-900 mt-1">{{ tmpl.title }}</p>
          @if (tmpl.description) {
            <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ tmpl.description }}</p>
          }
          <p class="text-xs text-gray-400 mt-2">{{ tmpl.difficulty }} · {{ tmpl.xpReward }} XP</p>
        </div>
        <button (click)="openImport(tmpl)"
          class="mt-4 w-full py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
          Importar al salón
        </button>
      </div>
    }
    @if (templates().length === 0) {
      <p class="col-span-3 text-center text-gray-400 py-16">No hay plantillas aprobadas para este curso.</p>
    }
  </div>

  <!-- Import modal -->
  @if (importing()) {
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        @if (importSuccess()) {
          <div class="text-center py-4">
            <p class="text-2xl">✅</p>
            <p class="font-semibold text-green-700 mt-2">¡Importada correctamente!</p>
          </div>
        } @else {
          <h3 class="font-semibold text-gray-900 mb-4">Importar "{{ importing()!.title }}"</h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-gray-600 block mb-1">Salón destino</label>
              <select [(ngModel)]="importForm.classroomSlug"
                class="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="" disabled>Selecciona un salón</option>
                @for (c of classrooms(); track c.id) {
                  <option [value]="c.slug">{{ c.name }}</option>
                }
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-600 block mb-1">Modo</label>
              <select [(ngModel)]="importForm.mode" class="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="copy">Copia (independiente)</option>
                <option value="reference">Referencia (recibe actualizaciones)</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-600 block mb-1">Fecha límite (opcional)</label>
              <input type="date" [(ngModel)]="importForm.dueDate"
                class="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div class="flex gap-3 mt-5 justify-end">
            <button (click)="importing.set(null)"
              class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button (click)="confirmImport()"
              class="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">Importar</button>
          </div>
        }
      </div>
    </div>
  }
</div>
```

- [ ] **Step 3: Add route to teacher.routes.ts**

In `frontend/src/app/features/teacher/teacher.routes.ts`, add:

```typescript
{
  path: 'courses/:courseId/templates',
  loadComponent: () => import('./templates/teacher-templates.component').then(m => m.TeacherTemplatesComponent),
},
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/features/teacher/templates frontend/src/app/features/teacher/teacher.routes.ts
git commit -m "feat(teacher): add template bank view with import modal"
```

---

### Task 10: Frontend — Classroom activities tab

**Files:**
- Modify: teacher classroom detail component (find it via `Glob "**/*classroom-detail*"` or check teacher routes)

**Interfaces:**
- Consumes: `GET /api/classrooms/:slug/activities`, `POST`, `DELETE /api/classrooms/:slug/activities/:id`
- Produces: new "Actividades" tab in teacher classroom detail

- [ ] **Step 1: Locate the classroom detail component**

```bash
cd frontend
npx ng serve --dry-run 2>$null
```

Run from `frontend/`:
```bash
find src/app/features/teacher -name "*.ts" | xargs grep -l "findBySlug\|classroom-detail\|getClassroom" 2>/dev/null | head -5
```

Or use Glob to find it: look for `teacher/classrooms` or `teacher/classroom` detail component files.

- [ ] **Step 2: Add activities signal and load method**

In the classroom detail component TypeScript file, add:

```typescript
activities = signal<any[]>([]);
activeTab = signal<'students' | 'behaviors' | 'rewards' | 'quests' | 'activities'>('students');

loadActivities(slug: string): void {
  this.http.get<any[]>(`${environment.apiUrl}/classrooms/${slug}/activities`).subscribe({
    next: (data) => this.activities.set(data),
    error: () => undefined,
  });
}
```

Call `this.loadActivities(slug)` after the classroom data loads.

- [ ] **Step 3: Add tab button in HTML**

In the classroom detail HTML, find the tab navigation row and add an **Actividades** tab button alongside the existing ones:

```html
<button (click)="activeTab.set('activities')"
  [class.border-b-2]="activeTab() === 'activities'"
  [class.border-purple-600]="activeTab() === 'activities'"
  class="px-4 py-2 text-sm font-medium text-gray-600">
  Actividades
</button>
```

- [ ] **Step 4: Add activities tab panel**

In the same HTML, add the tab panel after the existing panels:

```html
@if (activeTab() === 'activities') {
  <div class="space-y-3">
    <div class="flex justify-end">
      <a [routerLink]="['/teacher/courses', classroom()?.courseId, 'templates']"
        class="text-sm text-purple-600 hover:underline">
        + Importar del banco
      </a>
    </div>
    @for (act of activities(); track act.id) {
      <div class="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <span class="text-xs font-medium text-purple-600 uppercase">{{ act.activityType }}</span>
          <p class="font-medium text-gray-900 mt-0.5">{{ act.overrides?.title ?? '(sin título)' }}</p>
          @if (act.dueDate) {
            <p class="text-xs text-gray-400 mt-0.5">Fecha límite: {{ act.dueDate | date:'dd/MM/yyyy' }}</p>
          }
        </div>
        <button (click)="removeActivity(act.id)"
          class="text-xs text-red-500 hover:underline">Eliminar</button>
      </div>
    }
    @if (activities().length === 0) {
      <p class="text-center text-gray-400 py-10">No hay actividades en este salón. Importa del banco.</p>
    }
  </div>
}
```

- [ ] **Step 5: Add removeActivity method**

```typescript
removeActivity(activityId: string): void {
  const slug = this.classroom()?.slug;
  if (!slug || !confirm('¿Eliminar esta actividad del salón?')) return;
  this.http.delete(`${environment.apiUrl}/classrooms/${slug}/activities/${activityId}`).subscribe({
    next: () => this.activities.update(list => list.filter(a => a.id !== activityId)),
  });
}
```

- [ ] **Step 6: Verify end-to-end flow in browser**

1. Director creates/verifies a course exists.
2. Teacher creates a classroom linked to that course.
3. Teacher proposes a template at `/teacher/courses/:courseId/templates` → "Proponer" (if this button is missing, it can be added later as a follow-up).
4. Director reviews at `/director/courses/:courseId/templates` and approves.
5. Teacher imports the template to their classroom via the import modal.
6. Classroom detail → Actividades tab shows the imported activity.

- [ ] **Step 7: Run lint on both projects**

```bash
cd backend && npm run lint
cd ../frontend && npm run lint
```

Expected: no errors.

- [ ] **Step 8: Final commit**

```bash
git add frontend/src/app/features/teacher
git commit -m "feat(teacher): add Activities tab to classroom detail"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Course catalog CRUD by director/admin — Task 3
- ✅ courseId FK on Classroom — Task 1
- ✅ 4 typed template models — Task 2
- ✅ Teacher proposes → pending; director auto-approves — Task 4
- ✅ Approve/reject flow with notification — Task 4
- ✅ Bank visibility rules (approved only for teacher) — Task 4
- ✅ ClassroomActivity with copy/reference modes — Task 5
- ✅ Snapshot logic for copy mode — Task 5
- ✅ Course dropdown in classroom form — Task 6
- ✅ Director courses page — Task 7
- ✅ Director template review — Task 8
- ✅ Teacher bank + import modal — Task 9
- ✅ Classroom activities tab — Task 10
- ✅ `template_review` NotificationType + buildNotificationContent case — Task 4

**Skipped (out of scope per spec):** student submission of answers, auto-grading, curriculum ordering, duplicating courses.
