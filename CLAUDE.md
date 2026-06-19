# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

LegendaryClass is an educational gamification platform that turns the classroom into an RPG. It is a full rewrite of an original Laravel/PHP app onto a modern TypeScript stack: **NestJS + Prisma + PostgreSQL** (backend) and **Angular 18 + TailwindCSS** (frontend). The two apps are independent packages in `backend/` and `frontend/`; `lab03/` holds academic deliverables (Word/Excel/PPT and the Python scripts that generate them) and is unrelated to the running app.

## Commands

All commands run from `backend/` or `frontend/` respectively (not the repo root).

### Database (run first, from `backend/`)
```bash
docker-compose up -d        # from repo root: PostgreSQL 16 on :5432, pgAdmin on :5050
npm run db:migrate          # apply migrations (prisma migrate dev)
npm run db:generate         # regenerate Prisma client after editing schema.prisma
npm run db:seed             # seed demo data + test accounts
npm run db:studio           # Prisma Studio GUI
npm run db:reset            # drop, re-migrate, re-seed
```

### Backend (`backend/`)
```bash
npm run start:dev           # watch mode → http://localhost:3000/api (Swagger at /api/docs)
npm run build               # nest build
npm run lint                # eslint --fix
npm test                    # jest (all)
npm test -- auth.service    # run a single test file by name pattern
npm run test:cov            # coverage
```

### Frontend (`frontend/`)
```bash
npm start                   # ng serve → http://localhost:4200
npm run build:prod          # production build
npm test                    # karma + jasmine
npm run lint
```

## Environment

Backend reads `.env` (copy from `backend/.env.example`). Key vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` (default `7d`), `PORT` (3000), `FRONTEND_URL` (CORS origin). The frontend API base URL lives in `frontend/src/environments/environment.ts` (`apiUrl`), swapped for `environment.prod.ts` in production builds.

## Architecture

### Backend (NestJS)
- Standard NestJS feature modules, all registered in `src/app.module.ts`. Each domain folder (`auth`, `gamification`, `classrooms`, `behaviors`, `rewards`, `quests`, `achievements`, `student`, `teacher`, `director`, `parent`, `users`) follows the controller/service/module + `dto/` convention.
- `main.ts` sets a **global `/api` prefix**, enables CORS for `FRONTEND_URL`, and applies a global `ValidationPipe` with `whitelist + forbidNonWhitelisted + transform` — so DTOs must declare every accepted field or requests are rejected.
- **Auth/authorization** (`src/auth`, `src/common`): JWT via Passport (`jwt.strategy.ts`). Protect routes with `@UseGuards(JwtAuthGuard, RolesGuard)` + the `@Roles(...)` decorator; read the user via the `@CurrentUser()` decorator. **`RolesGuard` lets `director` and `admin` bypass all role checks** — keep this in mind when reasoning about access.
- `src/prisma` wraps the Prisma client as an injectable module; inject `PrismaService` rather than instantiating clients.
- `prisma/schema.prisma` (PostgreSQL) is the single source of truth for the data model and its enums (`Role`, `CharacterType`, `CharacterBonusType`, `BehaviorType`, etc.). After changing it, run `db:generate` and `db:migrate`.

### Frontend (Angular 18, standalone)
- **No NgModules** — everything is standalone components, configured via schematics in `angular.json`. Routing in `src/app/app.routes.ts` uses lazy `loadComponent`/`loadChildren` per feature.
- `src/app/core/` holds cross-cutting concerns: `AuthService` (uses **signals** for auth state), the `authGuard`/`guestGuard`/`roleGuard` route guards, the `auth.interceptor` (attaches the JWT), and shared models.
- `src/app/features/` is split by audience: `public/` (marketing site with a shared layout), `auth/`, and one folder per role — `student/`, `teacher/`, `director/`, `parent/`. Route protection is `roleGuard(['student'])`-style.

### Gamification engine (the core domain logic)
The single most important piece of business logic lives in `backend/src/gamification/gamification.service.ts`. Key invariants:
- **Level formula:** `level = floor(sqrt(xp / 100)) + 1`; XP for next level = `level² × 100`.
- **Two separate point pools — do not conflate them:**
  - `StudentPoint.totalPoints` — **per-classroom** points (drive classroom ranking and classroom level). Assigned by teachers via behaviors.
  - `User.points` — **global** points across all classrooms (spent on reward redemptions and manual stat upgrades, 50 pts each, +5 per upgrade).
- **Characters** (Mago/Guerrero/Ninja/Arquero/Lanzador) each map to a `CharacterBonusType` granting **+20% XP** on matching action types (see `CHARACTER_INFO`). Character choice is **permanent (one-time)**.
- **Tiers** by level: Novato 1–24, Veterano 25–49, Épico 50–74, Legendario 75+ (each adds a flat stat bonus and a new illustration).
- Achievements are defined declaratively in `ACHIEVEMENT_DEFINITIONS`; streaks (`streakDays`) persist if there is activity same-day or previous-day.
- **Reward redemption flow:** `pending → approved → delivered`, or `cancelled`.

## Test accounts (after `npm run db:seed`)
All use password `password123`: `director@`, `teacher@`, `student1@` (Mago Lv3), `student2@` (Guerrero Lv2), `parent@` `legendaryclass.com`. Demo classroom code: **`DEMO01`**.
