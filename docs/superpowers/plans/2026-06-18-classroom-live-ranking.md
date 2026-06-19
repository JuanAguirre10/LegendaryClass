# Ranking de Aula en Vivo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar un ranking de estudiantes por aula (por `StudentPoint.totalPoints`) que se actualiza en tiempo real vía WebSockets, visible para alumnos (con su posición resaltada) y profesores.

**Architecture:** Un `RankingModule` dedicado en NestJS encapsula la lógica de ranking (función pura de orden + consulta a BD con control de acceso), la expone por REST para la carga inicial y por un `RankingGateway` (socket.io) para los empujes en vivo. Los dos puntos del backend que mutan puntos de aula (`gamification.updateStudentPoints` y `classrooms.service.adjustPoints`) llaman al gateway para reemitir el ranking del aula afectada. En Angular, un `RealtimeService` envuelve `socket.io-client` y un `ClassroomRankingComponent` reutilizable se monta en las vistas de alumno y profesor.

**Tech Stack:** NestJS 10, Prisma 5, socket.io (`@nestjs/websockets` + `@nestjs/platform-socket.io`), Angular 18 (standalone + signals), `socket.io-client`, Jest.

## Global Constraints

- Backend NestJS 10 / Prisma 5; inyectar `PrismaService` (no instanciar clientes).
- Toda ruta HTTP vive bajo el prefijo global `/api` y versión `/v1` (ya configurado en `main.ts`).
- El `ValidationPipe` global usa `whitelist + forbidNonWhitelisted + transform`: los DTOs deben declarar todos los campos aceptados.
- Auth con JWT vía `getJwtSecret()` (`backend/src/auth/jwt-secret.ts`); no duplicar la verificación de token.
- Métrica de ranking: `StudentPoint.totalPoints`. Desempate: `totalPoints` desc → `level` desc → `name` asc. Sin ranks compartidos.
- CORS del socket usa `process.env.FRONTEND_URL` (igual que el CORS HTTP).
- Frontend Angular standalone; URL base en `environment.apiUrl` (`http://localhost:3000/api/v1`).

---

### Task 1: `RankingService.buildRanking` — función pura de orden y rank

**Files:**
- Create: `backend/src/ranking/ranking.service.ts`
- Test: `backend/src/ranking/ranking.service.spec.ts`

**Interfaces:**
- Produces:
  - `interface RankingEntry { studentId: string; name: string; characterType: string | null; level: number; totalPoints: number; rank: number; }`
  - `interface RankingInput { studentId: string; name: string; characterType: string | null; level: number; totalPoints: number; }`
  - `RankingService.buildRanking(rows: RankingInput[]): RankingEntry[]`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/ranking/ranking.service.spec.ts
