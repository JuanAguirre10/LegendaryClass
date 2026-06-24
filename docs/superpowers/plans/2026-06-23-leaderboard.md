# Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated full-page leaderboard (per-classroom + global tabs, real-time via WebSocket) accessible to students, teachers, and directors.

**Architecture:** A shared `LeaderboardPageComponent` lazy-loaded at three role routes reuses the existing `ClassroomRankingComponent` (enhanced) for the classroom tab and renders a new global tab subscribed to a new `ranking:global` WebSocket event. Backend adds `RankingSnapshot` (for weekly rank-change deltas), a `GET /ranking/global` endpoint, and wires `emitGlobalRankingUpdate()` into `GamificationService`.

**Tech Stack:** NestJS + Prisma + PostgreSQL (backend); Angular 18 standalone + TailwindCSS + Socket.io-client (frontend).

## Global Constraints

- Angular 18 standalone components — no NgModules anywhere
- All new routes use lazy `loadComponent`
- Every new HTML element must carry `dark:` Tailwind variants (dark mode is active via `darkMode: 'class'` in Tailwind + `.dark` on `<html>`)
- New `@Body()` params must use DTO classes with `class-validator`, not inline TypeScript types
- Do NOT add a second Socket.io gateway — extend the existing `RankingGateway` in `backend/src/ranking/ranking.gateway.ts`
- Global ranking metric is `User.experiencePoints` (never decreases)
- `RankingSnapshot.scope` stores either a `classroomId` string or the literal `'global'` — never null (avoids PostgreSQL NULL uniqueness issues)
- Rank change formula: `previousRank - currentRank` (positive = moved up, negative = moved down, null = no prior snapshot)
- Run all backend tests with `npm test` from `backend/`; run frontend type-check with `npx tsc --noEmit` from `frontend/`

---

### Task 1: Prisma — RankingSnapshot model

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Produces: `RankingSnapshot` Prisma model used by Tasks 2–3

- [ ] **Step 1: Add `RankingSnapshot` model and `User` relation to `schema.prisma`**

In `backend/prisma/schema.prisma`, add this model after the `Notification` model at the end of the file:

```prisma
// ─── RankingSnapshot ───────────────────────────────────────────────────────

model RankingSnapshot {
  id        String   @id @default(cuid())
  studentId String
  scope     String   // classroomId OR 'global'
  rank      Int
  points    Int
  weekStart DateTime // ISO Monday 00:00 UTC of the snapshot week

  student User @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([studentId, scope, weekStart])
  @@index([scope, weekStart])
  @@map("ranking_snapshots")
}
```

Also add the relation field to the `User` model (after the `notifications` relation line):

```prisma
  rankingSnapshots  RankingSnapshot[]
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd backend
npm run db:migrate
# When prompted for migration name, enter: add_ranking_snapshot
```

Expected: migration created and applied, no errors.

- [ ] **Step 3: Regenerate Prisma client**

```bash
npm run db:generate
```

Expected: no errors, `node_modules/.prisma/client` updated.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(ranking): add RankingSnapshot model for weekly rank-change tracking"
```

---

### Task 2: RankingService — extend interfaces, add global ranking and snapshot methods

**Files:**
- Modify: `backend/src/ranking/ranking.service.ts`
- Modify: `backend/src/ranking/ranking.service.spec.ts`

**Interfaces:**
- Consumes: `RankingSnapshot` Prisma model (Task 1)
- Produces:
  - `RankingInput` interface (extended with `avatar`, `weeklyXpDelta`, `streakDays`)
  - `RankingEntry` interface (extended with `rankChange: number | null`)
  - `RankingService.getGlobalRanking(user: { id: string; role: string }): Promise<RankingEntry[]>`
  - `RankingService.takeWeeklySnapshot(scope: string, entries: RankingEntry[]): Promise<void>`
  - `RankingService.takeSnapshotForScope(scope: string): Promise<void>`

- [ ] **Step 1: Write failing tests**

Replace the full content of `backend/src/ranking/ranking.service.spec.ts`:

```typescript
import { RankingService, RankingInput } from './ranking.service';
import { PrismaService } from '../prisma/prisma.service';

// Helper: creates a minimal RankingInput
const row = (
  studentId: string,
  name: string,
  totalPoints: number,
  level = 1,
  characterType: string | null = null,
): RankingInput => ({
  studentId, name, totalPoints, level, characterType,
  avatar: null, weeklyXpDelta: 0, streakDays: 0,
});

describe('RankingService.buildRanking', () => {
  let service: RankingService;
  beforeEach(() => { service = new RankingService({} as PrismaService); });

  it('ordena por puntos descendente y asigna rank 1..N', () => {
    const result = service.buildRanking([row('a', 'Ana', 100), row('b', 'Beto', 300), row('c', 'Cris', 200)]);
    expect(result.map((r) => r.studentId)).toEqual(['b', 'c', 'a']);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('desempata por level descendente cuando hay igual puntaje', () => {
    const result = service.buildRanking([row('a', 'Ana', 200, 2), row('b', 'Beto', 200, 5)]);
    expect(result.map((r) => r.studentId)).toEqual(['b', 'a']);
  });

  it('desempata por nombre A-Z cuando puntaje y level son iguales', () => {
    const result = service.buildRanking([row('z', 'Zoe', 200, 3), row('a', 'Ana', 200, 3)]);
    expect(result.map((r) => r.name)).toEqual(['Ana', 'Zoe']);
  });

  it('devuelve lista vacía para entrada vacía', () => {
    expect(service.buildRanking([])).toEqual([]);
  });
});

describe('RankingService.assertCanView', () => {
  it('permite a director sin tocar la BD', async () => {
    const svc = new RankingService({} as any);
    await expect(svc.assertCanView('c1', { id: 'd', role: 'director' })).resolves.toBeUndefined();
  });

  it('permite al profesor dueño del aula', async () => {
    const prisma: any = { classroom: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) } };
    const svc = new RankingService(prisma);
    await expect(svc.assertCanView('c1', { id: 't', role: 'teacher' })).resolves.toBeUndefined();
  });

  it('rechaza al profesor que NO es dueño del aula', async () => {
    const prisma: any = { classroom: { findFirst: jest.fn().mockResolvedValue(null) } };
    const svc = new RankingService(prisma);
    await expect(svc.assertCanView('c1', { id: 't', role: 'teacher' })).rejects.toThrow();
  });

  it('permite al alumno matriculado', async () => {
    const enrolled: any = { classroomStudent: { findUnique: jest.fn().mockResolvedValue({ id: 'e1' }) } };
    await expect(new RankingService(enrolled).assertCanView('c1', { id: 's', role: 'student' })).resolves.toBeUndefined();
  });

  it('rechaza al alumno no matriculado', async () => {
    const notEnrolled: any = { classroomStudent: { findUnique: jest.fn().mockResolvedValue(null) } };
    await expect(new RankingService(notEnrolled).assertCanView('c1', { id: 's', role: 'student' })).rejects.toThrow();
  });
});

