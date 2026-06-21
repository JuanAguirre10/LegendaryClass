# Notificaciones In-App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notificar en tiempo real (y persistir) eventos relevantes: subida de nivel, logro desbloqueado y cambio de estado de canje (al alumno), y canje pendiente (al profesor); con campana + contador de no-leídas en la UI.

**Architecture:** Nueva tabla `Notification` + enum. Un `NotificationsService` persiste y emite vía el gateway WebSocket existente (sala por usuario `user:{id}`). Hooks best-effort en gamification y rewards crean las notificaciones. En Angular, un `NotificationService` (socket + REST) alimenta un `NotificationBellComponent` montado en las barras de navegación.

**Tech Stack:** NestJS 10, Prisma 5 (PostgreSQL), socket.io (gateway ya existente), Angular 18 (standalone + signals), Jest.

## Global Constraints

- Backend NestJS 10 / Prisma 5; inyectar `PrismaService`. Rutas bajo `/api/v1`. `ValidationPipe` global con whitelist.
- Sin dependencias nuevas (socket.io, multer, xlsx ya presentes).
- Tipos de notificación: `level_up`, `achievement`, `reward_status`, `reward_pending`.
- Entrega en vivo reutilizando el gateway existente (`RankingGateway`), namespace por defecto, sala `user:{userId}`. Auth JWT ya implementada en `handleConnection`.
- Hooks best-effort: un fallo de notificación NUNCA debe romper la ganancia de XP, el logro o el canje (try/catch o `.catch`).
- `markRead` scoped al dueño vía `updateMany({ where: { id, userId } })` (idempotente, sin fuga de existencia).
- Frontend: `environment.apiUrl` = `http://localhost:3000/api/v1`; reusa `RealtimeService` (socket único).

---

### Task 1: Schema `Notification` + migración

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Produces: modelo Prisma `Notification` (tabla `notifications`) y enum `NotificationType { level_up achievement reward_status reward_pending }`; relación inversa `User.notifications`.

- [ ] **Step 1: Add the enum and model to `schema.prisma`**

Add the enum near the other enums and the model near the other models:
```prisma
enum NotificationType {
  level_up
  achievement
  reward_status
  reward_pending
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  message   String
  link      String?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, isRead])
  @@map("notifications")
}
```

- [ ] **Step 2: Add the inverse relation on `User`**

In the `User` model, add this line among the existing relation fields (e.g. after `studentRewards`):
```prisma
  notifications     Notification[]
```

- [ ] **Step 3: Create and apply the migration + regenerate client**

Run: `cd backend && npx prisma migrate dev --name add_notifications`
Expected: crea `prisma/migrations/<ts>_add_notifications/` y aplica; regenera el client sin errores. Verifica: `npx prisma migrate status` → "Database schema is up to date".

- [ ] **Step 4: Build to confirm the client types compile**

Run: `cd backend && npx nest build`
Expected: exit 0 (el `PrismaClient` ya conoce `prisma.notification`).

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(notifications): Notification model + enum + migration"
```

---

### Task 2: `NotificationsService` + gateway por-usuario + controller + módulo

**Files:**
- Create: `backend/src/notifications/notifications.service.ts`
- Test: `backend/src/notifications/notifications.service.spec.ts`
- Create: `backend/src/notifications/notifications.controller.ts`
- Create: `backend/src/notifications/notifications.module.ts`
- Modify: `backend/src/ranking/ranking.gateway.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService`; `RankingGateway` (Task: extended here with `emitToUser`); `paginate`/`PaginationQueryDto` (`../common/dto/pagination-query.dto`).
- Produces:
  - `RankingGateway.emitToUser(userId: string, event: string, payload: unknown): void`
  - `NotificationsService.buildNotificationContent(type, data): { title: string; message: string; link?: string }` (pure)
  - `NotificationsService.create(userId: string, input: { type: NotificationType; title: string; message: string; link?: string }): Promise<Notification>`
  - `NotificationsService.list(userId, pagination)`, `unreadCount(userId): Promise<{ count: number }>`, `markRead(id, userId): Promise<void>`, `markAllRead(userId): Promise<void>`
  - Rutas: `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `PATCH /api/v1/notifications/:id/read`, `PATCH /api/v1/notifications/read-all`