import { RankingService } from './ranking.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RankingService.buildRanking', () => {
  let service: RankingService;
  beforeEach(() => {
    service = new RankingService({} as PrismaService);
  });

  const row = (studentId: string, name: string, totalPoints: number, level = 1, characterType: string | null = null) =>
    ({ studentId, name, totalPoints, level, characterType });

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest ranking.service -v`
Expected: FAIL — `Cannot find module './ranking.service'`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// backend/src/ranking/ranking.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RankingInput {
  studentId: string;
  name: string;
  characterType: string | null;
  level: number;
  totalPoints: number;
}

export interface RankingEntry extends RankingInput {
  rank: number;
}

@Injectable()
export class RankingService {
  constructor(private prisma: PrismaService) {}

  buildRanking(rows: RankingInput[]): RankingEntry[] {
    return [...rows]
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.level !== a.level) return b.level - a.level;
        return a.name.localeCompare(b.name);
      })
      .map((row, i) => ({ ...row, rank: i + 1 }));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest ranking.service -v`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/ranking/ranking.service.ts backend/src/ranking/ranking.service.spec.ts
git commit -m "feat(ranking): pure buildRanking with deterministic tie-break"
```

---

### Task 2: `RankingService.getClassroomRanking` + REST controller + módulo

**Files:**
- Modify: `backend/src/ranking/ranking.service.ts`
- Create: `backend/src/ranking/ranking.controller.ts`
- Create: `backend/src/ranking/ranking.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `RankingService.buildRanking` (Task 1), `PrismaService`.
- Produces:
  - `RankingService.getClassroomRanking(classroomId: string, user: { id: string; role: string }): Promise<RankingEntry[]>`
  - `RankingService.assertCanView(classroomId: string, user: { id: string; role: string }): Promise<void>`
  - Ruta `GET /api/v1/ranking/classroom/:classroomId` → `{ classroomId: string; ranking: RankingEntry[] }`

- [ ] **Step 1: Add the data + access methods to `RankingService`**

Append to `backend/src/ranking/ranking.service.ts` (inside the class, after `buildRanking`), and add `ForbiddenException` to the imports:

```typescript
// at top: import { ForbiddenException, Injectable } from '@nestjs/common';

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

  async getClassroomRanking(classroomId: string, user: { id: string; role: string }): Promise<RankingEntry[]> {
    await this.assertCanView(classroomId, user);
    return this.computeRanking(classroomId);
  }

  // Recalcula desde BD; usado por el endpoint REST y por el gateway tras un cambio de puntos.
  async computeRanking(classroomId: string): Promise<RankingEntry[]> {
    const points = await this.prisma.studentPoint.findMany({
      where: { classroomId },
      include: { student: { select: { id: true, name: true, characterType: true } } },
    });
    const rows = points.map((p) => ({
      studentId: p.studentId,
      name: p.student.name,
      characterType: p.student.characterType ?? null,
      level: p.level,
      totalPoints: p.totalPoints,
    }));
    return this.buildRanking(rows);
  }
```

- [ ] **Step 1b: Add access-control tests for `assertCanView`**

Append to `backend/src/ranking/ranking.service.spec.ts` a new describe block. Mock `PrismaService` so `assertCanView` is testable without a DB:

```typescript
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

  it('permite al alumno matriculado y rechaza al no matriculado', async () => {
    const enrolled: any = { classroomStudent: { findUnique: jest.fn().mockResolvedValue({ id: 'e1' }) } };
    await expect(new RankingService(enrolled).assertCanView('c1', { id: 's', role: 'student' })).resolves.toBeUndefined();
    const notEnrolled: any = { classroomStudent: { findUnique: jest.fn().mockResolvedValue(null) } };
    await expect(new RankingService(notEnrolled).assertCanView('c1', { id: 's', role: 'student' })).rejects.toThrow();
  });
});
```

Run: `cd backend && npx jest ranking.service -v`
Expected: PASS (las 4 de `buildRanking` + las 4 nuevas de `assertCanView`). Total backend al final de Task 4: 32 tests (24 gamificación + 8 ranking).

- [ ] **Step 2: Create the controller**

```typescript
// backend/src/ranking/ranking.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RankingService } from './ranking.service';

@ApiTags('Ranking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ranking')
export class RankingController {
  constructor(private rankingService: RankingService) {}

  @Get('classroom/:classroomId')
  async getClassroomRanking(@Param('classroomId') classroomId: string, @CurrentUser() user: any) {
    const ranking = await this.rankingService.getClassroomRanking(classroomId, user);
    return { classroomId, ranking };
  }
}
```

- [ ] **Step 3: Create the module**

```typescript
// backend/src/ranking/ranking.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService],
})
export class RankingModule {}
```

- [ ] **Step 4: Register the module in `app.module.ts`**

Add the import and include `RankingModule` in the `imports` array of `backend/src/app.module.ts`:

```typescript
import { RankingModule } from './ranking/ranking.module';
// ...
    ParentModule,
    RankingModule,
  ],
```

- [ ] **Step 5: Build to verify wiring**

Run: `cd backend && npx nest build`
Expected: exit 0, no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/ranking/ backend/src/app.module.ts
git commit -m "feat(ranking): REST endpoint GET /ranking/classroom/:id with access control"
```

---

### Task 3: `RankingGateway` — WebSocket con auth y salas por aula

**Files:**
- Modify: `backend/package.json` (deps)
- Create: `backend/src/ranking/ranking.gateway.ts`
- Modify: `backend/src/ranking/ranking.module.ts`

**Interfaces:**
- Consumes: `RankingService.assertCanView`, `RankingService.computeRanking`, `JwtService`, `getJwtSecret`.
- Produces:
  - `RankingGateway.emitRankingUpdate(classroomId: string): Promise<void>` — recalcula y emite `ranking:update` a la sala `classroom:{classroomId}`.
  - Evento entrante del cliente: `join` con payload `{ classroomId: string }`.
  - Evento saliente al cliente: `ranking:update` con payload `{ classroomId: string; ranking: RankingEntry[] }`.

- [ ] **Step 1: Install WebSocket dependencies**

Run:
```bash
cd backend && npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```
Expected: instala sin errores; `package.json` lista las 3 dependencias.

- [ ] **Step 2: Create the gateway**

```typescript
// backend/src/ranking/ranking.gateway.ts
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

@WebSocketGateway({
  namespace: 'ranking',
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:4200', credentials: true },
})
export class RankingGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private jwt: JwtService,
    private rankingService: RankingService,
  ) {}

  // Valida el JWT del handshake; desconecta si es inválido. Guarda el user en el socket.
  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');
      if (!token) throw new Error('no token');
      const payload = this.jwt.verify(token, { secret: getJwtSecret() });
      client.data.user = { id: payload.sub, role: payload.role };
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('join')
  async onJoin(@MessageBody() body: { classroomId: string }, @ConnectedSocket() client: Socket) {
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
}
```

> **Nota sobre el JWT payload:** `jwt.strategy.ts` firma con `sub` (id) y el login incluye el `role` en el payload. Verificar en `auth.service.ts` que el token incluye `role`; si no, añadirlo al payload del login en esa misma tarea (es un cambio de una línea en el objeto que se pasa a `jwt.sign`).

- [ ] **Step 3: Register the gateway and JwtModule in `ranking.module.ts`**

```typescript
// backend/src/ranking/ranking.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { RankingGateway } from './ranking.gateway';
import { getJwtSecret } from '../auth/jwt-secret';