describe('RankingService.currentWeekStart', () => {
  it('devuelve el lunes anterior a las 00:00 UTC', () => {
    const svc = new RankingService({} as PrismaService);
    // Wednesday 2026-06-24 → Monday 2026-06-22
    const wednesday = new Date('2026-06-24T15:00:00Z');
    const result = (svc as any).currentWeekStart(wednesday);
    expect(result.toISOString()).toBe('2026-06-22T00:00:00.000Z');
  });

  it('un lunes devuelve ese mismo lunes', () => {
    const svc = new RankingService({} as PrismaService);
    const monday = new Date('2026-06-22T08:00:00Z');
    const result = (svc as any).currentWeekStart(monday);
    expect(result.toISOString()).toBe('2026-06-22T00:00:00.000Z');
  });
});

describe('RankingService.takeWeeklySnapshot', () => {
  it('hace upsert idempotente — segunda llamada no crea duplicados', async () => {
    const upsertMock = jest.fn().mockResolvedValue({});
    const prisma: any = { rankingSnapshot: { upsert: upsertMock } };
    const svc = new RankingService(prisma);
    const entries = [
      { ...row('s1', 'Ana', 300, 3), rank: 1, rankChange: null },
      { ...row('s2', 'Beto', 200, 2), rank: 2, rankChange: null },
    ];
    await svc.takeWeeklySnapshot('classroom_1', entries);
    await svc.takeWeeklySnapshot('classroom_1', entries);
    // 2 students × 2 calls = 4 upsert calls total
    expect(upsertMock).toHaveBeenCalledTimes(4);
  });
});

describe('RankingService.getGlobalRanking', () => {
  it('director ve todos los estudiantes', async () => {
    const prisma: any = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 's1', name: 'Ana', avatar: null, characterType: null, experiencePoints: 500, level: 3, loginStreak: 5 },
          { id: 's2', name: 'Beto', avatar: null, characterType: null, experiencePoints: 300, level: 2, loginStreak: 2 },
        ]),
      },
      experienceLog: { groupBy: jest.fn().mockResolvedValue([]) },
      rankingSnapshot: { findMany: jest.fn().mockResolvedValue([]) , upsert: jest.fn().mockResolvedValue({}) },
    };
    const svc = new RankingService(prisma);
    const result = await svc.getGlobalRanking({ id: 'd1', role: 'director' });
    expect(result).toHaveLength(2);
    expect(result[0].studentId).toBe('s1');
    expect(result[0].rank).toBe(1);
    // Director query must NOT filter by studentId
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ id: expect.anything() }) })
    );
  });

  it('teacher solo ve estudiantes de sus salones', async () => {
    const prisma: any = {
      classroom: { findMany: jest.fn().mockResolvedValue([{ id: 'c1' }]) },
      classroomStudent: { findMany: jest.fn().mockResolvedValue([{ studentId: 's1' }]) },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 's1', name: 'Ana', avatar: null, characterType: null, experiencePoints: 500, level: 3, loginStreak: 5 },
        ]),
      },
      experienceLog: { groupBy: jest.fn().mockResolvedValue([]) },
      rankingSnapshot: { findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn().mockResolvedValue({}) },
    };
    const svc = new RankingService(prisma);
    const result = await svc.getGlobalRanking({ id: 't1', role: 'teacher' });
    expect(result).toHaveLength(1);
    // Teacher query must filter by studentId list
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ['s1'] } }) })
    );
  });
});
```

- [ ] **Step 2: Run tests — verify they fail on the new tests**

```bash
cd backend
npm test -- ranking.service
```

Expected: existing tests PASS, new tests (`currentWeekStart`, `takeWeeklySnapshot`, `getGlobalRanking`) FAIL with "is not a function" or similar.

- [ ] **Step 3: Replace `ranking.service.ts` with the full extended implementation**

Replace the entire content of `backend/src/ranking/ranking.service.ts`:

```typescript
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RankingInput {
  studentId:     string;
  name:          string;
  avatar:        string | null;
  characterType: string | null;
  level:         number;
  totalPoints:   number;
  weeklyXpDelta: number;
  streakDays:    number;
}

export interface RankingEntry extends RankingInput {
  rank:       number;
  rankChange: number | null; // positive = moved up, negative = moved down, null = no snapshot
}

@Injectable()
export class RankingService {
  constructor(private prisma: PrismaService) {}

  // ─── Pure sort + rank — no DB calls ─────────────────────────────────────