- [ ] **Step 1: Extend the gateway — auto-join `user:{id}` room + `emitToUser`**

In `backend/src/ranking/ranking.gateway.ts`, inside `handleConnection`'s `authReady` IIFE, right after `client.data.user = { id: payload.sub, role: dbUser.role };`, add:
```typescript
        client.join(`user:${payload.sub}`);
```
And add this method to the class (after `emitRankingUpdate`):
```typescript
  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
```

- [ ] **Step 2: Write the failing test for `buildNotificationContent`**

```typescript
// backend/src/notifications/notifications.service.spec.ts
import { NotificationsService } from './notifications.service';

describe('NotificationsService.buildNotificationContent', () => {
  let svc: NotificationsService;
  beforeEach(() => { svc = new NotificationsService({} as any, {} as any); });

  it('level_up', () => {
    expect(svc.buildNotificationContent('level_up', { level: 7 })).toEqual({
      title: '¡Subiste de nivel!',
      message: 'Alcanzaste el nivel 7. ¡Sigue así!',
      link: '/student/profile',
    });
  });

  it('achievement', () => {
    expect(svc.buildNotificationContent('achievement', { name: 'Maestro de Misiones' })).toEqual({
      title: 'Logro desbloqueado',
      message: 'Desbloqueaste: Maestro de Misiones',
      link: '/student/achievements',
    });
  });

  it('reward_status', () => {
    expect(svc.buildNotificationContent('reward_status', { rewardName: 'Insignia', status: 'approved' })).toEqual({
      title: 'Actualización de canje',
      message: 'Tu canje de "Insignia" fue aprobado',
      link: '/student/rewards',
    });
  });

  it('reward_pending', () => {
    expect(svc.buildNotificationContent('reward_pending', { studentName: 'Ana', rewardName: 'Insignia' })).toEqual({
      title: 'Canje pendiente',
      message: 'Ana canjeó "Insignia" y espera tu aprobación',
      link: '/teacher/rewards',
    });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && npx jest notifications.service -v`
Expected: FAIL — `Cannot find module './notifications.service'`.

- [ ] **Step 4: Implement `NotificationsService`**

```typescript
// backend/src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { NotificationType, Notification } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RankingGateway } from '../ranking/ranking.gateway';
import { PaginationQueryDto, paginate } from '../common/dto/pagination-query.dto';

const STATUS_LABEL: Record<string, string> = {
  approved: 'aprobado', delivered: 'entregado', cancelled: 'cancelado', pending: 'pendiente',
};

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService, private gateway: RankingGateway) {}

  buildNotificationContent(
    type: NotificationType,
    data: any,
  ): { title: string; message: string; link?: string } {
    switch (type) {
      case 'level_up':
        return { title: '¡Subiste de nivel!', message: `Alcanzaste el nivel ${data.level}. ¡Sigue así!`, link: '/student/profile' };
      case 'achievement':
        return { title: 'Logro desbloqueado', message: `Desbloqueaste: ${data.name}`, link: '/student/achievements' };
      case 'reward_status':
        return { title: 'Actualización de canje', message: `Tu canje de "${data.rewardName}" fue ${STATUS_LABEL[data.status] ?? data.status}`, link: '/student/rewards' };
      case 'reward_pending':
        return { title: 'Canje pendiente', message: `${data.studentName} canjeó "${data.rewardName}" y espera tu aprobación`, link: '/teacher/rewards' };
    }
  }

  async create(
    userId: string,
    input: { type: NotificationType; title: string; message: string; link?: string },
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: { userId, type: input.type, title: input.title, message: input.message, link: input.link },
    });
    // Emisión best-effort: un fallo del socket no rompe la creación.
    try {
      this.gateway.emitToUser(userId, 'notification:new', notification);
    } catch {
      /* ignore */
    }
    return notification;
  }

  list(userId: string, pagination: PaginationQueryDto = {}) {
    return paginate(
      this.prisma.notification,
      { where: { userId }, orderBy: { createdAt: 'desc' } },
      pagination,
    );
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && npx jest notifications.service -v`
Expected: PASS (4 casos).

- [ ] **Step 6: Create the controller**