@Module({
  imports: [PrismaModule, JwtModule.register({ secret: getJwtSecret() })],
  controllers: [RankingController],
  providers: [RankingService, RankingGateway],
  exports: [RankingService, RankingGateway],
})
export class RankingModule {}
```

- [ ] **Step 4: Build to verify**

Run: `cd backend && npx nest build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add backend/src/ranking/ backend/package.json backend/package-lock.json
git commit -m "feat(ranking): websocket gateway with JWT auth and per-classroom rooms"
```

---

### Task 4: Emitir el ranking cuando cambian los puntos de aula

**Files:**
- Modify: `backend/src/gamification/gamification.service.ts`
- Modify: `backend/src/gamification/gamification.module.ts`
- Modify: `backend/src/classrooms/classrooms.service.ts`
- Modify: `backend/src/classrooms/classrooms.module.ts`

**Interfaces:**
- Consumes: `RankingGateway.emitRankingUpdate(classroomId)` (Task 3).

> **Por qué dos sitios:** los puntos de aula cambian en `gamification.updateStudentPoints()` (asignar/revertir comportamiento) **y** en `classrooms.service.adjustPoints()` (ajuste manual, que hace su propio `upsert`). Ambos deben emitir.

- [ ] **Step 1: Inject the gateway into `GamificationService` and emit**

In `backend/src/gamification/gamification.service.ts`, add the constructor dependency and emit at the end of `updateStudentPoints` (after the `studentPoint.upsert` and the user-points mirror):

```typescript
// constructor — añade el gateway:
constructor(
  private prisma: PrismaService,
  private rankingGateway: RankingGateway,
) {}

