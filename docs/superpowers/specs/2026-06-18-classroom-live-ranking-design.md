# Ranking de Aula en Vivo — Diseño

- **Fecha:** 2026-06-18
- **Estado:** Aprobado (pendiente de plan de implementación)
- **Alcance:** Feature #1 de 4 (las siguientes: Exportar a Excel, Subir avatar, Notificaciones in-app)

## Objetivo

Mostrar un ranking de estudiantes por aula que se actualiza en **tiempo real** (vía
WebSockets) cuando cambian los puntos de aula. Lo ven tanto alumnos (con su posición
resaltada) como profesores (ideal para proyectar en clase).

## Métrica y orden

- Ranking por **`StudentPoint.totalPoints`** (puntos por aula), la misma métrica que
  hoy ordena el reporte del profesor en `teacher.service.ts`.
- **Desempate determinista** para que las posiciones no salten al azar entre
  actualizaciones, en este orden:
  1. `totalPoints` descendente
  2. `level` descendente
  3. `name` ascendente (A→Z)
- El `rank` (1, 2, 3, …) se calcula por posición en la lista ya ordenada. Empates en
  puntos conservan posiciones distintas según el desempate anterior (sin ranks
  compartidos), para simplicidad de la UI.

## Componentes del backend (NestJS)

### Carga inicial — REST

- **Endpoint:** `GET /classrooms/:id/ranking`
- **Respuesta:**
  ```json
  {
    "classroomId": "…",
    "ranking": [
      { "studentId": "…", "name": "…", "characterType": "mago", "level": 3, "totalPoints": 420, "rank": 1 }
    ]
  }
  ```
- **Control de acceso** (reutiliza la lógica de pertenencia existente):
  - `student`: solo si está matriculado en esa aula (`ClassroomStudent`).
  - `teacher`: solo si es dueño del aula (`Classroom.teacherId`).
  - `director` / `admin`: cualquier aula (bypass de `RolesGuard`).
  - En caso contrario → `403 ForbiddenException`.

### Lógica de ranking — servicio

- Función pura **`buildRanking(studentPoints, students)`** que recibe los datos y
  devuelve el array ordenado con `rank` calculado. Aislada para poder testearla sin BD.
- Vive en un **`RankingService` dedicado** (no se mete en `gamification.service.ts`,
  que ya es grande). Tanto el endpoint REST como el `RankingGateway` consumen este
  servicio, que también encapsula la consulta a BD y la regla de acceso por aula.

### Actualizaciones en vivo — WebSocket

- **`RankingGateway`** con `@nestjs/websockets` + `socket.io`.
- **Salas:** una por aula, con nombre `classroom:{classroomId}`.
- **Autenticación del handshake:** el cliente envía el JWT al conectar; un guard de
  WS valida el token (reutiliza la verificación de `JwtStrategy`) y rechaza la conexión
  si es inválido.
- **Unión a salas:** el cliente pide unirse a `classroom:{id}`; el gateway solo lo
  permite si el usuario pertenece a esa aula (misma regla de acceso que el REST).
- **Disparo de actualización:** el único punto donde cambian los puntos de aula es
  `gamification.updateStudentPoints()` (invocado por asignar comportamiento y por el
  ajuste manual de puntos). Tras persistir el cambio, se recalcula el ranking del aula
  y se emite el evento **`ranking:update`** a la sala `classroom:{id}` con el ranking
  completo recalculado.

## Componentes del frontend (Angular)

### Servicio de tiempo real

- **`RealtimeService`** que envuelve `socket.io-client`:
  - Conecta enviando el JWT en el handshake.
  - Métodos `joinClassroom(id)` / `leaveClassroom(id)`.
  - Expone los `ranking:update` recibidos como signal/observable por aula.
  - Maneja reconexión y limpieza al destruir componentes.

### Componente de ranking reutilizable

- **`ClassroomRankingComponent`** (standalone), recibe `classroomId` como input:
  1. Carga inicial vía `GET /classrooms/:id/ranking`.
  2. Se une a la sala y se suscribe a `ranking:update`.
  3. Render: **podio top-3** (🥇🥈🥉) + filas **4 a 10**; si el usuario actual es un
     alumno que **no está en el top 10**, se muestra su propia fila resaltada al final.
  4. La fila del alumno actual se resalta siempre que aparezca.
  5. Re-renderiza con animación suave al llegar un update.

### Dónde aparece

- **Alumno:** en `/student/classrooms/:id` (su aula) y un acceso desde el dashboard.
- **Profesor:** sección/pestaña "Ranking" dentro de `/teacher/classrooms/:slug`
  (pensado para proyectar en clase).

## Pruebas

- **Unit:** `buildRanking()` — orden, desempate y cálculo de `rank` (función pura, en
  línea con los tests existentes de gamificación).
- **Integración ligera:**
  - El gateway emite `ranking:update` a la sala correcta cuando cambian los puntos.
  - El guard de WS y el endpoint REST rechazan el acceso a un aula ajena.

## Fuera de alcance (YAGNI)

- Ranking histórico o por temporadas.
- Ranking global entre aulas.
- Animaciones de "subiste de puesto" / efectos elaborados.
- Notificaciones push (las cubrirá la feature #4).

## Riesgos / consideraciones

- Es la primera infraestructura de WebSockets del proyecto: hay que añadir
  `@nestjs/websockets`, `@nestjs/platform-socket.io` y `socket.io-client`, y configurar
  CORS del socket con `FRONTEND_URL`.
- La autenticación del socket debe reutilizar la verificación JWT existente para no
  duplicar lógica de seguridad.
- Emitir el ranking completo en cada cambio es simple y suficiente para tamaños de aula
  escolares; no se optimiza con diffs (YAGNI).
