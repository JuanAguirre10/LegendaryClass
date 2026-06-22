# ⚔️ LegendaryClass

Sistema de gamificación educativa que transforma el aula en una experiencia RPG.  
Reescritura completa de una aplicación Laravel/PHP original usando un stack moderno.

**Stack:** NestJS · PostgreSQL · Prisma · Angular 18 · TailwindCSS

---

## Tabla de contenidos

- [Descripción del proyecto](#descripción-del-proyecto)
- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Instalación rápida](#instalación-rápida)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos](#base-de-datos)
- [Desarrollo](#desarrollo)
- [Páginas implementadas](#páginas-implementadas)
- [Estructura del proyecto](#estructura-del-proyecto)
- [API — Endpoints](#api--endpoints)
- [Sistema de gamificación](#sistema-de-gamificación)
- [Roles y permisos](#roles-y-permisos)
- [Mejoras respecto a la versión Laravel](#mejoras-respecto-a-la-versión-laravel)
- [Cuentas de prueba](#cuentas-de-prueba)
- [Scripts de referencia rápida](#scripts-de-referencia-rápida)

---

## Descripción del proyecto

LegendaryClass es una plataforma web que convierte el aula en un videojuego de rol (RPG):

- Los **estudiantes** eligen un personaje (Mago, Guerrero, Ninja, Arquero, Lanzador), acumulan XP, suben de nivel, completan misiones, desbloquean logros y canjean recompensas en la tienda del aula.
- Los **profesores** crean aulas, definen comportamientos (positivos/negativos), asignan puntos a estudiantes, publican misiones y administran recompensas.
- El **director** tiene una vista global del sistema: estadísticas, gestión de usuarios, listados de aulas.
- Los **padres** pueden vincular a sus hijos y monitorear su progreso.

### Funcionalidades destacadas

- **🏆 Ranking de aula en vivo** — leaderboard por puntos de aula que se actualiza en tiempo real (WebSocket) cuando el profesor asigna o ajusta puntos.
- **🔔 Notificaciones in-app en tiempo real** — avisos de subida de nivel, logros desbloqueados, cambios de estado de canje (al alumno) y canjes pendientes (al profesor), con campana y contador de no-leídas.
- **📊 Exportación a Excel** — el profesor descarga el reporte de su aula (ranking + comportamientos) y el director un libro institucional (estudiantes, profesores, aulas, resumen).
- **🖼️ Subida de avatar/foto** — usuarios y aulas suben imagen propia (almacenamiento local, validación de tipo/tamaño).
- **🔒 Endurecimiento** — JWT con _fail-fast_, rate-limiting + helmet, índices de foreign keys, paginación de listados (`{ data, meta }`), ESLint con reglas de accesibilidad.

---

## Arquitectura

```
LegendaryClass/
├── backend/                NestJS API REST  →  http://localhost:3000
│   ├── prisma/             Schema PostgreSQL + migraciones + seed
│   └── src/
│       ├── auth/           JWT + Passport (login, register, me)
│       ├── gamification/   Motor de XP, niveles, logros, streaks
│       ├── classrooms/     Gestión de aulas (CRUD, slug, código de acceso)
│       ├── behaviors/      Comportamientos + asignación a estudiantes
│       ├── rewards/        Recompensas + flujo de canje (pending→approved)
│       ├── quests/         Misiones + completado + bonus por personaje
│       ├── achievements/   Logros desbloqueables
│       ├── student/        Dashboard, selección de personaje, upgrade de stats
│       ├── teacher/        Dashboard del profesor + reportes de aula
│       ├── director/       Estadísticas globales + gestión de usuarios
│       └── parent/         Vinculación + seguimiento de hijos
├── frontend/               Angular 18 SPA  →  http://localhost:4200
│   └── src/app/
│       ├── core/           AuthService (signals), guards, interceptors, modelos
│       └── features/
│           ├── public/     Sitio de marketing (landing, características, etc.)
│           ├── auth/       Login + Registro
│           ├── student/    Dashboard, aulas, misiones, logros, tienda, perfil
│           ├── teacher/    Dashboard, aulas, comportamientos, recompensas
│           ├── director/   Panel global, profesores, estudiantes, reportes
│           └── parent/     Seguimiento familiar
└── docker-compose.yml      PostgreSQL 16 + pgAdmin 4
```

---

## Requisitos previos

| Herramienta | Versión mínima | Notas |
|-------------|---------------|-------|
| Node.js     | 20.x LTS      | [nodejs.org](https://nodejs.org) |
| npm         | 10.x          | Incluido con Node |
| PostgreSQL  | 15+           | O usar Docker (ver abajo) |
| Angular CLI | 18.x          | `npm i -g @angular/cli` |
| NestJS CLI  | 10.x          | `npm i -g @nestjs/cli` |
| Docker      | Cualquiera    | Solo si usas el compose |

---

## Instalación rápida

### 1 · Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd LegendaryClass

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2 · Base de datos con Docker (recomendado)

```bash
# Desde la raíz del proyecto
docker-compose up -d

# PostgreSQL:  localhost:5432
# pgAdmin UI:  http://localhost:5050
#              admin@legendaryclass.com / admin
```

Si prefieres PostgreSQL local, asegúrate de que el servicio esté corriendo en el puerto 5432 con la base de datos `legendaryclass` creada.

### 3 · Variables de entorno

```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales
```

Ejemplo mínimo funcional con el Docker incluido:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/legendaryclass?schema=public"
JWT_SECRET="mi_secreto_super_largo_y_seguro_minimo_32_chars"
JWT_EXPIRES_IN="7d"
PORT=3000
FRONTEND_URL="http://localhost:4200"
```

### 4 · Migraciones y seed

```bash
cd backend

npm run db:generate    # Genera el cliente Prisma
npm run db:migrate     # Aplica las migraciones (crea las tablas)
npm run db:seed        # Carga datos de prueba
```

### 5 · Iniciar servidores

```bash
# Terminal 1 — Backend
cd backend && npm run start:dev

# Terminal 2 — Frontend
cd frontend && npm start
```

Abre **http://localhost:4200** en el navegador.

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@localhost:5432/legendaryclass` |
| `JWT_SECRET` | Secreto para firmar JWTs (mínimo 32 chars) | `un_secreto_muy_largo_y_aleatorio` |
| `JWT_EXPIRES_IN` | Duración del token | `7d` |
| `PORT` | Puerto del servidor NestJS | `3000` |
| `FRONTEND_URL` | URL del frontend (CORS whitelist) | `http://localhost:4200` |

> **Nunca** subas el archivo `.env` al repositorio. El `.gitignore` ya lo excluye.

---

## Base de datos

### Comandos útiles

```bash
cd backend

npm run db:migrate        # Aplica migraciones en desarrollo
npm run db:migrate:prod   # Aplica migraciones en producción (sin prompts)
npm run db:generate       # Regenera el cliente tras cambios en schema.prisma
npm run db:seed           # Carga datos de prueba
npm run db:studio         # Abre Prisma Studio (GUI visual)
npm run db:reset          # Resetea la BD completa — ¡borra todos los datos!
```

### Modelos principales del schema

| Modelo | Descripción |
|--------|-------------|
| `User` | Todos los roles. Incluye stats RPG: strength, intelligence, agility, creativity, leadership, resilience |
| `Classroom` | Aula con slug único, código de acceso de 6 caracteres, año escolar |
| `ClassroomStudent` | Relación N:M estudiante ↔ aula |
| `StudentPoint` | Puntos por aula — independientes de los puntos globales del usuario |
| `Behavior` | Definición de comportamiento (positivo/negativo, categoría, puntos) |
| `StudentBehavior` | Registro de cada asignación de comportamiento |
| `ExperienceLog` | Historial completo de cambios de XP con multiplicadores |
| `Reward` | Recompensa con rareza, stock, costo en puntos, nivel mínimo requerido |
| `StudentReward` | Canje con flujo de estados: `pending → approved → delivered` |
| `Achievement` | Logro con progreso numérico e indicador de completado |
| `Quest` | Misión activa/completada con recompensa de XP |
| `QuestStudent` | Relación estudiante ↔ misión con estado de completado |
| `ParentChild` | Relación padre ↔ hijo para el módulo de seguimiento |
| `Notification` | Notificación in-app (tipo, título, mensaje, link, leída) entregada en tiempo real |

### Modificar el schema

```bash
# 1. Edita backend/prisma/schema.prisma
# 2. Genera la migración
npm run db:migrate -- --name nombre_descriptivo
# 3. El cliente Prisma se regenera automáticamente
```

---

## Desarrollo

### Backend (NestJS — puerto 3000)

```bash
cd backend
npm run start:dev      # Modo watch — recarga automáticamente
npm run start:debug    # Con debugger adjunto
npm run build          # Build de producción
npm run lint           # Linting con ESLint
npm run test           # Tests unitarios (Jest)
npm run test:cov       # Reporte de cobertura
```

**Documentación interactiva de la API:**  
`http://localhost:3000/api/docs` (Swagger UI, disponible con el servidor corriendo)

### Frontend (Angular — puerto 4200)

```bash
cd frontend
npm start              # Dev server con hot reload
npm run build          # Build estándar
npm run build:prod     # Build optimizado para producción
npm test               # Tests Karma/Jasmine
```

---

## Páginas implementadas

### Sitio público (sin autenticación)

| Ruta | Página | Estado |
|------|--------|--------|
| `/` | Landing page — hero, stats, secciones de navegación | ✅ Completo |
| `/caracteristicas` | Showcase de funcionalidades del sistema | ✅ Completo |
| `/como-funciona` | Guía paso a paso por rol (estudiante, profesor, director) | ✅ Completo |
| `/personajes` | Galería de los 5 personajes con stats y bonus | ✅ Completo |
| `/precios` | Planes de precio | ✅ Completo |
| `/faq` | Preguntas frecuentes | ✅ Completo |

### Autenticación

| Ruta | Página | Estado |
|------|--------|--------|
| `/auth/login` | Inicio de sesión con JWT | ✅ Completo |
| `/auth/register` | Registro — selección de rol en el formulario | ✅ Completo |

### Módulo Estudiante

| Ruta | Página | Estado |
|------|--------|--------|
| `/student/character-select` | Selección de personaje (solo primer acceso) | ✅ Completo |
| `/student/dashboard` | Dashboard: XP, aulas, misiones activas, logros, tienda | ✅ Completo |
| `/student/classrooms` | Lista de aulas inscritas + unirse por código | ✅ Completo |
| `/student/classrooms/:id` | Detalle de aula: ranking, comportamientos, misiones | ✅ Completo |
| `/student/quests` | Lista de misiones activas y completadas | ✅ Completo |
| `/student/rewards` | Tienda de recompensas por rareza | ✅ Completo |
| `/student/achievements` | Grid de logros con barra de progreso | ✅ Completo |
| `/student/profile` | Perfil: stats RPG, barra XP, tier, avatar de personaje | ✅ Completo |

### Módulo Profesor

| Ruta | Página | Estado |
|------|--------|--------|
| `/teacher/dashboard` | Resumen de aulas, actividad reciente, canjes pendientes | ✅ Completo |
| `/teacher/classrooms` | Lista de aulas con buscador | ✅ Completo |
| `/teacher/classrooms/:slug` | Detalle: tabla de estudiantes, asignación de comportamientos, puntos | ✅ Completo |
| `/teacher/behaviors` | Catálogo de comportamientos + crear + asignaciones recientes | ✅ Completo |
| `/teacher/rewards` | Catálogo de recompensas + crear + aprobar/rechazar canjes | ✅ Completo |

### Módulo Director

| Ruta | Página | Estado |
|------|--------|--------|
| `/director/dashboard` | 8 métricas globales + estadísticas de los últimos 30 días | ✅ Completo |
| `/director/teachers` | Tabla de profesores con toggle activo/inactivo | ✅ Completo |
| `/director/students` | Tabla de estudiantes ordenada por nivel/XP | ✅ Completo |
| `/director/reports` | Métricas mensuales y comparativas | ✅ Completo |

### Módulo Padre

| Ruta | Página | Estado |
|------|--------|--------|
| `/parent/dashboard` | Tarjetas de hijos vinculados + vinculación por email | ✅ Completo |

---

## Estructura del proyecto

### Backend

```
backend/src/
├── main.ts                    Bootstrap: Swagger, ValidationPipe, CORS
├── app.module.ts              Módulo raíz — registra todos los submódulos
├── prisma/
│   ├── prisma.module.ts       Módulo global
│   └── prisma.service.ts      Cliente Prisma inyectable
├── common/
│   ├── decorators/
│   │   ├── roles.decorator.ts         @Roles(...) para marcar endpoints
│   │   └── current-user.decorator.ts  @CurrentUser() extrae usuario del JWT
│   ├── guards/
│   │   ├── jwt-auth.guard.ts    Verifica token + user.isActive en cada request
│   │   └── roles.guard.ts       Director/admin bypass · verifica rol requerido
│   └── filters/
│       └── http-exception.filter.ts   Respuestas de error unificadas
├── auth/
│   ├── auth.controller.ts     POST /register · POST /login · GET /me
│   ├── auth.service.ts        Registro con bcrypt · login · signToken
│   ├── strategies/
│   │   ├── jwt.strategy.ts    Valida JWT contra BD (verifica isActive)
│   │   └── local.strategy.ts  Estrategia para login con email/contraseña
│   └── dto/                   RegisterDto · LoginDto con class-validator
├── gamification/
│   └── gamification.service.ts
│       • calculateLevel(xp)       → floor(sqrt(xp/100)) + 1
│       • getNextLevelXp(level)    → level² × 100
│       • gainExperience(...)      → XP + bonus de personaje + level up + log
│       • updateStudentPoints(...) → Puntos de aula + streak + achievements
│       • checkLevelAchievements   → Desbloquea logros en niveles 5,10,25,50,75
│       • checkQuestAchievements   → Desbloquea en misiones 1,5,10
│       • checkStreakAchievements  → Desbloquea en racha 7,30 días
├── classrooms/     CRUD + join por código + slug único + puntos manuales
├── behaviors/      CRUD + asignación + reversión + historial por aula
├── rewards/        CRUD + toggle activo + canje + aprobación/rechazo
├── quests/         CRUD + completar + bonus XP por tipo de personaje
├── achievements/   Lectura de logros por usuario
├── student/        Selección de personaje · dashboard · upgrade de stats (puntos globales)
├── teacher/        Dashboard · reporte de aula
├── director/       Estadísticas globales · CRUD de usuarios · toggle de estado
└── parent/         Vinculación por email · progreso de hijos
```

### Frontend

```
frontend/src/app/
├── core/
│   ├── auth/
│   │   ├── auth.service.ts      Signals reactivos: user(), token(), isAuthenticated()
│   │   │                        updateUser() sincroniza signal + localStorage
│   │   ├── auth.guard.ts        Protege rutas autenticadas · redirige guests
│   │   └── role.guard.ts        Verifica rol · director/admin bypass
│   ├── interceptors/
│   │   └── auth.interceptor.ts  Añade Bearer token a cada request · 401 → logout
│   └── models/
│       └── user.model.ts        Tipos TypeScript + CHARACTER_DATA + charImagePath
├── features/
│   ├── public/
│   │   ├── layout/              Navbar pública + footer con enlaces
│   │   └── pages/
│   │       ├── home-page/       Hero animado · stats · tarjetas de secciones
│   │       ├── features-page/   Características del sistema
│   │       ├── how-it-works-page/ Guía por rol con pasos numerados
│   │       ├── characters-page/ Galería de los 5 personajes con stats
│   │       ├── pricing-page/    Planes de precio
│   │       └── faq-page/        Preguntas frecuentes
│   ├── auth/
│   │   ├── login/               Reactive Form · manejo de errores · redirect por rol
│   │   └── register/            Registro con selector de rol
│   ├── student/
│   │   ├── character-select/    Selección única con animaciones · 5 personajes
│   │   ├── dashboard/           XP bar · personaje 650px · stats upgradeable · aulas · quests
│   │   ├── classrooms/          Lista + unirse por código
│   │   ├── classrooms/detail/   Ranking · comportamientos · misiones del aula
│   │   ├── quests/              Lista de misiones con estado
│   │   ├── rewards/             Tienda filtrada por rareza
│   │   ├── achievements/        Grid de logros con progreso
│   │   └── profile/             Stats · tier · XP progress · avatar de personaje
│   ├── teacher/
│   │   ├── dashboard/           Resumen de actividad + canjes pendientes
│   │   ├── classrooms/          Buscador + lista de aulas
│   │   ├── classrooms/detail/   Tabla de estudiantes + asignación de comportamientos
│   │   ├── behaviors/           Catálogo por aula + crear + historial de asignaciones
│   │   └── rewards/             Catálogo + crear + aprobar/rechazar canjes
│   ├── director/
│   │   ├── dashboard/           8 tarjetas de métricas + estadísticas mensuales
│   │   ├── teachers/            Tabla con toggle activo/inactivo
│   │   ├── students/            Tabla ordenada por nivel y XP
│   │   └── reports/             Actividad de los últimos 30 días
│   └── parent/
│       └── dashboard/           Tarjetas de hijos + vinculación por email
└── app.routes.ts                Lazy loading por módulo · guards en cada segmento
```

---

## API — Endpoints

Base URL: `http://localhost:3000/api/v1` (versionado por URI)  
Documentación interactiva: `http://localhost:3000/api/docs`  
WebSocket (tiempo real): mismo origen, namespace por defecto — eventos `ranking:update` y `notification:new`. Archivos subidos servidos en `http://localhost:3000/uploads/…`

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registro de nuevo usuario |
| POST | `/auth/login` | Inicio de sesión → devuelve JWT + datos de usuario |
| GET  | `/auth/me` | Usuario autenticado actual (requiere JWT) |

### Usuario

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/users/profile` | Ver perfil propio |
| PATCH  | `/users/profile` | Actualizar nombre / avatar / grado |
| PATCH  | `/users/profile/password` | Cambiar contraseña |
| DELETE | `/users/profile` | Eliminar cuenta |

### Aulas

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST   | `/classrooms` | teacher | Crear aula |
| GET    | `/classrooms/mine` | teacher | Mis aulas |
| GET    | `/classrooms/:slug` | all | Ver aula por slug |
| PATCH  | `/classrooms/:slug` | teacher | Actualizar aula |
| DELETE | `/classrooms/:slug` | teacher | Eliminar aula |
| POST   | `/classrooms/:slug/regenerate-code` | teacher | Nuevo código de acceso |
| DELETE | `/classrooms/:slug/students/:id` | teacher | Remover un estudiante |
| DELETE | `/classrooms/:slug/students` | teacher | Remover todos los estudiantes |
| POST   | `/classrooms/:slug/adjust-points` | teacher | Ajustar puntos manualmente |
| POST   | `/classrooms/join` | student | Unirse por código de 6 caracteres |
| GET    | `/classrooms/student/enrolled` | student | Mis aulas como estudiante |
| DELETE | `/classrooms/:id/leave` | student | Salir de un aula |

### Comportamientos

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST   | `/behaviors` | teacher | Crear comportamiento |
| GET    | `/behaviors/classroom/:id` | teacher | Comportamientos de un aula |
| PATCH  | `/behaviors/:id` | teacher | Actualizar |
| DELETE | `/behaviors/:id` | teacher | Eliminar (solo si sin uso previo) |
| POST   | `/behaviors/award` | teacher | Asignar comportamiento a estudiante |
| DELETE | `/behaviors/student-behavior/:id` | teacher | Revertir asignación |
| GET    | `/behaviors/student-behaviors/:classroomId` | teacher | Historial del aula |

### Recompensas

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST   | `/rewards` | teacher | Crear recompensa |
| GET    | `/rewards/classroom/:id` | all | Recompensas de un aula |
| PATCH  | `/rewards/:id` | teacher | Actualizar recompensa |
| DELETE | `/rewards/:id` | teacher | Eliminar |
| PATCH  | `/rewards/:id/toggle-status` | teacher | Activar / desactivar |
| POST   | `/rewards/redeem` | student | Canjear recompensa |
| GET    | `/rewards/student/history` | student | Historial de canjes del estudiante |
| PATCH  | `/rewards/student-reward/:id/status` | teacher | Aprobar / rechazar canje |
| POST   | `/rewards/:id/approve-all-pending` | teacher | Aprobar todos los pendientes |
| GET    | `/rewards/classroom/:classroomId/redemptions` | teacher | Ver todos los canjes del aula |

### Misiones

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST   | `/quests` | teacher | Crear misión |
| GET    | `/quests/classroom/:id` | teacher | Misiones de un aula |
| GET    | `/quests/my-quests` | student | Mis misiones activas |
| POST   | `/quests/:id/complete` | student | Completar misión (+XP) |
| DELETE | `/quests/:id` | teacher | Eliminar misión |

### Módulos de rol

| Ruta | Rol | Descripción |
|------|-----|-------------|
| `GET  /student/dashboard` | student | Dashboard completo: aulas, quests, logros, rewards, stats |
| `GET  /student/progress` | student | XP y progreso de nivel |
| `POST /student/character/select` | student | Selección de personaje (una sola vez) |
| `GET  /student/character-profile` | student | Perfil con stats y árbol de evolución |
| `POST /student/upgrade-stat` | student | Mejorar stat con puntos globales (costo: 50 pts) |
| `GET  /teacher/dashboard` | teacher | Resumen de actividad del profesor |
| `GET  /teacher/classrooms/:id/report` | teacher | Reporte de un aula |
| `GET  /director/stats` | director | Estadísticas globales del sistema |
| `GET  /director/teachers` | director | Lista de profesores |
| `GET  /director/students` | director | Lista de estudiantes |
| `GET  /director/classrooms` | director | Todas las aulas |
| `POST /director/users` | director | Crear usuario manualmente |
| `PATCH /director/users/:id/role` | director | Cambiar rol de usuario |
| `PATCH /director/users/:id/toggle-status` | director | Activar / desactivar usuario |
| `GET  /parent/dashboard` | parent | Hijos vinculados con progreso |
| `GET  /parent/children/:id/progress` | parent | Progreso detallado de un hijo |
| `POST /parent/link-child` | parent | Vincular hijo por email |
| `DELETE /parent/unlink-child/:id` | parent | Desvincular hijo |

### Ranking (tiempo real)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/ranking/classroom/:classroomId` | Ranking del aula (carga inicial); en vivo vía evento socket `ranking:update` |

### Notificaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET   | `/notifications` | Lista paginada de las notificaciones del usuario |
| GET   | `/notifications/unread-count` | Contador de no-leídas |
| PATCH | `/notifications/:id/read` | Marcar una como leída |
| PATCH | `/notifications/read-all` | Marcar todas como leídas |

### Exportar a Excel

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/export/classroom/:classroomId` | `.xlsx` del aula (Ranking + Comportamientos) — profesor dueño o director |
| GET | `/export/institution` | `.xlsx` institucional (Estudiantes, Profesores, Aulas, Resumen) — director |

### Subir avatar/foto

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/users/profile/avatar` | Subir foto de perfil (multipart `file`; jpg/png/webp, máx 2 MB) |
| POST | `/classrooms/:slug/avatar` | Subir imagen del aula — profesor dueño o director |

---

## Sistema de gamificación

### Fórmula de XP y niveles

```
nivel = floor(sqrt(xp / 100)) + 1

Ejemplos:
  0    XP  →  Nivel 1
  100  XP  →  Nivel 2
  400  XP  →  Nivel 3
  900  XP  →  Nivel 4
  2500 XP  →  Nivel 6
  10000 XP →  Nivel 11

XP para el siguiente nivel = nivel² × 100
XP del nivel actual        = (nivel - 1)² × 100
```

### Personajes

| Personaje | Emoji | Bonus | Acciones con +20% XP |
|-----------|-------|-------|---------------------|
| Mago      | 🧙‍♂️ | knowledge | homework, quiz, reading, study |
| Guerrero  | ⚔️   | strength  | project, challenge, persistence, effort |
| Ninja     | 🥷   | agility   | participation, quick_response, active |
| Arquero   | 🏹   | precision | accuracy, detail, careful, perfect |
| Lanzador  | 🎯   | creativity | creative, art, innovation, original |

La selección de personaje es **permanente** — solo puede hacerse una vez.

### Evolución (Tiers)

| Tier | Nombre | Niveles | Bonus a stats |
|------|--------|---------|---------------|
| 1 | Novato     | 1–24  | +0  a todas las stats |
| 2 | Veterano   | 25–49 | +25 a todas las stats |
| 3 | Épico      | 50–74 | +50 a todas las stats |
| 4 | Legendario | 75+   | +100 a todas las stats |

Al cambiar de tier el personaje muestra una nueva ilustración.

### Stats del personaje (upgrade manual)

Cada estudiante tiene 6 estadísticas: `strength`, `intelligence`, `agility`, `creativity`, `leadership`, `resilience`.

- **Costo:** 50 puntos globales del usuario por mejora
- **Incremento:** +5 por mejora
- **Fuente de puntos:** `user.points` (puntos globales, sumados de todos los comportamientos recibidos)

### Logros

| Clave | Condición | XP al desbloquear |
|-------|-----------|-------------------|
| `first_quest` | 1 misión completada | 25 XP |
| `quest_5` | 5 misiones completadas | 50 XP |
| `quest_master` | 10 misiones completadas | 100 XP |
| `level_5` | Nivel 5 | 75 XP |
| `level_10` | Nivel 10 | 150 XP |
| `level_25` | Nivel 25 | 250 XP |
| `level_50` | Nivel 50 | 500 XP |
| `level_75` | Nivel 75 | 1000 XP |
| `first_hundred` | 100 puntos acumulados en un aula | 20 XP |
| `five_hundred` | 500 puntos en un aula | 50 XP |
| `thousand_club` | 1000 puntos en un aula | 100 XP |
| `week_warrior` | 7 días de racha | 75 XP |
| `month_champ` | 30 días de racha | 150 XP |

### Puntos de aula vs. puntos globales

- **`StudentPoint.totalPoints`** — Puntos **por aula**. Se usan para el ranking de aula y el nivel de aula (`floor(puntos/100) + 1`). Los asigna el profesor al registrar comportamientos.
- **`User.points`** — Puntos **globales** acumulados en total. Se usan para canjear recompensas y para el upgrade manual de stats.
- La racha (`streakDays`) se mantiene si hay actividad el mismo día o el día anterior.

### Flujo de canje de recompensas

```
Estado inicial: pending
  → approved  (profesor lo aprueba)  → delivered  (entregado)
  → cancelled (rechazado o cancelado)
```

Verificaciones antes de permitir el canje:
1. Nivel mínimo requerido (`levelRequirement`)
2. Tipo de personaje compatible (`characterSpecific`, si aplica)
3. Usos máximos por estudiante (`maxUsesPerStudent`)
4. Stock disponible (`stockQuantity`, si está configurado)
5. Puntos suficientes en el aula para la recompensa

---

## Roles y permisos

| Rol | Acceso |
|-----|--------|
| `director` | Acceso completo — bypasses todas las verificaciones de rol |
| `admin` | Igual que director |
| `teacher` | Sus propias aulas · behaviors · rewards · quests |
| `student` | Sus aulas · misiones · logros · tienda |
| `parent` | Solo los hijos vinculados |

Verificación en dos capas:
1. **`JwtAuthGuard`** — Valida el token JWT y que `user.isActive === true`
2. **`RolesGuard`** — Compara el rol del usuario contra `@Roles(...)` en el endpoint

---

## Mejoras respecto a la versión Laravel

### Funcionales

| # | Descripción | Archivo |
|---|-------------|---------|
| 1 | **Puntos nunca negativos** — La versión PHP no tenía límite inferior. Fix: `Math.max(0, current + delta)` | `gamification.service.ts` |
| 2 | **Comportamiento no eliminable si está en uso** — La versión PHP permitía borrar behaviours con registros activos dejando FKs huérfanas | `behaviors.service.ts` |
| 3 | **Selección de personaje permanente** — La ruta PHP no verificaba si ya había personaje seleccionado. Fix: chequeo de `firstCharacterSelection` | `student.service.ts` |
| 4 | **XP sin decimales** — El bonus de personaje (+20%) podía generar decimales. Fix: `Math.round(points * multiplier)` | `gamification.service.ts` |
| 5 | **Unicidad de código de aula garantizada** — PHP usaba `str_random` sin verificar atomicidad. Fix: bucle `do/while` con verificación en BD | `classrooms.service.ts` |
| 6 | **Nivel de aula se recalcula al revertir un comportamiento** — PHP dejaba el nivel desfasado al eliminar un `StudentBehavior` | `gamification.service.ts` |
| 7 | **JWT verifica usuario activo en cada request** — PHP no validaba `is_active` por request | `jwt-auth.guard.ts` |
| 8 | **Slug regenerado al renombrar un aula** — PHP dejaba el slug obsoleto tras cambiar el nombre | `classrooms.service.ts` |
| 9 | **Stats se mejoran con puntos globales** — La versión PHP no distinguía entre puntos de aula y puntos globales; el upgrade ahora usa `user.points` global | `student.service.ts` |

### Técnicas

- **NestJS + Prisma** en lugar de Laravel + Eloquent
- **Angular 18 Signals** (`signal()`, `computed()`) para estado reactivo sin NgRx
- **Lazy loading** por módulo de rol en el router de Angular
- **Guards de rol** en frontend y backend sin duplicar lógica
- **Swagger** autogenerado desde decoradores NestJS
- **Separación** entre puntos de aula (`StudentPoint`) y puntos globales (`User.points`)

---

## Cuentas de prueba

Disponibles después de ejecutar `npm run db:seed`:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Director | director@legendaryclass.com | password123 |
| Profesor | teacher@legendaryclass.com | password123 |
| Estudiante 1 (Mago Lv3) | student1@legendaryclass.com | password123 |
| Estudiante 2 (Guerrero Lv2) | student2@legendaryclass.com | password123 |
| Padre | parent@legendaryclass.com | password123 |

El aula de demo tiene código: **`DEMO01`**

---

## Scripts de referencia rápida

```bash
# ── Instalación completa desde cero ─────────────────────────────────────
docker-compose up -d
cd backend
npm install && cp .env.example .env
npm run db:generate && npm run db:migrate && npm run db:seed
npm run start:dev &
cd ../frontend && npm install && npm start

# ── Reset completo de la BD ──────────────────────────────────────────────
cd backend && npm run db:reset && npm run db:seed

# ── Ver la BD en Prisma Studio ───────────────────────────────────────────
cd backend && npm run db:studio

# ── Build de producción ──────────────────────────────────────────────────
cd backend && npm run build
cd ../frontend && npm run build:prod
```