  buildRanking(rows: RankingInput[]): RankingEntry[] {
    return [...rows]
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.level !== a.level) return b.level - a.level;
        return a.name.localeCompare(b.name);
      })
      .map((row, i) => ({ ...row, rank: i + 1, rankChange: null }));
  }

  // ─── Access guard ────────────────────────────────────────────────────────

  async assertCanView(classroomId: string, user: { id: string; role: string }): Promise<void> {
    if (user.role === 'director' || user.role === 'admin') return;
    if (user.role === 'teacher') {
      const owned = await this.prisma.classroom.findFirst({
        where: { id: classroomId, teacherId: user.id },
        select: { id: true },
      });
      if (owned) return;
    }
    if (user.role === 'student') {
      const enrolled = await this.prisma.classroomStudent.findUnique({
        where: { classroomId_studentId: { classroomId, studentId: user.id } },
        select: { id: true },
      });
      if (enrolled) return;
    }
    throw new ForbiddenException('No tienes acceso al ranking de esta aula');
  }

  // ─── Classroom ranking (used by REST endpoint + gateway) ─────────────────

  async getClassroomRanking(classroomId: string, user: { id: string; role: string }): Promise<RankingEntry[]> {
    await this.assertCanView(classroomId, user);
    return this.computeRanking(classroomId);
  }

  async computeRanking(classroomId: string): Promise<RankingEntry[]> {
    const [points, weeklyXpMap, snapshotMap] = await Promise.all([
      this.prisma.studentPoint.findMany({
        where: { classroomId },
        include: {
          student: { select: { id: true, name: true, avatar: true, characterType: true } },
        },
      }),
      this.getWeeklyXpMap(classroomId),
      this.getSnapshotMap(classroomId),
    ]);

    const rows: RankingInput[] = points.map((p) => ({
      studentId:     p.studentId,
      name:          p.student.name,
      avatar:        p.student.avatar ?? null,
      characterType: p.student.characterType ?? null,
      level:         p.level,
      totalPoints:   p.totalPoints,
      weeklyXpDelta: weeklyXpMap.get(p.studentId) ?? 0,
      streakDays:    p.streakDays,
    }));

    const ranked = this.buildRanking(rows);
    const withChange = this.applyRankChange(ranked, snapshotMap);

    if (snapshotMap.size === 0) {
      await this.takeWeeklySnapshot(classroomId, ranked);
    }

    return withChange;
  }

  // ─── Global ranking ──────────────────────────────────────────────────────

  async getGlobalRanking(requestingUser: { id: string; role: string }): Promise<RankingEntry[]> {
    let studentIdFilter: string[] | undefined;

    if (requestingUser.role === 'teacher') {
      const classrooms = await this.prisma.classroom.findMany({
        where: { teacherId: requestingUser.id },
        select: { id: true },
      });
      const enrollments = await this.prisma.classroomStudent.findMany({
        where: { classroomId: { in: classrooms.map((c) => c.id) } },
        select: { studentId: true },
      });
      studentIdFilter = [...new Set(enrollments.map((e) => e.studentId))];
    }

    const [users, weeklyXpMap, snapshotMap] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          role: 'student',
          ...(studentIdFilter ? { id: { in: studentIdFilter } } : {}),
        },
        select: {
          id: true, name: true, avatar: true, characterType: true,
          experiencePoints: true, level: true, loginStreak: true,
        },
        orderBy: { experiencePoints: 'desc' },
      }),
      this.getGlobalWeeklyXpMap(studentIdFilter),
      this.getSnapshotMap('global'),
    ]);

    const rows: RankingInput[] = users.map((u) => ({
      studentId:     u.id,
      name:          u.name,
      avatar:        u.avatar ?? null,
      characterType: u.characterType ?? null,
      level:         u.level,
      totalPoints:   u.experiencePoints,
      weeklyXpDelta: weeklyXpMap.get(u.id) ?? 0,
      streakDays:    u.loginStreak,
    }));

    const ranked = this.buildRanking(rows);
    const withChange = this.applyRankChange(ranked, snapshotMap);

    if (snapshotMap.size === 0) {
      await this.takeWeeklySnapshot('global', ranked);
    }

    return withChange;
  }

  // ─── Snapshot management ─────────────────────────────────────────────────

  async takeWeeklySnapshot(scope: string, entries: RankingEntry[]): Promise<void> {
    const weekStart = this.currentWeekStart();
    await Promise.all(
      entries.map((e) =>
        this.prisma.rankingSnapshot.upsert({
          where: { studentId_scope_weekStart: { studentId: e.studentId, scope, weekStart } },
          create: { studentId: e.studentId, scope, rank: e.rank, points: e.totalPoints, weekStart },
          update: { rank: e.rank, points: e.totalPoints },
        }),
      ),
    );
  }

  async takeSnapshotForScope(scope: string): Promise<void> {
    if (scope === 'global') {
      const ranking = await this.getGlobalRanking({ id: '', role: 'director' });
      await this.takeWeeklySnapshot('global', ranking);
    } else {
      const ranking = await this.computeRanking(scope);
      await this.takeWeeklySnapshot(scope, ranking);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async getWeeklyXpMap(classroomId: string): Promise<Map<string, number>> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.experienceLog.groupBy({
      by: ['userId'],
      where: { classroomId, createdAt: { gte: since } },
      _sum: { points: true },
    });
    return new Map(rows.map((r) => [r.userId, r._sum.points ?? 0]));
  }

  private async getGlobalWeeklyXpMap(studentIds?: string[]): Promise<Map<string, number>> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.experienceLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: since },
        ...(studentIds ? { userId: { in: studentIds } } : {}),
      },
      _sum: { points: true },
    });
    return new Map(rows.map((r) => [r.userId, r._sum.points ?? 0]));
  }

  private async getSnapshotMap(scope: string): Promise<Map<string, number>> {
    const weekStart = this.currentWeekStart();
    const snaps = await this.prisma.rankingSnapshot.findMany({
      where: { scope, weekStart },
      select: { studentId: true, rank: true },
    });
    return new Map(snaps.map((s) => [s.studentId, s.rank]));
  }

  private applyRankChange(ranked: RankingEntry[], snapshotMap: Map<string, number>): RankingEntry[] {
    if (snapshotMap.size === 0) return ranked;
    return ranked.map((r) => ({
      ...r,
      rankChange: snapshotMap.has(r.studentId)
        ? snapshotMap.get(r.studentId)! - r.rank
        : null,
    }));
  }

  currentWeekStart(from: Date = new Date()): Date {
    const day = from.getUTCDay(); // 0=Sun, 1=Mon...
    const daysToMonday = day === 0 ? -6 : 1 - day;
    return new Date(Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate() + daysToMonday,
    ));
  }
}
```

- [ ] **Step 4: Run all tests**

```bash
cd backend
npm test -- ranking.service
```

Expected: all tests PASS (existing 9 + new 9 = 18 total).

- [ ] **Step 5: Commit**

```bash
git add backend/src/ranking/ranking.service.ts backend/src/ranking/ranking.service.spec.ts
git commit -m "feat(ranking): extend RankingService with global ranking, weekly snapshots and rank-change delta"
```

---

### Task 3: RankingController + RankingGateway — global endpoint and WebSocket room

**Files:**
- Modify: `backend/src/ranking/ranking.controller.ts`
- Modify: `backend/src/ranking/ranking.gateway.ts`
- Create: `backend/src/ranking/dto/ranking.dto.ts`

**Interfaces:**
- Consumes: `RankingService.getGlobalRanking()`, `RankingService.takeSnapshotForScope()` (Task 2)
- Produces:
  - `GET /ranking/global` → `{ ranking: RankingEntry[] }`
  - `POST /ranking/snapshot` → `{ message: string; scope: string }`
  - `RankingGateway.emitGlobalRankingUpdate()` — called by GamificationService (Task 4)

- [ ] **Step 1: Create `backend/src/ranking/dto/ranking.dto.ts`**

```typescript
import { IsOptional, IsString } from 'class-validator';

