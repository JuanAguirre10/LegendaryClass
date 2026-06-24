# Quest Submissions — Design Spec

## Goal

Add an evidence submission and approval workflow to LegendaryClass quests. Teachers can mark a quest as "requires submission"; students upload a file as evidence; the teacher approves or rejects with optional feedback. XP is awarded only on approval.

## Global Constraints

- Angular 18 standalone components — no NgModules
- All new routes use lazy `loadComponent`
- Every new HTML element must carry `dark:` Tailwind variants
- New `@Body()` params use DTO classes with `class-validator`, not inline types
- Do NOT add a second file-upload library — use Multer (bundled with `@nestjs/platform-express`)
- File storage: local disk at `backend/uploads/submissions/`; served as static at `/uploads`
- Allowed file types: jpeg, jpg, png, gif, webp, pdf
- Max file size: 10 MB per upload
- `QuestStudent.isCompleted` is set to `true` by the existing `complete()` helper — `approve()` calls it; do not duplicate the XP-award logic
- Notifications use the existing `NotificationService` (already injectable)
- `SubmissionStatus` enum values: `pending`, `approved`, `rejected`

---

## Data Model

### Extend `Quest` model

Add two fields to the existing `Quest` model in `backend/prisma/schema.prisma`:

```prisma
requiresSubmission Boolean @default(false)
maxAttempts        Int     @default(1)
```

`maxAttempts` is only meaningful when `requiresSubmission = true`. The frontend should hide it when `requiresSubmission` is false.

### New `QuestSubmission` model

```prisma
model QuestSubmission {
  id            String           @id @default(cuid())
  questId       String
  studentId     String
  fileUrl       String           // relative path: /uploads/submissions/<filename>
  fileName      String           // original filename for display
  status        SubmissionStatus @default(pending)
  attemptNumber Int              // 1, 2, 3… enforced by service
  teacherNotes  String?          // feedback on approve or reject
  submittedAt   DateTime         @default(now())
  reviewedAt    DateTime?

  quest   Quest @relation(fields: [questId],   references: [id], onDelete: Cascade)
  student User  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([questId, studentId, attemptNumber])
  @@index([questId])
  @@index([studentId])
  @@map("quest_submissions")
}

enum SubmissionStatus {
  pending
  approved
  rejected
}
```

Add relation field to `Quest`:
```prisma
submissions QuestSubmission[]
```

Add relation field to `User`:
```prisma
questSubmissions QuestSubmission[]
```

---

## Backend

### File serving

In `backend/src/main.ts`, add static asset serving before `app.listen()`:

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
// ...
app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), { prefix: '/uploads' });
```

Create the upload directory: `backend/uploads/submissions/.gitkeep`

### New DTOs (`backend/src/quests/dto/quest-submission.dto.ts`)

```typescript
export class ApproveSubmissionDto {
  @IsOptional() @IsString() teacherNotes?: string;
}