```typescript
// backend/src/notifications/notifications.controller.ts
import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: { id: string }, @Query() pagination: PaginationQueryDto) {
    return this.notifications.list(user.id, pagination);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: { id: string }) {
    return this.notifications.unreadCount(user.id);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    await this.notifications.markRead(id, user.id);
    return { message: 'ok' };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: { id: string }) {
    await this.notifications.markAllRead(user.id);
    return { message: 'ok' };
  }
}
```

> Nota de orden de rutas: `read-all` y `unread-count` son segmentos estáticos distintos de `:id/read`, así que no colisionan con el parámetro `:id` (NestJS hace match exacto por segmento). No se requiere reordenar.

- [ ] **Step 7: Create the module**

```typescript
// backend/src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RankingModule } from '../ranking/ranking.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [PrismaModule, RankingModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

- [ ] **Step 8: Register in `app.module.ts`**

Add `import { NotificationsModule } from './notifications/notifications.module';` and include `NotificationsModule` in the `imports` array (after `RankingModule`).

- [ ] **Step 9: Build + run unit suite**

Run: `cd backend && npx nest build && npx jest`
Expected: build exit 0; suite verde (incl. los 4 nuevos tests).

- [ ] **Step 10: Commit**

```bash
git add backend/src/notifications/ backend/src/ranking/ranking.gateway.ts backend/src/app.module.ts
git commit -m "feat(notifications): service + per-user socket room + REST endpoints"
```

---

### Task 3: Hooks de eventos (gamification + rewards)

**Files:**
- Modify: `backend/src/gamification/gamification.service.ts`
- Modify: `backend/src/gamification/gamification.module.ts`
- Modify: `backend/src/rewards/rewards.service.ts`
- Modify: `backend/src/rewards/rewards.module.ts`

**Interfaces:**
- Consumes: `NotificationsService.create` + `buildNotificationContent` (Task 2).

> Todos los hooks van envueltos en `try/catch` (best-effort): un fallo de notificación no debe propagar.

- [ ] **Step 1: Inject `NotificationsService` into `GamificationService` + emit on level up and achievement**

In `backend/src/gamification/gamification.service.ts`:
- Import: `import { NotificationsService } from '../notifications/notifications.service';`
- Add to the constructor params: `private notifications: NotificationsService` (alongside `prisma` and `rankingGateway`).
- At the END of `handleLevelUp(userId, oldLevel, newLevel)` (after `checkLevelAchievements`):
```typescript
    try {
      const c = this.notifications.buildNotificationContent('level_up', { level: newLevel });
      await this.notifications.create(userId, { type: 'level_up', ...c });
    } catch { /* best-effort */ }
```
- In `unlockAchievement(userId, key, xpReward)`, AFTER the `achievement.upsert(...)` completes (i.e. when a NEW achievement is unlocked — note the method already `return`s early if `existing?.isCompleted`), add:
```typescript
    try {
      const c = this.notifications.buildNotificationContent('achievement', { name: definition.name });
      await this.notifications.create(userId, { type: 'achievement', ...c });
    } catch { /* best-effort */ }
```

- [ ] **Step 2: Import `NotificationsModule` in `gamification.module.ts`**

Add `import { NotificationsModule } from '../notifications/notifications.module';` and add `NotificationsModule` to the `imports` array.

- [ ] **Step 3: Inject `NotificationsService` into `RewardsService` + emit on redeem (pending) and status change**

In `backend/src/rewards/rewards.service.ts`:
- Import `NotificationsService` and add `private notifications: NotificationsService` to the constructor.
- At the END of `redeem(...)` (after `studentReward` is created and before `return studentReward;`), notify the classroom's teacher:
```typescript
    try {
      const classroom = await this.prisma.classroom.findUnique({ where: { id: classroomId }, select: { teacherId: true } });
      if (classroom) {
        const c = this.notifications.buildNotificationContent('reward_pending', { studentName: student.name, rewardName: reward.name });
        await this.notifications.create(classroom.teacherId, { type: 'reward_pending', ...c });
      }
    } catch { /* best-effort */ }
```
- In `updateStatus(id, teacherId, status, notes?)`, AFTER the studentReward `update` persists the new status, notify the student. The existing `sr` (fetched at the top) has `sr.studentId` and `sr.reward.name`:
```typescript
    try {
      const c = this.notifications.buildNotificationContent('reward_status', { rewardName: sr.reward.name, status });
      await this.notifications.create(sr.studentId, { type: 'reward_status', ...c });
    } catch { /* best-effort */ }