export class TakeSnapshotDto {
  @IsOptional() @IsString() classroomId?: string;
}
```

- [ ] **Step 2: Replace `ranking.controller.ts`**

```typescript
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RankingService } from './ranking.service';
import { TakeSnapshotDto } from './dto/ranking.dto';

@ApiTags('Ranking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ranking')
export class RankingController {
  constructor(private rankingService: RankingService) {}

  @Get('classroom/:classroomId')
  async getClassroomRanking(
    @Param('classroomId') classroomId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const ranking = await this.rankingService.getClassroomRanking(classroomId, user);
    return { classroomId, ranking };
  }

  @Get('global')
  async getGlobalRanking(@CurrentUser() user: { id: string; role: string }) {
    const ranking = await this.rankingService.getGlobalRanking(user);
    return { ranking };
  }

  @Post('snapshot')
  @Roles('director', 'admin')
  @UseGuards(RolesGuard)
  async takeSnapshot(@Body() body: TakeSnapshotDto) {
    const scope = body.classroomId ?? 'global';
    await this.rankingService.takeSnapshotForScope(scope);
    return { message: 'Snapshot guardado', scope };
  }
}
```

- [ ] **Step 3: Replace `ranking.gateway.ts`**

Add the `global_ranking` room join on connect and the `emitGlobalRankingUpdate` method:

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { getJwtSecret } from '../auth/jwt-secret';
import { RankingService } from './ranking.service';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:4200', credentials: true },
})
export class RankingGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private jwt: JwtService,
    private rankingService: RankingService,
    private prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    client.data.authReady = (async () => {
      try {
        const token =
          (client.handshake.auth?.token as string) ||
          (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');
        if (!token) throw new Error('no token');
        const payload = this.jwt.verify(token, { secret: getJwtSecret() });
        const dbUser = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { isActive: true, role: true },
        });
        if (!dbUser || !dbUser.isActive) throw new Error('inactive or missing user');
        client.data.user = { id: payload.sub, role: dbUser.role };
        client.join(`user:${payload.sub}`);
        // Join global ranking room for all authenticated users
        client.join('global_ranking');
      } catch {
        client.disconnect(true);
      }
    })();
  }

  @SubscribeMessage('join')
  async onJoin(@MessageBody() body: { classroomId: string }, @ConnectedSocket() client: Socket) {
    await client.data.authReady;
    const user = client.data.user;
    if (!user) return;
    try {
      await this.rankingService.assertCanView(body.classroomId, user);
      client.join(`classroom:${body.classroomId}`);
    } catch {
      // Sin acceso: no se une a la sala (silencioso).
    }
  }

  @SubscribeMessage('leave')
  onLeave(@MessageBody() body: { classroomId: string }, @ConnectedSocket() client: Socket) {
    client.leave(`classroom:${body.classroomId}`);
  }

  async emitRankingUpdate(classroomId: string): Promise<void> {
    const ranking = await this.rankingService.computeRanking(classroomId);
    this.server.to(`classroom:${classroomId}`).emit('ranking:update', { classroomId, ranking });
  }

  async emitGlobalRankingUpdate(): Promise<void> {
    const ranking = await this.rankingService.getGlobalRanking({ id: '', role: 'director' });
    this.server.to('global_ranking').emit('ranking:global', { ranking });
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
```

- [ ] **Step 4: Run backend TypeScript check**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/ranking/ranking.controller.ts backend/src/ranking/ranking.gateway.ts backend/src/ranking/dto/ranking.dto.ts
git commit -m "feat(ranking): add GET /ranking/global, POST /ranking/snapshot, and global_ranking WebSocket room"
```

---

### Task 4: GamificationService — wire global ranking emit after XP award

**Files:**
- Modify: `backend/src/gamification/gamification.service.ts`

**Interfaces:**
- Consumes: `RankingGateway.emitGlobalRankingUpdate()` (Task 3)
- Produces: global ranking update broadcast after every behavior-point event

- [ ] **Step 1: Add `emitGlobalRankingUpdate` call after `emitRankingUpdate` in `applyBehavior`**

In `backend/src/gamification/gamification.service.ts`, find this block near the end of the `applyBehavior` method (around line 354):

```typescript
    await this.rankingGateway
      .emitRankingUpdate(classroomId)
      .catch((err) => console.error('ranking emit failed', err));
```

Replace it with:

```typescript
    await this.rankingGateway
      .emitRankingUpdate(classroomId)
      .catch((err) => console.error('classroom ranking emit failed', err));

    await this.rankingGateway
      .emitGlobalRankingUpdate()
      .catch((err) => console.error('global ranking emit failed', err));
```

- [ ] **Step 2: TypeScript check**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/gamification/gamification.service.ts
git commit -m "feat(ranking): emit global ranking update after every behavior-point event"
```

---

### Task 5: Frontend — extend RankingEntry interface and add onGlobalRanking to RealtimeService