export class RejectSubmissionDto {
  @IsString() @MinLength(1) teacherNotes!: string; // required on reject
}
```

### Extend `CreateQuestDto` (`backend/src/quests/dto/create-quest.dto.ts`)

Add:
```typescript
@IsOptional() @IsBoolean() requiresSubmission?: boolean;
@IsOptional() @IsInt() @Min(1) @Max(10) maxAttempts?: number;
```

### New endpoints (added to `QuestsController`)

```
POST   /quests/:id/submit                    JwtAuthGuard — student submits file
GET    /quests/submissions/pending           JwtAuthGuard — teacher: all pending submissions across their classrooms
GET    /quests/:id/submissions               JwtAuthGuard — teacher: submissions for one quest
PATCH  /quests/submissions/:subId/approve    JwtAuthGuard — teacher approves
PATCH  /quests/submissions/:subId/reject     JwtAuthGuard — teacher rejects (teacherNotes required)
```

**`POST /quests/:id/submit`** uses `FileInterceptor('file')` from `@nestjs/platform-express` with Multer options:
- `dest: 'uploads/submissions'`
- `limits: { fileSize: 10 * 1024 * 1024 }` (10 MB)
- `fileFilter`: accept only jpeg/jpg/png/gif/webp/pdf by mimetype

### `QuestsService` new methods

**`submitEvidence(questId, studentId, file: Express.Multer.File): Promise<QuestSubmission>`**
1. Load quest; verify `requiresSubmission === true`, status is `active`, `dueDate` not passed
2. Count prior submissions for this student/quest; if `count >= maxAttempts`, throw `ForbiddenException('Sin intentos restantes')`
3. Check no `pending` submission already exists (student must wait for review before resubmitting)
4. Create `QuestSubmission` with `attemptNumber = count + 1`, `fileUrl = '/uploads/submissions/' + file.filename`, `fileName = file.originalname`
5. Notify teacher: `NotificationService.createForUser(teacherId, { type: 'quest_submission', title: '...', body: '...' })`
6. Return created submission

**`getPendingSubmissions(teacherId): Promise<QuestSubmission[]>`**
- Find all classrooms where `teacherId` matches
- Return submissions with status `pending` for quests in those classrooms
- Include: `quest { title, classroomId }`, `student { name, avatar }`

**`getQuestSubmissions(questId, teacherId): Promise<QuestSubmission[]>`**
- Verify teacher owns the quest's classroom
- Return all submissions for that quest ordered by `submittedAt desc`
- Include: `student { name, avatar }`

**`approveSubmission(subId, teacherId, dto: ApproveSubmissionDto): Promise<void>`**
1. Load submission; verify teacher owns the quest
2. Set `status = approved`, `teacherNotes = dto.teacherNotes`, `reviewedAt = now()`
3. Call existing `complete(questId, studentId)` to award XP and mark `QuestStudent.isCompleted`
4. Notify student: submission approved + XP earned

**`rejectSubmission(subId, teacherId, dto: RejectSubmissionDto): Promise<void>`**
1. Load submission; verify teacher owns the quest
2. Set `status = rejected`, `teacherNotes = dto.teacherNotes`, `reviewedAt = now()`
3. Notify student: submission rejected + feedback message

### Access control

All submission endpoints use `JwtAuthGuard` only. Role enforcement is done inside the service methods (teacher ownership check / student ownership check) rather than `RolesGuard`, consistent with the existing quest patterns.

---

## Frontend

### Student side — modify `StudentQuestsComponent`

**Quest card changes:**
- If `quest.requiresSubmission === false`: keep existing "Completar" button (instant flow unchanged)
- If `quest.requiresSubmission === true`:
  - Show latest submission status on the card: `⏳ Pendiente revisión` / `✅ Aprobada` / `❌ Rechazada`
  - Show teacher feedback below status if rejected
  - Show attempts remaining: `Intentos: N / maxAttempts`
  - Button: `📎 Entregar Evidencia` (if no pending submission and attempts remain) or `🔄 Volver a entregar` (if last was rejected)

**Submission modal (inline in the component, shown/hidden with a signal):**
- File input (drag-and-drop area) with preview: thumbnail for images, filename for PDF
- Validates: max 10 MB, accepted types
- Submit button → `POST /quests/:id/submit` as `multipart/form-data`
- On success: closes modal, refreshes quest status

**HTTP:** The existing `findForStudent` endpoint is extended to include `latestSubmission: QuestSubmission | null` per quest. No new student-facing endpoint needed.

### Teacher side — new page `TeacherQuestSubmissionsComponent`

**Route:** `/teacher/quest-submissions`  
**File:** `frontend/src/app/features/teacher/quest-submissions/teacher-quest-submissions.component.ts`

**Layout:**
- Nav bar (same as other teacher pages)
- Header: `📋 BANDEJA DE ENTREGAS`
- Pending count badge: `N pendientes`
- Table/list of pending submissions:
  - Student avatar + name
  - Quest title + classroom name
  - Submission date (relative: "hace 2h")
  - File link (opens in new tab)
  - **Aprobar** button (green) → inline confirm or immediate
  - **Rechazar** button (red) → expands a textarea for feedback inline, then confirm

**Nav link** added to teacher dashboard: `📋 Entregas` with a badge showing pending count (fetched on init)

### Extend `CreateQuestModal` (teacher quest creation)

Add to the quest creation form:
- Toggle: `¿Requiere entrega de evidencia?` (checkbox)
- When checked: reveal `Intentos permitidos` number input (1–10, default 1)

### `QuestSubmissionStatus` interface (in a shared types file or in the component):

```typescript
export interface QuestSubmission {
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
```

---

## Notifications

Using the existing `NotificationService`. Two notification types to add to the handler:

| Event | Recipient | Title | Body |
|---|---|---|---|
| Student submits | Teacher | `📎 Nueva entrega` | `${studentName} entregó evidencia para "${questTitle}"` |
| Teacher approves | Student | `✅ Entrega aprobada` | `Tu entrega para "${questTitle}" fue aprobada. +${xpReward} XP` |
| Teacher rejects | Student | `❌ Entrega rechazada` | `Tu entrega para "${questTitle}" fue rechazada: ${teacherNotes}` |

---

## Data flow summary

```
Student uploads file
  → POST /quests/:id/submit (multipart)
  → QuestsService.submitEvidence()
      → validates attempts
      → Multer saves to uploads/submissions/
      → creates QuestSubmission { status: pending }
      → NotificationService → teacher notified

Teacher opens /teacher/quest-submissions
  → GET /quests/submissions/pending
  → sees file link + student name + quest

Teacher approves
  → PATCH /quests/submissions/:subId/approve
  → QuestsService.approveSubmission()
      → QuestSubmission.status = approved
      → complete(questId, studentId) → XP awarded
      → NotificationService → student notified

Teacher rejects
  → PATCH /quests/submissions/:subId/reject { teacherNotes }
  → QuestsService.rejectSubmission()
      → QuestSubmission.status = rejected
      → NotificationService → student notified (with feedback)
```

---

## Testing

- `QuestsService.submitEvidence`: assert attempt count enforced (throws when `count >= maxAttempts`); assert blocks second pending submission; assert creates submission with correct `attemptNumber`
- `QuestsService.approveSubmission`: assert calls `complete()` and sets `reviewedAt`
- `QuestsService.rejectSubmission`: assert `teacherNotes` required (DTO validation); assert does NOT call `complete()`
- `TeacherQuestSubmissionsComponent`: assert pending list renders; assert reject reveals feedback textarea