```
(Confirm `sr` includes `reward` — if the top-of-method `findUnique` doesn't `include: { reward: true }`, add it; the brief's smoke step will catch a missing field.)

- [ ] **Step 4: Import `NotificationsModule` in `rewards.module.ts`**

Add `import { NotificationsModule } from '../notifications/notifications.module';` and add `NotificationsModule` to the `imports` array.

- [ ] **Step 5: Build + full suite**

Run: `cd backend && npx nest build && npx jest`
Expected: build exit 0 (sin ciclos de dependencias); suite verde. NOTE: `GamificationService` and `RewardsService` gained a constructor param — if any `*.service.spec.ts` instantiates them with `new`, update the stub args. (Currently only `gamification.service.spec.ts` does `new GamificationService({} as any, {} as any)`; add a third `{} as any` for the notifications param.)

- [ ] **Step 6: Smoke test the pipeline**

Start `node dist/src/main.js`. Connect a socket.io client as `student1@legendaryclass.com` (the socket auto-joins `user:{id}`), listen for `notification:new`. As a teacher, award enough points to that student to trigger a level-up (`POST /api/v1/behaviors/award` or `/classrooms/:slug/adjust-points`), OR change a reward status. Then check `GET /api/v1/notifications/unread-count` (student token) rises and the socket received `notification:new`.
Expected: notificación persistida + contador sube + evento socket recibido. Detener el servidor.

- [ ] **Step 7: Commit**

```bash
git add backend/src/gamification/ backend/src/rewards/
git commit -m "feat(notifications): emit on level-up, achievement, reward status and pending redemption"
```

---

### Task 4: Frontend — `NotificationService` + `NotificationBellComponent`

**Files:**
- Create: `frontend/src/app/core/notifications/notification.service.ts`
- Create: `frontend/src/app/shared/notification-bell/notification-bell.component.ts`
- Modify: `frontend/src/app/core/realtime/realtime.service.ts`
- Modify: student + teacher nav hosts (see Step 4)

**Interfaces:**
- Consumes: endpoints de Task 2; `RealtimeService` (Task de ranking).
- Produces: `<app-notification-bell />`

- [ ] **Step 1: Add a generic event stream to `RealtimeService`**

In `frontend/src/app/core/realtime/realtime.service.ts`, add a method to subscribe to an arbitrary server event on the shared socket (keeps the single-connection model). The file already imports `Observable` from `rxjs` (used by `onClassroomRanking`); reuse that import. Add this method to the `RealtimeService` class:
```typescript
  onEvent<T>(event: string): Observable<T> {
    const socket = this.ensureSocket();
    return new Observable<T>((sub) => {
      const handler = (payload: T) => sub.next(payload);
      socket.on(event, handler);
      return () => socket.off(event, handler);
    });
  }
```

- [ ] **Step 2: Create the `NotificationService`**

```typescript
// frontend/src/app/core/notifications/notification.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { RealtimeService } from '../realtime/realtime.service';

export interface AppNotification {
  id: string; type: string; title: string; message: string;
  link: string | null; isRead: boolean; createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  unreadCount = signal(0);
  items = signal<AppNotification[]>([]);
  private started = false;

  constructor(private http: HttpClient, private realtime: RealtimeService) {}

  // Llamar una vez tras el login (p. ej. desde el bell component).
  start(): void {
    if (this.started) return;
    this.started = true;
    this.refresh();
    this.realtime.onEvent<AppNotification>('notification:new').subscribe((n) => {
      this.items.update((list) => [n, ...list]);
      this.unreadCount.update((c) => c + 1);
    });
  }

  refresh(): void {
    this.http.get<{ count: number }>(`${environment.apiUrl}/notifications/unread-count`)
      .subscribe({ next: (r) => this.unreadCount.set(r.count) });
    this.http.get<{ data: AppNotification[] }>(`${environment.apiUrl}/notifications?limit=10&page=1`)
      .subscribe({ next: (r) => this.items.set(r.data) });
  }

