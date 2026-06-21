# Notificaciones In-App — Diseño

- **Fecha:** 2026-06-19
- **Estado:** Aprobado (pendiente de plan de implementación)
- **Alcance:** Feature #4 de 4 (previas: Ranking en vivo ✅, Exportar a Excel ✅, Subir avatar ✅)

## Objetivo

Avisar al usuario en la interfaz cuando ocurren eventos relevantes: subida de nivel,
logro desbloqueado y cambio de estado de un canje (al alumno), y canje pendiente de
aprobación (al profesor). Las notificaciones se persisten (campana con historial y
contador de no-leídas) y se entregan en **tiempo real** vía WebSocket, reutilizando el
gateway existente.

## Modelo de datos (nueva tabla + migración Prisma)

```prisma
model Notification {
  id        String           @id @default(cuid())
  userId    String           // destinatario
  type      NotificationType
  title     String
  message   String
  link      String?          // ruta opcional (p. ej. "/student/rewards")
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, isRead])
  @@map("notifications")
}

enum NotificationType {
  level_up
  achievement
  reward_status
  reward_pending
}
```
- `User` gana la relación inversa `notifications Notification[]`.
- Tras editar el schema: `npm run db:generate` y `npm run db:migrate` (la migración se crea en la rama de la feature).

## Componentes del backend

### `NotificationsService`
- `create(userId, { type, title, message, link? }): Promise<Notification>` — persiste y luego emite en vivo (`emitToUser(userId, 'notification:new', notification)`); el emit es **best-effort** (un fallo no rompe la creación).
- `list(userId, pagination): PaginatedResult<Notification>` — reutiliza el helper `paginate` (orden `createdAt desc`).
- `unreadCount(userId): Promise<{ count: number }>`.
- `markRead(id, userId): Promise<void>` — `updateMany({ where: { id, userId }, data: { isRead: true } })`: si la notificación no es del usuario, afecta 0 filas (idempotente, sin error ni fuga de existencia).
- `markAllRead(userId): Promise<void>`.
- **Función pura** `buildNotificationContent(type, data): { title; message; link? }` — arma el texto por tipo; testeable sin BD.

### Gateway en tiempo real (reutiliza el existente)
- En `handleConnection` (ya valida el JWT y carga el usuario), tras autenticar, el socket
  se **auto-une a la sala `user:{userId}`**.
- Nuevo método `emitToUser(userId, event, payload)` → `this.server.to('user:'+userId).emit(event, payload)`.
- Se mantiene en el mismo gateway/namespace por defecto (una sola conexión socket; evita
  el problema de emisión por namespace ya resuelto en la feature de ranking).

### Endpoints REST (`NotificationsController`, `@UseGuards(JwtAuthGuard)`)
- `GET /notifications` — lista paginada del `@CurrentUser()` (`{ data, meta }`).
- `GET /notifications/unread-count` — `{ count }`.
- `PATCH /notifications/:id/read` — marca una como leída (solo si es del usuario).
- `PATCH /notifications/read-all` — marca todas las del usuario como leídas.

## Disparadores (hooks; todos best-effort)

| Evento | Lugar | Destinatario | Contenido |
|---|---|---|---|
| Subida de nivel | `gamification.handleLevelUp(userId, old, new)` | alumno | "¡Subiste al nivel {new}!" |
| Logro desbloqueado | `gamification.unlockAchievement(userId, key, xp)` | alumno | "Desbloqueaste el logro: {nombre}" |
| Estado de canje | `rewards.updateStatus(id, teacherId, status)` | alumno dueño del canje | "Tu canje de {recompensa} fue {estado}" |
| Canje pendiente | `rewards.redeem(studentId, rewardId, classroomId)` | profesor dueño del aula | "{alumno} canjeó {recompensa}" |

- `GamificationModule` y `RewardsModule` importan `NotificationsModule` e inyectan
  `NotificationsService`. `NotificationsModule` depende de Prisma + el gateway
  (`RankingModule`). No hay ciclo: Ranking no depende de Notifications/Gamification/Rewards.

## Componentes del frontend (Angular)

- **`NotificationService`** (`core/`): mantiene un signal `unreadCount` y `items`;
  se suscribe a `notification:new` (vía `RealtimeService`, incrementa contador y antepone
  el item), y usa REST para la carga inicial (`unread-count`, `list`) y para
  `markRead`/`markAllRead`.
- **`NotificationBellComponent`** (standalone): icono 🔔 con badge de no-leídas; al abrir,
  muestra un dropdown con las últimas notificaciones; clic en una la marca como leída (y
  navega a `link` si existe); botón "marcar todas como leídas". Se monta en las barras de
  navegación de alumno y profesor.

## Pruebas

- **Unit** (sin BD): `buildNotificationContent(type, data)` — título/mensaje/link correctos
  por cada uno de los 4 tipos.
- **Integración ligera**: `unreadCount` y `markRead` con Prisma (un usuario no puede marcar
  ni ver las notificaciones de otro); el gateway emite a `user:{id}`.
- **Smoke**: provocar una subida de nivel (o un cambio de estado de canje) → la
  notificación se persiste, el contador REST sube, y un cliente socket suscrito recibe
  `notification:new`.

## Fuera de alcance (YAGNI)

- Email / push del navegador / sonido.
- Preferencias por tipo de notificación o "no molestar".
- Agrupación o resumen de notificaciones.
- Notificaciones para el rol padre.
- Scroll infinito en el dropdown (solo las últimas N; el listado completo usa la ruta
  paginada si se necesita una vista dedicada — fuera de alcance por ahora).

## Riesgos / consideraciones

- Primera feature del roadmap que **modifica el schema**: nueva tabla `notifications` +
  enum `NotificationType` + migración. Requiere `db:generate` + `db:migrate`.
- Reusar el gateway de ranking para las salas `user:{id}` mantiene una sola conexión
  socket y la auth ya existente; el emit usa el namespace por defecto (sin el problema de
  namespaces que se resolvió en la feature de ranking).
- Los hooks deben ser best-effort (try/catch o `.catch`) para que un fallo de
  notificación nunca rompa la ganancia de XP, el desbloqueo de logro o el canje.
