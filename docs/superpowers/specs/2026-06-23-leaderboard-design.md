# Leaderboard — Design Spec

## Goal

Add a dedicated full-page leaderboard to LegendaryClass accessible to students, teachers, and directors. Two tabs: **Por Salón** (real-time classroom ranking) and **Global** (all-time XP ranking across the institution). Both update via WebSocket.

## Architecture

Shared `LeaderboardPageComponent` lazy-loaded at `/student/leaderboard`, `/teacher/leaderboard`, and `/director/leaderboard`. Reuses and enhances the existing `ClassroomRankingComponent`. One new backend endpoint, one new Prisma model, and one new WebSocket event.

## Global Constraints

- Angular 18 standalone components — no NgModules
- All routes use lazy `loadComponent`
- Dark mode: every new element must carry `dark:` Tailwind variants
- Backend: new `@Body()` params use DTO classes with `class-validator`, not inline types
- Do not add a second Socket.io gateway — extend the existing `RankingGateway`
- Global ranking metric: `User.experiencePoints` (never decreases, reflects total achievement)
- Rank change (↑/↓) is calculated as: current rank − rank from last week's `RankingSnapshot`
- `POST /ranking/snapshot` is restricted to `director` and `admin` roles; the lazy-snapshot logic also fires it automatically on the first ranking request of a new week

---

## Backend

### New Prisma model — `RankingSnapshot`

```prisma
model RankingSnapshot {
  id          String   @id @default(cuid())
  studentId   String
  classroomId String?  // null = global snapshot
  rank        Int
  points      Int
  weekStart   DateTime // ISO Monday of the snapshot week

  student   User       @relation(fields: [studentId], references: [id], onDelete: Cascade)
  classroom Classroom? @relation(fields: [classroomId], references: [id], onDelete: Cascade)

  @@unique([studentId, classroomId, weekStart])
  @@index([classroomId, weekStart])
  @@map("ranking_snapshots")
}
```

Add relation fields to `User` and `Classroom` models:
- `User`: `rankingSnapshots RankingSnapshot[]`
- `Classroom`: `rankingSnapshots RankingSnapshot[]`

### Extended `RankingEntry` type

```typescript
export interface RankingEntry {
  studentId:     string;
  name:          string;
  avatar:        string | null;
  characterType: string | null;   // mago | guerrero | ninja | arquero | lanzador
  level:         number;
  totalPoints:   number;          // classroom points (Per Salón tab) OR experiencePoints (Global tab)
  rank:          number;
  weeklyXpDelta: number;          // XP gained in last 7 days (from ExperienceLog)
  streakDays:    number;
  rankChange:    number | null;   // positive = moved up, negative = moved down, null = no snapshot
}
```

### `RankingService` changes (`backend/src/ranking/ranking.service.ts`)

**`getClassroomRanking(classroomId: string): Promise<RankingEntry[]>`** — already exists; extend to:
1. Join `StudentPoint` with `User` (characterType, level, streakDays)
2. Compute `weeklyXpDelta`: `SUM(ExperienceLog.points)` WHERE `userId = student.id AND classroomId = classroomId AND createdAt >= now() - 7 days`
3. Compute `rankChange`: look up `RankingSnapshot` for last week's `weekStart`; if found, `lastWeekRank - currentRank`; if not found, `null`
4. Apply lazy snapshot: if no snapshot exists for the current `weekStart` (Monday), create one after fetching

**`getGlobalRanking(requestingUser: { id: string; role: string }): Promise<RankingEntry[]>`** — new:
1. Query `User` WHERE `role = 'student'` ORDER BY `experiencePoints DESC`
2. For `teacher` role: filter to only students enrolled in the requesting teacher's classrooms
3. Compute `weeklyXpDelta` per student: `SUM(ExperienceLog.points)` WHERE `userId = student.id AND createdAt >= now() - 7 days`
4. Compute `rankChange` from `RankingSnapshot` WHERE `classroomId IS NULL`
5. Apply lazy snapshot for global (classroomId = null)
6. Map to `RankingEntry` with `totalPoints = experiencePoints`

**`takeWeeklySnapshot(classroomId: string | null, entries: RankingEntry[])`** — new:
- Computes `weekStart` as the most recent Monday (00:00 UTC)
- Upserts `RankingSnapshot` records for all entries using Prisma `upsert` (idempotent)
- Called **internally** from `getClassroomRanking` and `getGlobalRanking` when no snapshot exists for the current week (lazy). The `POST /ranking/snapshot` endpoint calls this same method on demand for manual/forced snapshots — it does not bypass the service layer.

### New endpoints (`backend/src/ranking/ranking.controller.ts`)

```
GET  /ranking/classroom/:classroomId   ← extend existing (no route change)
GET  /ranking/global                   ← new, JwtAuthGuard
POST /ranking/snapshot                 ← new, JwtAuthGuard + RolesGuard(['director','admin'])
```

`POST /ranking/snapshot` body DTO:
```typescript
export class TakeSnapshotDto {
  @IsOptional() @IsString() classroomId?: string; // null = global
}
```

### `RankingGateway` changes (`backend/src/ranking/ranking.gateway.ts`)

- `handleConnection`: after joining `user:{id}` room, also join students to `global_ranking` room
- New method `emitGlobalRankingUpdate(ranking: RankingEntry[])`: emits event `globalRankingUpdate` to room `global_ranking`
- `GamificationService` already calls `emitRankingUpdate` after XP events — also call `emitGlobalRankingUpdate` with the updated global ranking after each XP award