// import al inicio del archivo:
import { RankingGateway } from '../ranking/ranking.gateway';

// al final de updateStudentPoints(), tras persistir los cambios:
await this.rankingGateway.emitRankingUpdate(classroomId);
```

- [ ] **Step 2: Import `RankingModule` in `gamification.module.ts`**

```typescript
import { RankingModule } from '../ranking/ranking.module';
// en imports: [ ..., RankingModule ]
```

- [ ] **Step 3: Inject the gateway into `ClassroomsService` and emit in `adjustPoints`**

In `backend/src/classrooms/classrooms.service.ts`, add the gateway to the constructor and emit at the end of `adjustPoints` (after its `studentPoint.upsert`), using `classroom.id`:

```typescript
import { RankingGateway } from '../ranking/ranking.gateway';
// constructor: añade `private rankingGateway: RankingGateway` junto a las deps actuales.

// al final de adjustPoints(), antes del return:
await this.rankingGateway.emitRankingUpdate(classroom.id);
```

- [ ] **Step 4: Import `RankingModule` in `classrooms.module.ts`**

```typescript
import { RankingModule } from '../ranking/ranking.module';
// en imports: [ ..., RankingModule ]
```

- [ ] **Step 5: Build + run full backend test suite**

Run: `cd backend && npx nest build && npx jest`
Expected: build exit 0; tests verdes (24 de gamificación + 8 de ranking = 32).

- [ ] **Step 6: Manual smoke test del gateway** (servidor + dos clientes)

Run: `cd backend && node dist/src/main.js` (en background). Con un cliente socket.io (o script Node) conectado a `ws://localhost:3000/ranking` con el JWT de un alumno del aula, unirse con `join {classroomId}`; desde otra terminal, asignar un comportamiento al alumno vía `POST /api/v1/behaviors/award`.
Expected: el cliente recibe un evento `ranking:update` con el array recalculado. Detener el servidor al terminar.

- [ ] **Step 7: Commit**

```bash
git add backend/src/gamification/ backend/src/classrooms/
git commit -m "feat(ranking): emit live ranking on behavior award and manual point adjust"
```

---

### Task 5: Frontend — `RealtimeService` (socket.io-client)

**Files:**
- Modify: `frontend/package.json` (dep)
- Create: `frontend/src/app/core/realtime/realtime.service.ts`

**Interfaces:**
- Produces:
  - `RealtimeService.onClassroomRanking(classroomId: string): Observable<RankingEntry[]>` — se une a la sala y emite cada `ranking:update` de esa aula.
  - `interface RankingEntry { studentId: string; name: string; characterType: string | null; level: number; totalPoints: number; rank: number; }`

- [ ] **Step 1: Install the client**

Run: `cd frontend && npm install socket.io-client`
Expected: instala sin errores.

- [ ] **Step 2: Create the service**

```typescript
// frontend/src/app/core/realtime/realtime.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '@env/environment';
import { AuthService } from '../auth/auth.service';

export interface RankingEntry {
  studentId: string;
  name: string;
  characterType: string | null;
  level: number;
  totalPoints: number;
  rank: number;
}

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private socket?: Socket;

  constructor(private auth: AuthService) {}

  private ensureSocket(): Socket {
    if (!this.socket) {
      // environment.apiUrl = http://localhost:3000/api/v1 → origen = http://localhost:3000
      const origin = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
      this.socket = io(`${origin}/ranking`, {
        auth: { token: this.auth.token() ?? '' },
        transports: ['websocket'],
      });
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

  ngOnDestroy() {
    this.socket?.disconnect();
  }
}
```