**Files:**
- Modify: `frontend/src/app/core/realtime/realtime.service.ts`

**Interfaces:**
- Produces:
  - `RankingEntry` interface (extended with `avatar`, `weeklyXpDelta`, `streakDays`, `rankChange`)
  - `RealtimeService.onGlobalRanking(): Observable<RankingEntry[]>`

- [ ] **Step 1: Replace `realtime.service.ts`**

```typescript
import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '@env/environment';
import { AuthService } from '../auth/auth.service';

export interface RankingEntry {
  studentId:     string;
  name:          string;
  avatar:        string | null;
  characterType: string | null;
  level:         number;
  totalPoints:   number;
  rank:          number;
  weeklyXpDelta: number;
  streakDays:    number;
  rankChange:    number | null;
}

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private socket?: Socket;
  private socketToken: string | null = null;

  constructor(private auth: AuthService) {}

  private ensureSocket(): Socket {
    const token = this.auth.token() ?? '';
    if (this.socket && this.socketToken !== token) {
      this.socket.disconnect();
      this.socket = undefined;
    }
    if (!this.socket) {
      const origin = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
      this.socket = io(origin, {
        auth: { token },
        transports: ['websocket'],
      });
      this.socketToken = token;
    }
    return this.socket;
  }

  onClassroomRanking(classroomId: string): Observable<RankingEntry[]> {
    const socket = this.ensureSocket();
    return new Observable<RankingEntry[]>((subscriber) => {
      const handler = (payload: { classroomId: string; ranking: RankingEntry[] }) => {
        if (payload.classroomId === classroomId) subscriber.next(payload.ranking);
      };
      socket.on('ranking:update', handler);
      socket.emit('join', { classroomId });
      return () => {
        socket.emit('leave', { classroomId });
        socket.off('ranking:update', handler);
      };
    });
  }

  onGlobalRanking(): Observable<RankingEntry[]> {
    const socket = this.ensureSocket();
    return new Observable<RankingEntry[]>((subscriber) => {
      const handler = (payload: { ranking: RankingEntry[] }) => subscriber.next(payload.ranking);
      socket.on('ranking:global', handler);
      return () => socket.off('ranking:global', handler);
    });
  }

  onEvent<T>(event: string): Observable<T> {
    const socket = this.ensureSocket();
    return new Observable<T>((sub) => {
      const handler = (payload: T) => sub.next(payload);
      socket.on(event, handler);
      return () => socket.off(event, handler);
    });
  }

  ngOnDestroy() {
    this.socket?.disconnect();
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors (the new fields are additive — existing consumers of `RankingEntry` will now see optional extra fields at runtime but TypeScript won't error because the new fields are required in the interface and the backend will now return them).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/core/realtime/realtime.service.ts
git commit -m "feat(ranking): extend RankingEntry with avatar/weeklyXpDelta/streakDays/rankChange + onGlobalRanking()"
```

---

### Task 6: Enhance ClassroomRankingComponent — new fields + dark mode + rank-change badge

**Files:**
- Modify: `frontend/src/app/features/shared/classroom-ranking/classroom-ranking.component.ts`

**Interfaces:**
- Consumes: extended `RankingEntry` (Task 5)

- [ ] **Step 1: Replace `classroom-ranking.component.ts`**

```typescript
import { Component, Input, OnInit, OnDestroy, signal, computed, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '@env/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { RealtimeService, RankingEntry } from '../../../core/realtime/realtime.service';

const CHARACTER_ICONS: Record<string, string> = {
  mago: '🧙', guerrero: '⚔️', ninja: '🥷', arquero: '🏹', lanzador: '🎯',
};

@Component({
  selector: 'app-classroom-ranking',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="adventure-card p-5 animate-fade-in-up">
    <h3 class="font-cinzel font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
      <span>🏆</span> Ranking del Aula
    </h3>

    @if (ranking().length === 0) {
      <p class="font-cinzel text-gray-400 dark:text-slate-500 text-sm text-center py-6">
        Aún no hay puntos en esta aula
      </p>
    } @else {
      <!-- Podio top 3 -->
      <div class="grid grid-cols-3 gap-2 mb-4">
        @for (p of podium(); track p.studentId) {
          <div class="text-center p-3 rounded-xl"
            [class.bg-amber-50]="p.rank === 1"
            [class.dark:bg-amber-900]="p.rank === 1"
            [class.bg-opacity-20]="p.rank === 1">
            <div class="text-2xl">{{ medal(p.rank) }}</div>
            <div class="text-lg">{{ charIcon(p.characterType) }}</div>
            <div class="font-cinzel font-bold text-xs truncate dark:text-slate-100">{{ p.name }}</div>
            <div class="font-cinzel text-green-600 dark:text-green-400 font-black text-sm">{{ p.totalPoints }}</div>
            <div class="text-xs text-gray-400 dark:text-slate-500">Lv.{{ p.level }}</div>
            @if (p.rankChange !== null) {
              <span class="text-xs px-1 rounded font-bold"
                [ngClass]="rankChangeClass(p.rankChange)">
                {{ rankChangeLabel(p.rankChange) }}
              </span>
            }
          </div>
        }
      </div>

      <!-- Filas 4–10 -->
      <div class="space-y-1">
        @for (r of rest(); track r.studentId) {
          <div class="flex items-center gap-2 px-3 py-2 rounded-lg"
            [class.bg-blue-50]="r.studentId === myId"
            [class.dark:bg-blue-900]="r.studentId === myId"
            [class.bg-opacity-20]="r.studentId === myId">
            <span class="font-cinzel font-black text-gray-400 dark:text-slate-500 w-5 text-sm">{{ r.rank }}</span>
            @if (r.rankChange !== null) {
              <span class="text-xs px-1 rounded font-bold w-8 text-center"
                [ngClass]="rankChangeClass(r.rankChange)">
                {{ rankChangeLabel(r.rankChange) }}
              </span>
            }
            <span class="text-base">{{ charIcon(r.characterType) }}</span>
            <span class="font-cinzel text-sm flex-1 truncate dark:text-slate-100">{{ r.name }}</span>
            <span class="font-cinzel text-xs text-gray-400 dark:text-slate-400">Lv.{{ r.level }}</span>
            <span class="font-cinzel text-green-600 dark:text-green-400 font-bold text-sm">{{ r.totalPoints }}</span>
            @if (r.streakDays > 0) {
              <span class="text-xs text-orange-500" title="Racha">🔥{{ r.streakDays }}</span>
            }
          </div>
        }
      </div>

      <!-- Tu posición si estás fuera del top 10 -->
      @if (myEntryOutsideTop10(); as me) {
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 mt-2 border-t-2 border-blue-200 dark:border-blue-700">
          <span class="font-cinzel font-black text-blue-500 dark:text-blue-400 w-5 text-sm">{{ me.rank }}</span>
          <span class="text-base">{{ charIcon(me.characterType) }}</span>
          <span class="font-cinzel text-sm flex-1 truncate dark:text-slate-100">{{ me.name }} (tú)</span>
          <span class="font-cinzel text-green-600 dark:text-green-400 font-bold text-sm">{{ me.totalPoints }}</span>
        </div>
      }
    }
  </div>
  `,
})
export class ClassroomRankingComponent implements OnInit, OnDestroy {
  @Input({ required: true }) classroomId!: string;

