# Exportar Reportes a Excel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir descargar reportes en Excel (`.xlsx`): el profesor exporta su aula (ranking + comportamientos) y el director exporta un libro institucional (estudiantes, profesores, aulas, resumen).

**Architecture:** Un `ExportModule` en NestJS genera los workbooks con la librería `xlsx` (ya instalada) y los envía como descarga. La lógica de transformación datos→filas vive en funciones puras (testeables sin BD ni `xlsx`); los builders consultan Prisma y arman el `Buffer`. En Angular, un `ExportService` descarga el blob con `HttpClient` (el interceptor adjunta el JWT) y dispara la descarga en cliente; botones en las vistas de profesor y director.

**Tech Stack:** NestJS 10, Prisma 5, `xlsx` (SheetJS, ya en package.json), Angular 18 (standalone + signals), Jest.

## Global Constraints

- Backend NestJS 10 / Prisma 5; inyectar `PrismaService` (no instanciar clientes).
- Toda ruta HTTP vive bajo el prefijo global `/api` + versión `/v1` (ya configurado).
- `ValidationPipe` global con `whitelist + forbidNonWhitelisted + transform`.
- `xlsx` YA está en `backend/package.json` — NO instalar dependencias nuevas.
- Content-Type de Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Descarga vía `Content-Disposition: attachment; filename="..."`.
- Acceso: export de aula = profesor dueño (`Classroom.teacherId`) o `director`/`admin`; export institucional = `director`/`admin` (vía `RolesGuard`, que deja pasar director/admin).
- La exportación trae el dataset COMPLETO (no reutiliza los endpoints paginados del director).
- Frontend: descarga autenticada con `HttpClient` `responseType: 'blob'` (no `<a href>` directo); URL base `environment.apiUrl` (`http://localhost:3000/api/v1`).

---

### Task 1: Funciones puras de mapeo datos→filas (`ExportService`)

**Files:**
- Create: `backend/src/export/export.service.ts`
- Test: `backend/src/export/export.service.spec.ts`

**Interfaces:**
- Produces (todas métodos de instancia de `ExportService`, puras, sin tocar Prisma/xlsx):
  - `buildClassroomRankingRows(students: StudentInfo[], studentPoints: PointRow[]): RankingRow[]`
  - `buildClassroomBehaviorRows(students: StudentInfo[], behaviorStats: BehaviorStat[]): BehaviorRow[]`
  - `buildStudentRows(users: StudentUser[]): StudentSheetRow[]`
  - `buildTeacherRows(users: TeacherUser[]): TeacherSheetRow[]`
  - `buildClassroomRows(classrooms: ClassroomRow[]): ClassroomSheetRow[]`
  - `buildSummaryRows(stats: DashboardStats): SummaryRow[]`