> **Nota:** verificar el accessor del token en `AuthService`. El plan asume `auth.token()` (signal). Si el token se guarda con otro nombre/método, ajustar esa única llamada para leerlo.

- [ ] **Step 3: Build to verify types**

Run: `cd frontend && npx ng build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/core/realtime/realtime.service.ts frontend/package.json frontend/package-lock.json
git commit -m "feat(ranking): RealtimeService wrapping socket.io-client"
```

---

### Task 6: Frontend — `ClassroomRankingComponent` reutilizable

**Files:**
- Create: `frontend/src/app/features/shared/classroom-ranking/classroom-ranking.component.ts`

**Interfaces:**
- Consumes: `RealtimeService.onClassroomRanking` (Task 5), `HttpClient` (GET inicial), `AuthService` (id del alumno actual para resaltar).
- Produces: `<app-classroom-ranking [classroomId]="id" />`

- [ ] **Step 1: Create the component**

```typescript
// frontend/src/app/features/shared/classroom-ranking/classroom-ranking.component.ts
import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { RealtimeService, RankingEntry } from '../../../core/realtime/realtime.service';

@Component({
  selector: 'app-classroom-ranking',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="adventure-card p-5 animate-fade-in-up">
    <h3 class="font-cinzel font-bold text-gray-800 mb-4 flex items-center gap-2"><span>🏆</span> Ranking del Aula</h3>

    @if (ranking().length === 0) {
      <p class="font-cinzel text-gray-400 text-sm text-center py-6">Aún no hay puntos en esta aula</p>
    } @else {
      <!-- Podio top 3 -->
      <div class="grid grid-cols-3 gap-2 mb-4">
        @for (p of podium(); track p.studentId) {
          <div class="text-center p-3 rounded-xl" [class.bg-amber-50]="p.rank === 1">
            <div class="text-2xl">{{ medal(p.rank) }}</div>
            <div class="font-cinzel font-bold text-xs truncate">{{ p.name }}</div>
            <div class="font-cinzel text-green-600 font-black text-sm">{{ p.totalPoints }}</div>
          </div>
        }
      </div>
      <!-- Filas 4-10 -->
      <div class="space-y-1">
        @for (r of rest(); track r.studentId) {
          <div class="flex items-center gap-3 px-3 py-2 rounded-lg" [class.bg-blue-50]="r.studentId === myId">
            <span class="font-cinzel font-black text-gray-400 w-6">{{ r.rank }}</span>
            <span class="font-cinzel text-sm flex-1 truncate">{{ r.name }}</span>
            <span class="font-cinzel text-green-600 font-bold text-sm">{{ r.totalPoints }}</span>
          </div>
        }
      </div>
      <!-- Tu posición si estás fuera del top 10 -->
      @if (myEntryOutsideTop10(); as me) {
        <div class="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 mt-2 border-t-2 border-blue-200">
          <span class="font-cinzel font-black text-blue-500 w-6">{{ me.rank }}</span>
          <span class="font-cinzel text-sm flex-1 truncate">{{ me.name }} (tú)</span>
          <span class="font-cinzel text-green-600 font-bold text-sm">{{ me.totalPoints }}</span>
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

  podium = computed(() => this.ranking().slice(0, 3));
  rest = computed(() => this.ranking().slice(3, 10));
  myEntryOutsideTop10 = computed(() => {
    const me = this.ranking().find((r) => r.studentId === this.myId);
    return me && me.rank > 10 ? me : null;
  });

  constructor(private http: HttpClient, private realtime: RealtimeService, private auth: AuthService) {}

  ngOnInit() {
    this.myId = this.auth.user()?.id ?? '';
    // Carga inicial vía REST
    this.http
      .get<{ ranking: RankingEntry[] }>(`${environment.apiUrl}/ranking/classroom/${this.classroomId}`)
      .subscribe({ next: (res) => this.ranking.set(res.ranking) });
    // Updates en vivo
    this.sub = this.realtime.onClassroomRanking(this.classroomId).subscribe((r) => this.ranking.set(r));
  }

  medal(rank: number): string {
    return ['', '🥇', '🥈', '🥉'][rank] ?? '🏅';
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
```