---

## Frontend

### File map

```
frontend/src/app/shared/leaderboard/
  leaderboard-page.component.ts      ← new
  leaderboard-page.component.html    ← new

frontend/src/app/features/shared/classroom-ranking/
  classroom-ranking.component.ts     ← modify (dark mode + new RankingEntry fields)
```

### `LeaderboardPageComponent`

**Selector:** `app-leaderboard-page`  
**Standalone imports:** `CommonModule`, `FormsModule`, `RouterLink`, `ClassroomRankingComponent`, `ThemeToggleComponent`

**Signals:**
```typescript
activeTab      = signal<'classroom' | 'global'>('classroom');
classrooms     = signal<{ id: string; name: string }[]>([]);
selectedId     = signal<string>('');
globalRanking  = signal<RankingEntry[]>([]);
loadingGlobal  = signal(false);
```

**Computed:**
```typescript
backRoute = computed(() => {
  switch (auth.user()?.role) {
    case 'teacher':           return '/teacher/dashboard';
    case 'director':
    case 'admin':             return '/director/dashboard';
    default:                  return '/student/dashboard';
  }
});
podium = computed(() => globalRanking().slice(0, 3));
rest   = computed(() => globalRanking().slice(3, 10));
myGlobalEntry = computed(() => {
  const me = globalRanking().find(r => r.studentId === auth.user()?.id);
  return me && me.rank > 10 ? me : null;
});
```

**`ngOnInit`:**
1. Load classrooms from `GET /classrooms` (student: enrolled, teacher: taught, director: all)
2. Set `selectedId` to first classroom
3. Load global ranking from `GET /ranking/global`
4. Subscribe to `realtime.onGlobalRanking()` → update `globalRanking` signal

**Template layout:**
- Nav bar with `← Volver`, title `🏆 CLASIFICACIÓN LEGENDARIA`, `<app-theme-toggle />`
- Two tab buttons: `🏰 Por Salón` / `🌍 Global`
- **Por Salón tab:**
  - Classroom dropdown selector (hidden if only one classroom)
  - `<app-classroom-ranking [classroomId]="selectedId()" />`
- **Global tab:**
  - Top 3 podium (cards with large emoji medal, name, XP, character icon, rank change badge)
  - Rows 4–10 with: rank · rankChange badge · character icon · name · level · XP · weeklyXpDelta · streakDays
  - Sticky "Tu posición" row at bottom if user is outside top 10

### `ClassroomRankingComponent` changes

**New fields consumed from `RankingEntry`:** `characterType`, `level`, `weeklyXpDelta`, `streakDays`, `rankChange`

**Each ranking row shows:**
```
[rank] [↑3/↓1/—] [character icon] [name] [Lv.N] | [points] pts | 🔥 [streakDays] | +[weeklyXpDelta] XP
```

**Rank change badge colors:**
- `↑N` → `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`
- `↓N` → `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
- `—` → `bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400`

**Dark mode fixes:**
- `bg-amber-50` → `bg-amber-50 dark:bg-amber-900/20`
- `bg-blue-50` → `bg-blue-50 dark:bg-blue-900/20`
- All text classes get `dark:text-slate-*` counterparts
- Card wrapper: `adventure-card` already has `.dark` override in `styles.css`

**Character type → icon map** (in component):
```typescript
const CHARACTER_ICONS: Record<string, string> = {
  mago: '🧙', guerrero: '⚔️', ninja: '🥷', arquero: '🏹', lanzador: '🪃'
};
```

### `RealtimeService` change

Add method:
```typescript
onGlobalRanking(): Observable<RankingEntry[]> {
  return new Observable(observer => {
    const handler = (data: RankingEntry[]) => observer.next(data);
    this.socket.on('globalRankingUpdate', handler);
    return () => this.socket.off('globalRankingUpdate', handler);
  });
}
```

### Route additions

In each role's routes file, add:
```typescript
{ path: 'leaderboard', loadComponent: () =>
    import('../../shared/leaderboard/leaderboard-page.component')
      .then(m => m.LeaderboardPageComponent) }
```

Files: `student.routes.ts`, `teacher.routes.ts`, `director.routes.ts`

### Nav link additions

In each role's nav (student-dashboard, teacher-dashboard, director-dashboard HTML templates), add:
```html
<a routerLink="./leaderboard" class="nav-link-epic">🏆 Ranking</a>
```

---

## Data flow

```
User earns XP
  → GamificationService.awardXp()
  → RankingGateway.emitRankingUpdate(classroomId, ranking)   ← existing
  → RankingGateway.emitGlobalRankingUpdate(globalRanking)    ← new
      → Socket room: global_ranking
          → LeaderboardPageComponent.globalRanking.set(data)
```

---

## Testing

- `RankingService.getGlobalRanking`: assert teacher only sees their students; assert director sees all students
- `RankingService.takeWeeklySnapshot`: assert upsert is idempotent (same week, no duplicates)
- `RankingService.getClassroomRanking`: assert `rankChange` is null when no snapshot exists; assert correct sign when snapshot exists
- `LeaderboardPageComponent`: assert tab switch renders correct child; assert `myGlobalEntry` is null when user is in top 10