- Tipos (exportados desde `export.service.ts`):
  ```typescript
  export interface StudentInfo { id: string; name: string; level: number; experiencePoints: number; characterType: string | null; }
  export interface PointRow { studentId: string; totalPoints: number; }
  export interface BehaviorStat { studentId: string; _sum: { pointsAwarded: number | null }; _count: { id: number }; }
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/export/export.service.spec.ts
import { ExportService } from './export.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExportService — pure row mappers', () => {
  let svc: ExportService;
  beforeEach(() => { svc = new ExportService({} as PrismaService); });

  describe('buildClassroomRankingRows', () => {
    it('une estudiante con sus puntos y ordena por puntos desc', () => {
      const students = [
        { id: 'a', name: 'Ana', level: 2, experiencePoints: 150, characterType: 'mago' },
        { id: 'b', name: 'Beto', level: 3, experiencePoints: 400, characterType: null },
      ];
      const points = [{ studentId: 'a', totalPoints: 100 }, { studentId: 'b', totalPoints: 300 }];
      const rows = svc.buildClassroomRankingRows(students, points);
      expect(rows).toEqual([
        { Estudiante: 'Beto', Personaje: '—', Nivel: 3, XP: 400, 'Puntos de aula': 300 },
        { Estudiante: 'Ana', Personaje: 'mago', Nivel: 2, XP: 150, 'Puntos de aula': 100 },
      ]);
    });

    it('usa 0 puntos cuando el estudiante no tiene registro de StudentPoint', () => {
      const rows = svc.buildClassroomRankingRows(
        [{ id: 'a', name: 'Ana', level: 1, experiencePoints: 0, characterType: null }],
        [],
      );
      expect(rows[0]['Puntos de aula']).toBe(0);
    });
  });

  describe('buildClassroomBehaviorRows', () => {
    it('mapea totales y conteo por estudiante, 0 si no hay stats', () => {
      const students = [{ id: 'a', name: 'Ana', level: 1, experiencePoints: 0, characterType: null }];
      const stats = [{ studentId: 'a', _sum: { pointsAwarded: 45 }, _count: { id: 3 } }];
      expect(svc.buildClassroomBehaviorRows(students, stats)).toEqual([
        { Estudiante: 'Ana', 'Puntos por comportamiento': 45, 'Nº de registros': 3 },
      ]);
      expect(svc.buildClassroomBehaviorRows(students, [])).toEqual([
        { Estudiante: 'Ana', 'Puntos por comportamiento': 0, 'Nº de registros': 0 },
      ]);
    });
  });

  describe('buildSummaryRows', () => {
    it('aplana las stats del dashboard en pares Métrica/Valor', () => {
      const stats = {
        totalTeachers: 2, totalStudents: 10, totalParents: 4, totalClassrooms: 3,
        activeClassrooms: 3, totalBehaviorsAwarded: 50, totalRewardsRedeemed: 7,
        monthly: { behaviorsAwarded: 12, rewards: 2, newStudents: 1, newTeachers: 0 },
      };
      const rows = svc.buildSummaryRows(stats);
      expect(rows).toContainEqual({ 'Métrica': 'Total estudiantes', 'Valor': 10 });
      expect(rows).toContainEqual({ 'Métrica': 'Comportamientos (último mes)', 'Valor': 12 });
    });
  });

  describe('buildStudentRows / buildTeacherRows / buildClassroomRows', () => {
    it('mapea estudiantes a columnas con Activo legible', () => {
      const rows = svc.buildStudentRows([
        { name: 'Ana', email: 'a@x.com', level: 2, experiencePoints: 150, points: 30, characterType: 'mago', isActive: true },
      ]);
      expect(rows).toEqual([
        { Nombre: 'Ana', Email: 'a@x.com', Nivel: 2, XP: 150, Puntos: 30, Personaje: 'mago', Activo: 'Sí' },
      ]);
    });

    it('mapea profesores con nº de aulas', () => {
      const rows = svc.buildTeacherRows([
        { name: 'Prof', email: 'p@x.com', isActive: false, _count: { taughtClassrooms: 4 } },
      ]);
      expect(rows).toEqual([{ Nombre: 'Prof', Email: 'p@x.com', 'Nº de aulas': 4, Activo: 'No' }]);
    });

    it('mapea aulas con docente y nº de estudiantes', () => {
      const rows = svc.buildClassroomRows([
        { name: 'Mate', subject: 'Matemáticas', classCode: 'ABC123', isActive: true,
          teacher: { name: 'Prof' }, _count: { students: 12 } },
      ]);
      expect(rows).toEqual([
        { Aula: 'Mate', Materia: 'Matemáticas', Docente: 'Prof', 'Código': 'ABC123', 'Nº de estudiantes': 12, Activa: 'Sí' },
      ]);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest export.service -v`
Expected: FAIL — `Cannot find module './export.service'`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// backend/src/export/export.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface StudentInfo { id: string; name: string; level: number; experiencePoints: number; characterType: string | null; }
export interface PointRow { studentId: string; totalPoints: number; }
export interface BehaviorStat { studentId: string; _sum: { pointsAwarded: number | null }; _count: { id: number }; }
export interface DashboardStats {
  totalTeachers: number; totalStudents: number; totalParents: number;
  totalClassrooms: number; activeClassrooms: number;
  totalBehaviorsAwarded: number; totalRewardsRedeemed: number;
  monthly: { behaviorsAwarded: number; rewards: number; newStudents: number; newTeachers: number };
}