> **Nota:** verificar el accessor del usuario en `AuthService` (el plan asume `auth.user()` signal con `.id`). Ajustar la única línea de `this.myId` si el nombre difiere.

- [ ] **Step 2: Build to verify**

Run: `cd frontend && npx ng build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/features/shared/classroom-ranking/
git commit -m "feat(ranking): reusable ClassroomRankingComponent (podium + top10 + own rank)"
```

---

### Task 7: Montar el ranking en las vistas de alumno y profesor

**Files:**
- Modify: `frontend/src/app/features/student/classrooms/classroom-detail.component.ts`
- Modify: `frontend/src/app/features/teacher/classrooms/classroom-detail.component.ts`

**Interfaces:**
- Consumes: `<app-classroom-ranking [classroomId]="..." />` (Task 6).

- [ ] **Step 1: Add to the student classroom detail**

In `frontend/src/app/features/student/classrooms/classroom-detail.component.ts`: add `ClassroomRankingComponent` to the component `imports` array, and place `<app-classroom-ranking [classroomId]="classroomId" />` in the template where the classroom id is available (junto al detalle del aula). Use the same id variable the component already resolves for the classroom.

```typescript
import { ClassroomRankingComponent } from '../../shared/classroom-ranking/classroom-ranking.component';
// imports: [ ..., ClassroomRankingComponent ]
// template (donde haya un id de aula resuelto):
// <app-classroom-ranking [classroomId]="<id-del-aula>" />
```

- [ ] **Step 2: Add to the teacher classroom detail**

In `frontend/src/app/features/teacher/classrooms/classroom-detail.component.ts`: add `ClassroomRankingComponent` to `imports`, and place `<app-classroom-ranking [classroomId]="classroom().id" />` inside the `@if (classroom())` block (p. ej. en el panel lateral, bajo "Comportamientos"), ya que `classroom()` expone `.id`.

```typescript
import { ClassroomRankingComponent } from '../../shared/classroom-ranking/classroom-ranking.component';
// imports: [ ..., ClassroomRankingComponent ]
// dentro de @if (classroom()) { ... }:
// <app-classroom-ranking [classroomId]="classroom().id" />
```

- [ ] **Step 3: Build + lint**

Run: `cd frontend && npx ng build && npx ng lint`
Expected: build exit 0; lint exit 0 (warnings preexistentes permitidos, 0 errores).

- [ ] **Step 4: Manual end-to-end verification**

Run backend (`node dist/src/main.js`) y frontend (`npm start`). Inicia sesión como `student1@legendaryclass.com` y abre su aula → ver el ranking. En otra ventana, inicia sesión como `teacher@legendaryclass.com`, abre la misma aula y asigna puntos a un comportamiento del alumno.
Expected: el ranking del alumno **se actualiza solo** (sin recargar) reflejando los nuevos puntos y, si cambia, la posición.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/student/classrooms/classroom-detail.component.ts frontend/src/app/features/teacher/classrooms/classroom-detail.component.ts
git commit -m "feat(ranking): mount live ranking in student and teacher classroom views"
```

---

## Notas de verificación final

- Backend: `npx nest build` (0), `npx jest` (32 verdes: 24 gamificación + 8 ranking), endpoint REST responde con `{ classroomId, ranking }`, gateway emite `ranking:update`.
- Frontend: `ng build` (0), `ng lint` (0 errores), ranking se actualiza en vivo en el smoke E2E.
- Sin tocar el código demo `DEMO01` salvo lo necesario para pruebas (preferir el aula `matematicas-3ro-a` u otra para asignar puntos en pruebas destructivas).