  markRead(n: AppNotification): void {
    if (n.isRead) return;
    this.http.patch(`${environment.apiUrl}/notifications/${n.id}/read`, {}).subscribe({
      next: () => {
        this.items.update((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
        this.unreadCount.update((c) => Math.max(0, c - 1));
      },
    });
  }

  markAllRead(): void {
    this.http.patch(`${environment.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => {
        this.items.update((list) => list.map((x) => ({ ...x, isRead: true })));
        this.unreadCount.set(0);
      },
    });
  }
}
```

- [ ] **Step 3: Create the `NotificationBellComponent`**

```typescript
// frontend/src/app/shared/notification-bell/notification-bell.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, AppNotification } from '../../core/notifications/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="relative">
    <button (click)="toggle()" class="relative text-xl px-2 py-1" aria-label="Notificaciones">
      🔔
      @if (notifications.unreadCount() > 0) {
        <span class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {{ notifications.unreadCount() }}
        </span>
      }
    </button>
    @if (open()) {
      <div class="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-white shadow-2xl border border-gray-100 z-50">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span class="font-cinzel font-bold text-gray-800 text-sm">Notificaciones</span>
          <button (click)="notifications.markAllRead()" class="font-cinzel text-xs text-purple-600 hover:underline">Marcar todas</button>
        </div>
        @if (notifications.items().length === 0) {
          <p class="font-playfair text-gray-400 text-sm text-center py-6">Sin notificaciones</p>
        } @else {
          @for (n of notifications.items(); track n.id) {
            <button (click)="onClick(n)" class="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-purple-50/40 transition-colors"
              [class.bg-blue-50]="!n.isRead">
              <p class="font-cinzel font-bold text-gray-800 text-xs">{{ n.title }}</p>
              <p class="font-playfair text-gray-500 text-xs mt-0.5">{{ n.message }}</p>
            </button>
          }
        }
      </div>
    }
  </div>
  `,
})
export class NotificationBellComponent implements OnInit {
  open = signal(false);
  constructor(public notifications: NotificationService, private router: Router) {}
  ngOnInit() { this.notifications.start(); }
  toggle() { this.open.update((o) => !o); }
  onClick(n: AppNotification) {
    this.notifications.markRead(n);
    this.open.set(false);
    if (n.link) this.router.navigate([n.link]);
  }
}
```

- [ ] **Step 4: Mount the bell in the student and teacher dashboards**

Add `<app-notification-bell />` to the nav of the student dashboard and teacher dashboard, and import `NotificationBellComponent`:
- Student: `frontend/src/app/features/student/dashboard/student-dashboard.component.ts` (or its HTML nav) — add `NotificationBellComponent` to `imports` and place `<app-notification-bell />` in the top nav action area (next to the "Volver"/logout area).
- Teacher: `frontend/src/app/features/teacher/dashboard/teacher-dashboard.component.html` + its `.ts` `imports` — place `<app-notification-bell />` in the nav action area.
Determine each file's relative import path to `../../../shared/notification-bell/notification-bell.component` based on its location (dashboards are at `features/<role>/dashboard/`, so `../../../shared/...`).

- [ ] **Step 5: Build + lint**

Run: `cd frontend && npx ng build` (exit 0) and `cd frontend && npx ng lint` (0 errores; warnings preexistentes permitidos). Fix any NEW error introduced.

- [ ] **Step 6: Manual end-to-end verification**

Run backend + frontend. Log in as `student1@legendaryclass.com`; in another browser/profile as `teacher@legendaryclass.com` award points to that student until they level up (or change one of their reward redemptions' status).
Expected: la campana del alumno muestra el badge de no-leídas en vivo (sin recargar), el dropdown lista la notificación, y al hacer clic se marca como leída.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/core/notifications/ frontend/src/app/shared/notification-bell/ frontend/src/app/core/realtime/realtime.service.ts frontend/src/app/features/student/dashboard/ frontend/src/app/features/teacher/dashboard/
git commit -m "feat(notifications): NotificationService + bell component mounted in dashboards"
```

---

## Notas de verificación final

- Backend: `npx prisma migrate status` al día; `npx nest build` (0); `npx jest` (los 4 tests de notifications + suite previa verdes); endpoints `200`; smoke socket recibe `notification:new`.
- Frontend: `ng build` (0), `ng lint` (0 errores), campana actualiza el badge en vivo en el smoke E2E.
- Hooks best-effort verificados: ninguna excepción de notificación rompe XP/logro/canje.
- Sin dependencias nuevas.