const yesNo = (b: boolean) => (b ? 'Sí' : 'No');

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  buildClassroomRankingRows(students: StudentInfo[], studentPoints: PointRow[]) {
    const pointsById = new Map(studentPoints.map((p) => [p.studentId, p.totalPoints]));
    return students
      .map((s) => ({
        Estudiante: s.name,
        Personaje: s.characterType ?? '—',
        Nivel: s.level,
        XP: s.experiencePoints,
        'Puntos de aula': pointsById.get(s.id) ?? 0,
      }))
      .sort((a, b) => b['Puntos de aula'] - a['Puntos de aula']);
  }

  buildClassroomBehaviorRows(students: StudentInfo[], behaviorStats: BehaviorStat[]) {
    const byId = new Map(behaviorStats.map((x) => [x.studentId, x]));
    return students.map((s) => {
      const stat = byId.get(s.id);
      return {
        Estudiante: s.name,
        'Puntos por comportamiento': stat?._sum.pointsAwarded ?? 0,
        'Nº de registros': stat?._count.id ?? 0,
      };
    });
  }

  buildStudentRows(users: { name: string; email: string; level: number; experiencePoints: number; points: number; characterType: string | null; isActive: boolean }[]) {
    return users.map((u) => ({
      Nombre: u.name, Email: u.email, Nivel: u.level, XP: u.experiencePoints,
      Puntos: u.points, Personaje: u.characterType ?? '—', Activo: yesNo(u.isActive),
    }));
  }

  buildTeacherRows(users: { name: string; email: string; isActive: boolean; _count: { taughtClassrooms: number } }[]) {
    return users.map((u) => ({
      Nombre: u.name, Email: u.email, 'Nº de aulas': u._count.taughtClassrooms, Activo: yesNo(u.isActive),
    }));
  }

  buildClassroomRows(classrooms: { name: string; subject: string | null; classCode: string; isActive: boolean; teacher: { name: string } | null; _count: { students: number } }[]) {
    return classrooms.map((c) => ({
      Aula: c.name, Materia: c.subject ?? '—', Docente: c.teacher?.name ?? '—',
      'Código': c.classCode, 'Nº de estudiantes': c._count.students, Activa: yesNo(c.isActive),
    }));
  }

  buildSummaryRows(stats: DashboardStats) {
    return [
      { 'Métrica': 'Total profesores', 'Valor': stats.totalTeachers },
      { 'Métrica': 'Total estudiantes', 'Valor': stats.totalStudents },
      { 'Métrica': 'Total padres', 'Valor': stats.totalParents },
      { 'Métrica': 'Total aulas', 'Valor': stats.totalClassrooms },
      { 'Métrica': 'Aulas activas', 'Valor': stats.activeClassrooms },
      { 'Métrica': 'Comportamientos asignados (total)', 'Valor': stats.totalBehaviorsAwarded },
      { 'Métrica': 'Canjes de recompensa (total)', 'Valor': stats.totalRewardsRedeemed },
      { 'Métrica': 'Comportamientos (último mes)', 'Valor': stats.monthly.behaviorsAwarded },
      { 'Métrica': 'Canjes (último mes)', 'Valor': stats.monthly.rewards },
      { 'Métrica': 'Estudiantes nuevos (último mes)', 'Valor': stats.monthly.newStudents },
      { 'Métrica': 'Profesores nuevos (último mes)', 'Valor': stats.monthly.newTeachers },
    ];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest export.service -v`
Expected: PASS (todos los casos).

- [ ] **Step 5: Commit**

```bash
git add backend/src/export/export.service.ts backend/src/export/export.service.spec.ts
git commit -m "feat(export): pure data→row mappers for Excel reports"
```

---

### Task 2: Workbook builders + controller + módulo (backend)

**Files:**
- Modify: `backend/src/export/export.service.ts`
- Create: `backend/src/export/export.controller.ts`
- Create: `backend/src/export/export.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: las funciones de mapeo de Task 1, `PrismaService`.
- Produces (en `ExportService`):
  - `buildClassroomWorkbook(classroomId: string): Promise<Buffer>`
  - `buildInstitutionWorkbook(): Promise<Buffer>`
  - `assertTeacherCanExport(classroomId: string, user: { id: string; role: string }): Promise<string>` (devuelve el `slug` del aula para el nombre de archivo; lanza `ForbiddenException` si no autorizado)
  - Rutas: `GET /api/v1/export/classroom/:classroomId` y `GET /api/v1/export/institution`.

- [ ] **Step 1: Add workbook builders + access check to `ExportService`**

Add to `backend/src/export/export.service.ts` — update the top import and append these methods inside the class:

```typescript
// top of file (añade ForbiddenException, XLSX y el enum Role):
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as XLSX from 'xlsx';
// Usa Role.student / Role.teacher / Role.parent en los `where: { role: ... }`
// de buildInstitutionWorkbook y computeStats (NO literales de string), igual que DirectorService.

// inside the class:
  async assertTeacherCanExport(classroomId: string, user: { id: string; role: string }): Promise<string> {
    const where =
      user.role === 'director' || user.role === 'admin'
        ? { id: classroomId }
        : { id: classroomId, teacherId: user.id };
    const classroom = await this.prisma.classroom.findFirst({ where, select: { slug: true } });
    if (!classroom) throw new ForbiddenException('No tienes acceso a esta aula');
    return classroom.slug;
  }

  async buildClassroomWorkbook(classroomId: string): Promise<Buffer> {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        students: { include: { student: { select: { id: true, name: true, level: true, experiencePoints: true, characterType: true } } } },
      },
    });
    const students = (classroom?.students ?? []).map((s) => s.student);
    const studentPoints = await this.prisma.studentPoint.findMany({
      where: { classroomId }, select: { studentId: true, totalPoints: true },
    });
    const behaviorStats = await this.prisma.studentBehavior.groupBy({
      by: ['studentId'], where: { classroomId }, _sum: { pointsAwarded: true }, _count: { id: true },
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.buildClassroomRankingRows(students, studentPoints)), 'Ranking');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.buildClassroomBehaviorRows(students, behaviorStats)), 'Comportamientos');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async buildInstitutionWorkbook(): Promise<Buffer> {
    const [students, teachers, classrooms] = await Promise.all([
      this.prisma.user.findMany({ where: { role: Role.student }, select: { name: true, email: true, level: true, experiencePoints: true, points: true, characterType: true, isActive: true }, orderBy: { name: 'asc' } }),
      this.prisma.user.findMany({ where: { role: Role.teacher }, select: { name: true, email: true, isActive: true, _count: { select: { taughtClassrooms: true } } }, orderBy: { name: 'asc' } }),
      this.prisma.classroom.findMany({ select: { name: true, subject: true, classCode: true, isActive: true, teacher: { select: { name: true } }, _count: { select: { students: true } } }, orderBy: { name: 'asc' } }),
    ]);
    const stats = await this.computeStats();

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.buildStudentRows(students)), 'Estudiantes');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.buildTeacherRows(teachers)), 'Profesores');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.buildClassroomRows(classrooms)), 'Aulas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.buildSummaryRows(stats)), 'Resumen');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // Recalcula las stats del dashboard (mismas consultas que DirectorService.getDashboardStats,
  // duplicadas aquí para no acoplar ExportModule a DirectorModule).
  private async computeStats(): Promise<DashboardStats> {
    const [totalTeachers, totalStudents, totalParents, totalClassrooms, activeClassrooms, totalBehaviorsAwarded, totalRewardsRedeemed] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.teacher } }),
      this.prisma.user.count({ where: { role: Role.student } }),
      this.prisma.user.count({ where: { role: Role.parent } }),
      this.prisma.classroom.count(),
      this.prisma.classroom.count({ where: { isActive: true } }),
      this.prisma.studentBehavior.count(),
      this.prisma.studentReward.count(),
    ]);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [behaviorsAwarded, rewards, newStudents, newTeachers] = await Promise.all([
      this.prisma.studentBehavior.count({ where: { createdAt: { gte: since } } }),
      this.prisma.studentReward.count({ where: { createdAt: { gte: since } } }),
      this.prisma.user.count({ where: { role: Role.student, createdAt: { gte: since } } }),
      this.prisma.user.count({ where: { role: Role.teacher, createdAt: { gte: since } } }),
    ]);
    return { totalTeachers, totalStudents, totalParents, totalClassrooms, activeClassrooms, totalBehaviorsAwarded, totalRewardsRedeemed, monthly: { behaviorsAwarded, rewards, newStudents, newTeachers } };
  }
```

- [ ] **Step 2: Run the existing unit tests to confirm no regression**

Run: `cd backend && npx jest export.service -v`
Expected: PASS (los mismos casos de Task 1; los nuevos métodos no tienen test unitario — se cubren por el smoke del controller).

- [ ] **Step 3: Create the controller**

```typescript
// backend/src/export/export.controller.ts
import { Controller, Get, Param, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExportService } from './export.service';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('Export')
@ApiBearerAuth()
@Controller('export')
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('classroom/:classroomId')
  @UseGuards(JwtAuthGuard)
  async exportClassroom(
    @Param('classroomId') classroomId: string,
    @CurrentUser() user: { id: string; role: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const slug = await this.exportService.assertTeacherCanExport(classroomId, user);
    const buffer = await this.exportService.buildClassroomWorkbook(classroomId);
    res.set({ 'Content-Type': XLSX_MIME, 'Content-Disposition': `attachment; filename="aula-${slug}.xlsx"` });
    return new StreamableFile(buffer);
  }

  @Get('institution')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.director)
  async exportInstitution(@Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const buffer = await this.exportService.buildInstitutionWorkbook();
    res.set({ 'Content-Type': XLSX_MIME, 'Content-Disposition': 'attachment; filename="institucion.xlsx"' });
    return new StreamableFile(buffer);
  }
}
```

- [ ] **Step 4: Create the module**

```typescript
// backend/src/export/export.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
```

- [ ] **Step 5: Register in `app.module.ts`**

Add `import { ExportModule } from './export/export.module';` and include `ExportModule` in the `imports` array of `backend/src/app.module.ts` (after `RankingModule`).

- [ ] **Step 6: Build + smoke test the endpoints**

Run: `cd backend && npx nest build` (expect exit 0). Then start the server (`node dist/src/main.js`), log in as `teacher@legendaryclass.com` / `password123`, find an owned classroom id via `GET /api/v1/classrooms/mine`, and:
```bash
# Espera 200 + content-type de Excel + cuerpo no vacío:
curl -s -D - -o /tmp/aula.xlsx -H "Authorization: Bearer $TTOK" http://localhost:3000/api/v1/export/classroom/<ID> | grep -iE "HTTP/|content-type|content-disposition"
ls -l /tmp/aula.xlsx   # tamaño > 0
# Director:
curl -s -o /tmp/inst.xlsx -w "%{http_code} %{content_type}\n" -H "Authorization: Bearer $DTOK" http://localhost:3000/api/v1/export/institution
# 403 para un profesor sobre un aula ajena:
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TTOK" http://localhost:3000/api/v1/export/classroom/<ID_DE_OTRO_PROFESOR>
```
Expected: aula → `200`, `Content-Type: application/vnd.openxmlformats-...sheet`, archivo > 0 bytes; institution → `200` con el mismo content-type; aula ajena → `403`. Detener el servidor al terminar.

- [ ] **Step 7: Commit**

```bash
git add backend/src/export/ backend/src/app.module.ts
git commit -m "feat(export): xlsx workbook builders + REST endpoints with access control"
```

---

### Task 3: Frontend — `ExportService` + botones de descarga

**Files:**
- Create: `frontend/src/app/core/export/export.service.ts`
- Modify: `frontend/src/app/features/teacher/classrooms/classroom-detail.component.ts`
- Modify: `frontend/src/app/features/director/dashboard/director-dashboard.component.html`
- Modify: `frontend/src/app/features/director/dashboard/director-dashboard.component.ts`

**Interfaces:**
- Consumes: endpoints `GET /export/classroom/:id` y `GET /export/institution` (Task 2).
- Produces: `ExportService.downloadFile(url: string, filename: string): void`

- [ ] **Step 1: Create the ExportService**

```typescript
// frontend/src/app/core/export/export.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class ExportService {
  constructor(private http: HttpClient) {}

  // Descarga un archivo de un endpoint autenticado (el interceptor adjunta el JWT),
  // luego dispara la descarga en el navegador.
  downloadFile(path: string, filename: string): void {
    this.http.get(`${environment.apiUrl}${path}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }
}
```

- [ ] **Step 2: Add the teacher export button**

In `frontend/src/app/features/teacher/classrooms/classroom-detail.component.ts`:
- Inject `ExportService` in the constructor: add `private exportService: ExportService` alongside the existing `private http: HttpClient`.
- Add the import: `import { ExportService } from '../../../core/export/export.service';`
- Add a method to the class:
  ```typescript
  exportExcel() {
    const c = this.classroom();
    if (!c) return;
    this.exportService.downloadFile(`/export/classroom/${c.id}`, `aula-${c.slug}.xlsx`);
  }
  ```
- In the inline template header action area (next to the existing `➕ Nuevo Comportamiento` button, inside the `@else if (classroom())` block), add:
  ```html
  <button (click)="exportExcel()" class="btn-epic btn-blue text-xs py-2 px-5 whitespace-nowrap">📊 Exportar a Excel</button>
  ```

- [ ] **Step 3: Add the director export button**

In `frontend/src/app/features/director/dashboard/director-dashboard.component.ts`:
- Add import `import { ExportService } from '../../../core/export/export.service';` and inject `private exportService: ExportService` in the constructor.
- Add a method:
  ```typescript
  exportExcel() {
    this.exportService.downloadFile('/export/institution', 'institucion.xlsx');
  }
  ```
In `frontend/src/app/features/director/dashboard/director-dashboard.component.html`, add near the top of the dashboard content (after the page header), a button:
```html
<button (click)="exportExcel()" class="btn-epic btn-purple text-sm py-2 px-5">📊 Exportar institución a Excel</button>
```

- [ ] **Step 4: Build + lint**

Run: `cd frontend && npx ng build` (expect exit 0) and `cd frontend && npx ng lint` (expect 0 errors; pre-existing warnings allowed).

- [ ] **Step 5: Manual end-to-end verification**

Run backend (`node dist/src/main.js`) and frontend (`npm start`). As `teacher@legendaryclass.com`, open a classroom detail and click "📊 Exportar a Excel" → a `.xlsx` downloads and opens with two sheets (Ranking, Comportamientos). As `director@legendaryclass.com`, click "📊 Exportar institución a Excel" → a `.xlsx` with four sheets downloads.
Expected: both files download and open in Excel/LibreOffice with the documented sheets and columns populated.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/core/export/export.service.ts frontend/src/app/features/teacher/classrooms/classroom-detail.component.ts frontend/src/app/features/director/dashboard/director-dashboard.component.ts frontend/src/app/features/director/dashboard/director-dashboard.component.html
git commit -m "feat(export): frontend ExportService + download buttons (teacher + director)"
```

---

## Notas de verificación final

- Backend: `npx nest build` (0), `npx jest` (las pruebas de export + las previas verdes), endpoints responden `200` con content-type de Excel y `403` para acceso no autorizado.
- Frontend: `ng build` (0), `ng lint` (0 errores), ambas descargas funcionan en el smoke E2E manual.
- No se añaden dependencias (xlsx ya estaba). No se reutilizan los endpoints paginados del director (la exportación trae todo).