  ranking = signal<RankingEntry[]>([]);
  myId = '';
  private sub?: Subscription;
  private destroyRef = inject(DestroyRef);

  podium  = computed(() => this.ranking().slice(0, 3));
  rest    = computed(() => this.ranking().slice(3, 10));
  myEntryOutsideTop10 = computed(() => {
    const me = this.ranking().find((r) => r.studentId === this.myId);
    return me && me.rank > 10 ? me : null;
  });

  constructor(
    private http: HttpClient,
    private realtime: RealtimeService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.myId = this.auth.user()?.id ?? '';
    this.http
      .get<{ ranking: RankingEntry[] }>(`${environment.apiUrl}/ranking/classroom/${this.classroomId}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (res) => this.ranking.set(res.ranking) });
    this.sub = this.realtime.onClassroomRanking(this.classroomId).subscribe((r) => this.ranking.set(r));
  }

  medal(rank: number): string {
    return ['', '🥇', '🥈', '🥉'][rank] ?? '🏅';
  }

  charIcon(type: string | null): string {
    return type ? (CHARACTER_ICONS[type] ?? '👤') : '👤';
  }

  rankChangeClass(change: number): string {
    if (change > 0) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (change < 0) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400';
  }

  rankChangeLabel(change: number): string {
    if (change > 0) return `↑${change}`;
    if (change < 0) return `↓${Math.abs(change)}`;
    return '—';
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/features/shared/classroom-ranking/classroom-ranking.component.ts
git commit -m "feat(ranking): enhance ClassroomRankingComponent with dark mode, character icons, rank-change badges and weekly XP"
```

---

### Task 7: LeaderboardPageComponent — new shared page with two tabs

**Files:**
- Create: `frontend/src/app/shared/leaderboard/leaderboard-page.component.ts`
- Create: `frontend/src/app/shared/leaderboard/leaderboard-page.component.html`

**Interfaces:**
- Consumes: `ClassroomRankingComponent` (Task 6), `RankingEntry` + `RealtimeService.onGlobalRanking()` (Task 5)

- [ ] **Step 1: Create `leaderboard-page.component.ts`**

```typescript
import { Component, OnInit, OnDestroy, signal, computed, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '@env/environment';
import { AuthService } from '../../core/auth/auth.service';
import { RealtimeService, RankingEntry } from '../../core/realtime/realtime.service';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { ClassroomRankingComponent } from '../../features/shared/classroom-ranking/classroom-ranking.component';

const CHARACTER_ICONS: Record<string, string> = {
  mago: '🧙', guerrero: '⚔️', ninja: '🥷', arquero: '🏹', lanzador: '🎯',
};

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ThemeToggleComponent, ClassroomRankingComponent],
  templateUrl: './leaderboard-page.component.html',
})
export class LeaderboardPageComponent implements OnInit, OnDestroy {
  activeTab      = signal<'classroom' | 'global'>('classroom');
  classrooms     = signal<{ id: string; name: string }[]>([]);
  selectedId     = signal('');
  globalRanking  = signal<RankingEntry[]>([]);
  loadingGlobal  = signal(false);

  private globalSub?: Subscription;
  private destroyRef = inject(DestroyRef);

  readonly backRoute = computed(() => {
    switch (this.auth.user()?.role) {
      case 'teacher':           return '/teacher/dashboard';
      case 'director':
      case 'admin':             return '/director/dashboard';
      default:                  return '/student/dashboard';
    }
  });

  readonly podium = computed(() => this.globalRanking().slice(0, 3));
  readonly rest   = computed(() => this.globalRanking().slice(3, 10));
  readonly myGlobalEntry = computed(() => {
    const me = this.globalRanking().find(r => r.studentId === this.auth.user()?.id);
    return me && me.rank > 10 ? me : null;
  });

  constructor(
    public auth: AuthService,
    private http: HttpClient,
    private realtime: RealtimeService,
  ) {}

  ngOnInit() {
    this.loadClassrooms();
    this.loadGlobalRanking();
    this.globalSub = this.realtime.onGlobalRanking().subscribe(r => this.globalRanking.set(r));
  }

  private loadClassrooms() {
    const role = this.auth.user()?.role;
    const endpoint = role === 'teacher'   ? '/classrooms/my'
                   : role === 'director'  ? '/classrooms'
                   : '/classrooms/enrolled';
    this.http
      .get<{ data: { id: string; name: string }[] }>(`${environment.apiUrl}${endpoint}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const list = res.data ?? (res as any);
          this.classrooms.set(Array.isArray(list) ? list : []);
          if (this.classrooms().length > 0) this.selectedId.set(this.classrooms()[0].id);
        },
        error: () => {},
      });
  }

  private loadGlobalRanking() {
    this.loadingGlobal.set(true);
    this.http
      .get<{ ranking: RankingEntry[] }>(`${environment.apiUrl}/ranking/global`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => { this.globalRanking.set(res.ranking); this.loadingGlobal.set(false); },
        error: () => { this.loadingGlobal.set(false); },
      });
  }

  medal(rank: number): string {
    return ['', '🥇', '🥈', '🥉'][rank] ?? '🏅';
  }

  charIcon(type: string | null): string {
    return type ? (CHARACTER_ICONS[type] ?? '👤') : '👤';
  }

  rankChangeClass(change: number | null): string {
    if (change === null || change === 0) return 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400';
    if (change > 0) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  }

  rankChangeLabel(change: number | null): string {
    if (change === null || change === 0) return '—';
    return change > 0 ? `↑${change}` : `↓${Math.abs(change)}`;
  }

  ngOnDestroy() {
    this.globalSub?.unsubscribe();
  }
}
```

- [ ] **Step 2: Create `leaderboard-page.component.html`**

```html
<!-- Nav -->
<nav class="legendary-nav sticky top-0 z-50">
  <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
    <a [routerLink]="backRoute()" class="legendary-logo text-xl">⚔️ LegendaryClass</a>
    <div class="flex items-center gap-3">
      <app-theme-toggle />
      <a [routerLink]="backRoute()" class="btn-epic btn-blue text-xs py-2 px-4">← Volver</a>
    </div>
  </div>
</nav>

<div class="z-content py-8">
  <div class="max-w-5xl mx-auto px-4 sm:px-6">

    <!-- Header -->
    <div class="text-center mb-8 animate-fade-in-up">
      <h1 class="font-cinzel-decorative font-black text-gray-900 dark:text-slate-50 mb-2"
        style="font-size: clamp(2rem,5vw,3rem);">
        🏆 CLASIFICACIÓN LEGENDARIA
      </h1>
      <p class="font-cinzel text-gray-500 dark:text-slate-400">
        Los guerreros más poderosos del reino
      </p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl w-fit mx-auto">
      <button (click)="activeTab.set('classroom')"
        class="font-cinzel font-bold text-sm px-6 py-2 rounded-xl transition-all duration-200"
        [class.bg-white]="activeTab() === 'classroom'"
        [class.dark:bg-slate-700]="activeTab() === 'classroom'"
        [class.shadow-md]="activeTab() === 'classroom'"
        [class.text-amber-700]="activeTab() === 'classroom'"
        [class.dark:text-amber-400]="activeTab() === 'classroom'"
        [class.text-gray-500]="activeTab() !== 'classroom'"
        [class.dark:text-slate-400]="activeTab() !== 'classroom'">
        🏰 Por Salón
      </button>
      <button (click)="activeTab.set('global')"
        class="font-cinzel font-bold text-sm px-6 py-2 rounded-xl transition-all duration-200"
        [class.bg-white]="activeTab() === 'global'"
        [class.dark:bg-slate-700]="activeTab() === 'global'"
        [class.shadow-md]="activeTab() === 'global'"
        [class.text-amber-700]="activeTab() === 'global'"
        [class.dark:text-amber-400]="activeTab() === 'global'"
        [class.text-gray-500]="activeTab() !== 'global'"
        [class.dark:text-slate-400]="activeTab() !== 'global'">
        🌍 Global
      </button>
    </div>

    <!-- Tab: Por Salón -->
    @if (activeTab() === 'classroom') {
      <div class="animate-fade-in-up">
        @if (classrooms().length > 1) {
          <div class="mb-4 flex justify-center">
            <select [(ngModel)]="selectedIdValue"
              (change)="selectedId.set($any($event.target).value)"
              class="input-epic max-w-xs font-cinzel text-sm">
              @for (c of classrooms(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </div>
        }
        @if (selectedId()) {
          <app-classroom-ranking [classroomId]="selectedId()" />
        } @else {
          <p class="text-center font-cinzel text-gray-400 dark:text-slate-500 py-12">
            No perteneces a ningún salón todavía.
          </p>
        }
      </div>
    }

    <!-- Tab: Global -->
    @if (activeTab() === 'global') {
      <div class="animate-fade-in-up">
        @if (loadingGlobal()) {
          <div class="text-center py-16">
            <div class="text-6xl mb-4 animate-float">🏆</div>
            <p class="font-cinzel text-gray-400 dark:text-slate-500">Cargando clasificación...</p>
          </div>
        } @else if (globalRanking().length === 0) {
          <p class="text-center font-cinzel text-gray-400 dark:text-slate-500 py-12">
            Aún no hay estudiantes registrados.
          </p>
        } @else {
          <!-- Podio top 3 -->
          <div class="grid grid-cols-3 gap-4 mb-8">
            @for (p of podium(); track p.studentId) {
              <div class="legendary-card p-4 text-center"
                [class.ring-2]="p.rank === 1"
                [class.ring-amber-400]="p.rank === 1">
                <div class="text-4xl mb-1">{{ medal(p.rank) }}</div>
                <div class="text-3xl mb-1">{{ charIcon(p.characterType) }}</div>
                <div class="font-cinzel font-bold text-sm truncate dark:text-slate-50">{{ p.name }}</div>
                <div class="font-cinzel text-xs text-gray-500 dark:text-slate-400">Lv.{{ p.level }}</div>
                <div class="font-cinzel font-black text-purple-600 dark:text-purple-400 text-lg mt-1">
                  {{ p.totalPoints }} XP
                </div>
                @if (p.weeklyXpDelta > 0) {
                  <div class="text-xs text-green-600 dark:text-green-400 font-cinzel mt-1">
                    +{{ p.weeklyXpDelta }} esta semana
                  </div>
                }
                @if (p.rankChange !== null) {
                  <span class="text-xs px-2 py-0.5 rounded-full font-bold mt-1 inline-block"
                    [ngClass]="rankChangeClass(p.rankChange)">
                    {{ rankChangeLabel(p.rankChange) }}
                  </span>
                }
              </div>
            }
          </div>

          <!-- Filas 4–10 -->
          <div class="legendary-card p-4 space-y-1">
            @for (r of rest(); track r.studentId) {
              <div class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors"
                [class.bg-amber-50]="r.studentId === auth.user()?.id"
                [class.dark:bg-amber-900]="r.studentId === auth.user()?.id"
                [class.bg-opacity-30]="r.studentId === auth.user()?.id">
                <span class="font-cinzel font-black text-gray-400 dark:text-slate-500 w-6 text-sm">{{ r.rank }}</span>
                <span class="text-xs px-1.5 py-0.5 rounded font-bold w-8 text-center"
                  [ngClass]="rankChangeClass(r.rankChange)">
                  {{ rankChangeLabel(r.rankChange) }}
                </span>
                <span class="text-lg">{{ charIcon(r.characterType) }}</span>
                <span class="font-cinzel text-sm flex-1 truncate dark:text-slate-100">
                  {{ r.name }}
                  @if (r.studentId === auth.user()?.id) { <span class="text-amber-600 dark:text-amber-400">(tú)</span> }
                </span>
                <span class="font-cinzel text-xs text-gray-400 dark:text-slate-500">Lv.{{ r.level }}</span>
                <span class="font-cinzel text-purple-600 dark:text-purple-400 font-bold text-sm">{{ r.totalPoints }}</span>
                @if (r.streakDays > 0) {
                  <span class="text-xs text-orange-500" title="Racha">🔥{{ r.streakDays }}</span>
                }
              </div>
            }
          </div>

          <!-- Tu posición si estás fuera del top 10 -->
          @if (myGlobalEntry(); as me) {
            <div class="legendary-card p-4 mt-4 flex items-center gap-3 border-2 border-amber-400 dark:border-amber-500">
              <span class="font-cinzel font-black text-amber-600 dark:text-amber-400 w-6">{{ me.rank }}</span>
              <span class="text-lg">{{ charIcon(me.characterType) }}</span>
              <span class="font-cinzel text-sm flex-1 dark:text-slate-100">
                {{ me.name }} <span class="text-amber-600 dark:text-amber-400">(tú)</span>
              </span>
              <span class="font-cinzel text-purple-600 dark:text-purple-400 font-bold">{{ me.totalPoints }} XP</span>
            </div>
          }
        }
      </div>
    }

  </div>
</div>
```

Note: the template uses `[(ngModel)]` with a workaround for signal binding — add a getter/setter in the component for the select:

Add to the component class (in `leaderboard-page.component.ts`) after the `selectedId` signal:

```typescript
get selectedIdValue(): string { return this.selectedId(); }
set selectedIdValue(v: string) { this.selectedId.set(v); }
```

Also add `FormsModule` to the component imports array (for `[(ngModel)]` on the select).

- [ ] **Step 3: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/shared/leaderboard/
git commit -m "feat(ranking): add LeaderboardPageComponent with classroom and global tabs"
```

---

### Task 8: Routes + nav links for student, teacher, director

**Files:**
- Modify: `frontend/src/app/features/student/student.routes.ts`
- Modify: `frontend/src/app/features/teacher/teacher.routes.ts`
- Modify: `frontend/src/app/features/director/director.routes.ts`
- Modify: `frontend/src/app/features/student/dashboard/student-dashboard.component.html`
- Modify: `frontend/src/app/features/teacher/dashboard/teacher-dashboard.component.html`
- Modify: `frontend/src/app/features/director/dashboard/director-dashboard.component.html`

**Interfaces:**
- Consumes: `LeaderboardPageComponent` (Task 7)

- [ ] **Step 1: Add leaderboard route to `student.routes.ts`**

In `frontend/src/app/features/student/student.routes.ts`, add before the `{ path: '', redirectTo: 'dashboard' ... }` line:

```typescript
  {
    path: 'leaderboard',
    loadComponent: () =>
      import('../../shared/leaderboard/leaderboard-page.component')
        .then((m) => m.LeaderboardPageComponent),
  },
```

- [ ] **Step 2: Add leaderboard route to `teacher.routes.ts`**

Same pattern — add before the final `{ path: '', redirectTo: ... }` entry:

```typescript
  {
    path: 'leaderboard',
    loadComponent: () =>
      import('../../shared/leaderboard/leaderboard-page.component')
        .then((m) => m.LeaderboardPageComponent),
  },
```

- [ ] **Step 3: Add leaderboard route to `director.routes.ts`**

Same pattern:

```typescript
  {
    path: 'leaderboard',
    loadComponent: () =>
      import('../../shared/leaderboard/leaderboard-page.component')
        .then((m) => m.LeaderboardPageComponent),
  },
```

- [ ] **Step 4: Add nav link to student dashboard nav**

In `frontend/src/app/features/student/dashboard/student-dashboard.component.html`, find the hidden md nav links block (the `<div class="hidden md:flex ...">` section). Add after the existing nav links and before the closing `</div>`:

```html
<a routerLink="/student/leaderboard" routerLinkActive="active" class="nav-link-epic">🏆 Ranking</a>
```

- [ ] **Step 5: Add nav link to teacher dashboard nav**

In `frontend/src/app/features/teacher/dashboard/teacher-dashboard.component.html`, find the hidden md nav links block. Add:

```html
<a routerLink="/teacher/leaderboard" routerLinkActive="active" class="nav-link-epic">🏆 Ranking</a>
```

- [ ] **Step 6: Add nav link to director dashboard nav**

In `frontend/src/app/features/director/dashboard/director-dashboard.component.html`, find the hidden md nav links block. Add:

```html
<a routerLink="/director/leaderboard" routerLinkActive="active" class="nav-link-epic">🏆 Ranking</a>
```

- [ ] **Step 7: TypeScript check + lint**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/features/student/student.routes.ts \
        frontend/src/app/features/teacher/teacher.routes.ts \
        frontend/src/app/features/director/director.routes.ts \
        frontend/src/app/features/student/dashboard/student-dashboard.component.html \
        frontend/src/app/features/teacher/dashboard/teacher-dashboard.component.html \
        frontend/src/app/features/director/dashboard/director-dashboard.component.html
git commit -m "feat(ranking): add leaderboard routes and nav links for student, teacher, director"
```
