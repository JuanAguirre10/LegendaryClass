# Subir Avatar/Foto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir subir una imagen real como avatar de usuario y como foto de aula; guardarla en disco local, servirla estáticamente, y persistir la ruta en `User.avatar` / `Classroom.avatar`.

**Architecture:** Configuración reutilizable de `multer` (disk storage + filtro de tipo + nombre único) con funciones puras testeables; dos endpoints multipart (`POST /users/profile/avatar`, `POST /classrooms/:slug/avatar`) que guardan el archivo, actualizan el campo `avatar` y borran best-effort el anterior; `main.ts` sirve `uploads/` como estáticos en `/uploads`. En Angular, un `AvatarUploadComponent` reutilizable sube vía `FormData` y muestra la imagen.

**Tech Stack:** NestJS 10 (`platform-express`), `multer` + `@types/multer` (ya instalados), Prisma 5, Node `crypto`/`fs`, Angular 18 (standalone + signals), Jest.

## Global Constraints

- `multer` y `@types/multer` YA están en `backend/package.json` — NO instalar dependencias nuevas.
- Archivos en `backend/uploads/avatars/`; carpeta en `.gitignore`; se crea en arranque si no existe.
- Servir estáticos con prefijo `/uploads` (FUERA del prefijo global `/api`).
- El campo `avatar` guarda la ruta relativa `/uploads/avatars/<archivo>`.
- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp` (SVG excluido). Tamaño máximo 2 MB.
- Nombre de archivo generado en el servidor (no confiar en el nombre del cliente).
- Acceso: avatar de usuario = el propio usuario autenticado; avatar de aula = profesor dueño o `director`/`admin`.
- Inyectar `PrismaService`; patrones NestJS 10. Frontend: `environment.apiUrl` = `http://localhost:3000/api/v1`; origen = apiUrl sin `/api/v1`.

---

### Task 1: Configuración de subida + helpers puros (`avatar-upload`)

**Files:**
- Create: `backend/src/common/upload/avatar-upload.ts`
- Test: `backend/src/common/upload/avatar-upload.spec.ts`

**Interfaces:**
- Produces (exportados desde `avatar-upload.ts`):
  - `const UPLOADS_ROOT: string` — path absoluto a `<cwd>/uploads`
  - `const AVATARS_DIR: string` — path absoluto a `<cwd>/uploads/avatars`
  - `const ALLOWED_AVATAR_MIME: string[]`
  - `extFromMime(mime: string): string | null` — `'image/png'→'.png'`, `'image/jpeg'→'.jpg'`, `'image/webp'→'.webp'`, otro → `null`
  - `generateAvatarFilename(mime: string): string` — `<uuid><ext>` único
  - `imageFileFilter(req, file, cb)` — callback multer; acepta tipos permitidos, rechaza el resto con `BadRequestException`
  - `localAvatarDiskPath(avatarUrl: string | null): string | null` — mapea `/uploads/avatars/x.png` → path en disco; `null` si no es un upload local
  - `multerAvatarOptions` — objeto de opciones para `FileInterceptor` (storage diskStorage en `AVATARS_DIR` con `generateAvatarFilename`, `fileFilter: imageFileFilter`, `limits.fileSize: 2*1024*1024`)

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/common/upload/avatar-upload.spec.ts
import { extFromMime, generateAvatarFilename, imageFileFilter, localAvatarDiskPath, AVATARS_DIR } from './avatar-upload';
import { join } from 'path';

describe('avatar-upload helpers', () => {
  describe('extFromMime', () => {
    it('mapea los tipos permitidos a extensión', () => {
      expect(extFromMime('image/png')).toBe('.png');
      expect(extFromMime('image/jpeg')).toBe('.jpg');
      expect(extFromMime('image/webp')).toBe('.webp');
    });
    it('devuelve null para tipos no permitidos', () => {
      expect(extFromMime('image/svg+xml')).toBeNull();
      expect(extFromMime('application/pdf')).toBeNull();
    });
  });

  describe('generateAvatarFilename', () => {
    it('genera un nombre con la extensión correcta y único', () => {
      const a = generateAvatarFilename('image/png');
      const b = generateAvatarFilename('image/png');
      expect(a.endsWith('.png')).toBe(true);
      expect(a).not.toBe(b);
    });
  });

  describe('imageFileFilter', () => {
    const call = (mimetype: string) => {
      let result: { err: any; accept?: boolean } = { err: undefined };
      imageFileFilter({} as any, { mimetype } as any, (err: any, accept?: boolean) => { result = { err, accept }; });
      return result;
    };
    it('acepta imágenes permitidas', () => {
      expect(call('image/png').accept).toBe(true);
      expect(call('image/jpeg').err).toBeNull();
    });
    it('rechaza tipos no permitidos con error', () => {
      const r = call('application/pdf');
      expect(r.accept).toBe(false);
      expect(r.err).toBeTruthy();
    });
  });

  describe('localAvatarDiskPath', () => {
    it('mapea una ruta /uploads/avatars a disco', () => {
      expect(localAvatarDiskPath('/uploads/avatars/abc.png')).toBe(join(AVATARS_DIR, 'abc.png'));
    });
    it('devuelve null para URLs externas o vacías', () => {
      expect(localAvatarDiskPath('https://x.com/a.png')).toBeNull();
      expect(localAvatarDiskPath(null)).toBeNull();
      expect(localAvatarDiskPath('/uploads/avatars/../../etc/passwd')).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest avatar-upload -v`
Expected: FAIL — `Cannot find module './avatar-upload'`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// backend/src/common/upload/avatar-upload.ts
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { basename, join } from 'path';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const AVATARS_DIR = join(UPLOADS_ROOT, 'avatars');

// Crea la carpeta al cargar el módulo (idempotente).
if (!existsSync(AVATARS_DIR)) mkdirSync(AVATARS_DIR, { recursive: true });

export const ALLOWED_AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function extFromMime(mime: string): string | null {
  return MIME_EXT[mime] ?? null;
}

export function generateAvatarFilename(mime: string): string {
  return `${randomUUID()}${extFromMime(mime) ?? ''}`;
}

export function imageFileFilter(
  _req: unknown,
  file: { mimetype: string },
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (ALLOWED_AVATAR_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Tipo de archivo no permitido (solo JPG, PNG, WEBP)'), false);
  }
}

// Mapea la ruta pública /uploads/avatars/<archivo> al path en disco.
// Devuelve null si no es un upload local o si el nombre intenta escapar del directorio.
export function localAvatarDiskPath(avatarUrl: string | null): string | null {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) return null;
  const name = avatarUrl.slice('/uploads/avatars/'.length);
  if (name !== basename(name)) return null; // evita traversal (../)
  return join(AVATARS_DIR, name);
}

export const multerAvatarOptions = {
  storage: diskStorage({
    destination: AVATARS_DIR,
    filename: (_req: unknown, file: { mimetype: string }, cb: (e: Error | null, name: string) => void) =>
      cb(null, generateAvatarFilename(file.mimetype)),
  }),
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest avatar-upload -v`
Expected: PASS (todos los casos).

- [ ] **Step 5: Commit**

```bash
git add backend/src/common/upload/avatar-upload.ts backend/src/common/upload/avatar-upload.spec.ts
git commit -m "feat(upload): multer avatar config + pure helpers (filter, filename, path)"
```

---

### Task 2: Endpoints de subida + serving estático + limpieza

**Files:**
- Modify: `backend/src/main.ts`
- Modify: `backend/src/users/users.controller.ts`
- Modify: `backend/src/classrooms/classrooms.controller.ts`
- Modify: `backend/src/classrooms/classrooms.service.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `multerAvatarOptions`, `localAvatarDiskPath`, `UPLOADS_ROOT` (Task 1); `UsersService.update`, `UsersService.findOne`; `ClassroomsService` (private `findOwnedClassroom`).
- Produces:
  - `POST /api/v1/users/profile/avatar` (multipart `file`) → `{ avatar: string }`
  - `POST /api/v1/classrooms/:slug/avatar` (multipart `file`) → `{ avatar: string }`
  - `ClassroomsService.setAvatar(slug: string, user: { id: string; role: string }, avatarUrl: string): Promise<{ avatar: string }>`
  - Estáticos servidos en `/uploads/...`

- [ ] **Step 1: Add `.gitignore` entry**

Append to `.gitignore` (repo root):
```
# Uploaded files (local disk storage)
backend/uploads/
```

- [ ] **Step 2: Serve static uploads in `main.ts`**

In `backend/src/main.ts`: type the app as `NestExpressApplication` and serve the uploads dir. Change the import and creation, and add `useStaticAssets` after `helmet`:

```typescript
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { UPLOADS_ROOT } from './common/upload/avatar-upload';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security headers
  app.use(helmet({ crossOriginResourcePolicy: false })); // permitir cargar /uploads desde el front

  // Servir archivos subidos en /uploads (fuera del prefijo /api)
  app.useStaticAssets(UPLOADS_ROOT, { prefix: '/uploads' });

  // ... resto igual (setGlobalPrefix, enableVersioning, cors, ValidationPipe, swagger)
```
(Keep all the existing lines that follow; only the import, the generic on `create`, the helmet line, and the `useStaticAssets` line are new. `crossOriginResourcePolicy: false` lets the Angular dev origin load the images.)

- [ ] **Step 3: Add the user avatar endpoint**

In `backend/src/users/users.controller.ts`: update the `@nestjs/common` import to add `Post, UseInterceptors, UploadedFile, BadRequestException`, and add these two import lines:
```typescript
import { FileInterceptor } from '@nestjs/platform-express';
import { multerAvatarOptions, localAvatarDiskPath } from '../common/upload/avatar-upload';
import { promises as fsp } from 'fs';
```
Add this method to the class (note the previous-file deletion runs AFTER updating to the new avatar; `localAvatarDiskPath` returns `null` for the freshly-set value only if it weren't a local path — here `current.avatar` is the OLD value, so a stale local file is safely removed and the new one is untouched):
```typescript
  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('file', multerAvatarOptions))
  async uploadAvatar(@CurrentUser() user: any, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const avatar = `/uploads/avatars/${file.filename}`;
    const current = await this.usersService.findOne(user.id);
    await this.usersService.update(user.id, { avatar });
    const prev = localAvatarDiskPath(current?.avatar ?? null);
    if (prev) fsp.unlink(prev).catch(() => undefined); // best-effort: ignora errores
    return { avatar };
  }
```

- [ ] **Step 4: Add `setAvatar` to `ClassroomsService`**

In `backend/src/classrooms/classrooms.service.ts`, add imports at top and the method. The method finds the classroom (owner check for teacher, any for director/admin), updates `avatar`, deletes the previous local file best-effort:

```typescript
// top imports:
import { ForbiddenException } from '@nestjs/common'; // si no está ya
import { localAvatarDiskPath } from '../common/upload/avatar-upload';
import { promises as fsp } from 'fs';

// method:
  async setAvatar(slug: string, user: { id: string; role: string }, avatarUrl: string): Promise<{ avatar: string }> {
    const where =
      user.role === 'director' || user.role === 'admin' ? { slug } : { slug, teacherId: user.id };
    const classroom = await this.prisma.classroom.findFirst({ where, select: { id: true, avatar: true } });
    if (!classroom) throw new ForbiddenException('No tienes acceso a esta aula');
    await this.prisma.classroom.update({ where: { id: classroom.id }, data: { avatar: avatarUrl } });
    const prev = localAvatarDiskPath(classroom.avatar ?? null);
    if (prev) fsp.unlink(prev).catch(() => undefined);
    return { avatar: avatarUrl };
  }
```

- [ ] **Step 5: Add the classroom avatar endpoint**

In `backend/src/classrooms/classrooms.controller.ts`: add imports and the endpoint.

```typescript
// add to '@nestjs/common' import: UseInterceptors, UploadedFile, BadRequestException
import { FileInterceptor } from '@nestjs/platform-express';
import { multerAvatarOptions } from '../common/upload/avatar-upload';

// add method (teachers: @Roles(Role.teacher); director/admin bypass RolesGuard):
  @Post(':slug/avatar')
  @Roles(Role.teacher)
  @UseInterceptors(FileInterceptor('file', multerAvatarOptions))
  uploadAvatar(
    @Param('slug') slug: string,
    @CurrentUser() user: { id: string; role: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return this.classroomsService.setAvatar(slug, user, `/uploads/avatars/${file.filename}`);
  }
```

- [ ] **Step 6: Build + run unit suite**

Run: `cd backend && npx nest build` (exit 0) and `cd backend && npx jest` (todas verdes, incl. avatar-upload).
Expected: build limpio; suite verde.

- [ ] **Step 7: Smoke test (servidor + curl con archivo real)**

Start `node dist/src/main.js`. Crea un PNG mínimo y prueba:
```bash
# PNG 1x1 mínimo:
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82' > /tmp/a.png
TOK=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"student1@legendaryclass.com","password":"password123"}' | python -c "import json,sys;print(json.load(sys.stdin).get('token',''))")
# subir avatar:
curl -s -X POST http://localhost:3000/api/v1/users/profile/avatar -H "Authorization: Bearer $TOK" -F "file=@/tmp/a.png" -w "\nHTTP:%{http_code}\n"
# la respuesta trae { "avatar": "/uploads/avatars/<x>.png" } → servir ese archivo:
curl -s -o /dev/null -w "static:%{http_code}\n" http://localhost:3000/uploads/avatars/<x>.png
# rechazo de no-imagen:
echo "not an image" > /tmp/a.txt
curl -s -o /dev/null -w "txt:%{http_code}\n" -X POST http://localhost:3000/api/v1/users/profile/avatar -H "Authorization: Bearer $TOK" -F "file=@/tmp/a.txt"
```
Expected: subida → 200 con `avatar` `/uploads/avatars/...`; el GET del estático → 200; el `.txt` → 400. Detener el servidor.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main.ts backend/src/users/users.controller.ts backend/src/classrooms/classrooms.controller.ts backend/src/classrooms/classrooms.service.ts .gitignore
git commit -m "feat(upload): avatar upload endpoints (user + classroom) + static serving"
```

---

### Task 3: Frontend — `AvatarUploadComponent` + montaje

**Files:**
- Create: `frontend/src/app/shared/avatar-upload/avatar-upload.component.ts`
- Modify: `frontend/src/app/features/student/profile/student-profile.component.ts`
- Modify: `frontend/src/app/features/student/profile/student-profile.component.html`
- Modify: `frontend/src/app/features/teacher/classrooms/classroom-detail.component.ts`

**Interfaces:**
- Consumes: endpoints de Task 2.
- Produces: `<app-avatar-upload [uploadPath]="'/users/profile/avatar'" [currentAvatar]="url" (uploaded)="onUploaded($event)" />`

- [ ] **Step 1: Create the component**

```typescript
// frontend/src/app/shared/avatar-upload/avatar-upload.component.ts
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-avatar-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="flex items-center gap-3">
    @if (previewUrl()) {
      <img [src]="previewUrl()" alt="avatar" class="w-16 h-16 rounded-full object-cover border-2 border-amber-300" />
    }
    <div>
      <label class="btn-epic btn-blue text-xs py-2 px-4 cursor-pointer inline-block">
        {{ uploading() ? 'Subiendo...' : '📷 Cambiar imagen' }}
        <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden"
          (change)="onSelect($event)" [disabled]="uploading()" />
      </label>
      @if (error()) { <p class="font-cinzel text-xs text-red-600 mt-1">{{ error() }}</p> }
    </div>
  </div>
  `,
})
export class AvatarUploadComponent {
  @Input({ required: true }) uploadPath!: string;
  @Input() set currentAvatar(url: string | null | undefined) { this.previewUrl.set(this.resolve(url)); }
  @Output() uploaded = new EventEmitter<string>();

  previewUrl = signal<string | null>(null);
  uploading = signal(false);
  error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  private origin(): string { return environment.apiUrl.replace(/\/api\/v1\/?$/, ''); }
  private resolve(url: string | null | undefined): string | null {
    if (!url) return null;
    return url.startsWith('/uploads/') ? `${this.origin()}${url}` : url;
  }

  onSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set(null);
    if (!ALLOWED.includes(file.type)) { this.error.set('Solo JPG, PNG o WEBP'); return; }
    if (file.size > MAX_BYTES) { this.error.set('Máximo 2 MB'); return; }

    const form = new FormData();
    form.append('file', file);
    this.uploading.set(true);
    this.http.post<{ avatar: string }>(`${environment.apiUrl}${this.uploadPath}`, form).subscribe({
      next: (res) => {
        this.previewUrl.set(this.resolve(res.avatar));
        this.uploaded.emit(res.avatar);
        this.uploading.set(false);
        input.value = '';
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Error al subir la imagen');
        this.uploading.set(false);
      },
    });
  }
}
```

- [ ] **Step 2: Mount in the student profile**

In `frontend/src/app/features/student/profile/student-profile.component.ts`: add to imports array `AvatarUploadComponent` and the import line `import { AvatarUploadComponent } from '../../../shared/avatar-upload/avatar-upload.component';`. Add a handler:
```typescript
  onAvatarUploaded(avatar: string) {
    this.profile.update((p: any) => (p ? { ...p, avatar } : p));
  }
```
In `frontend/src/app/features/student/profile/student-profile.component.html`, inside the `@if (profile())` block (near the change-password card), add:
```html
<div class="adventure-card p-6 mt-8 max-w-xl mx-auto animate-fade-in-up">
  <h3 class="font-cinzel font-bold text-gray-800 text-lg mb-4">🖼️ Foto de perfil</h3>
  <app-avatar-upload uploadPath="/users/profile/avatar" [currentAvatar]="profile().avatar"
    (uploaded)="onAvatarUploaded($event)" />
</div>
```

- [ ] **Step 3: Mount in the teacher classroom detail**

In `frontend/src/app/features/teacher/classrooms/classroom-detail.component.ts`: add `AvatarUploadComponent` to `imports` and the import line `import { AvatarUploadComponent } from '../../../shared/avatar-upload/avatar-upload.component';`. Add a handler:
```typescript
  onClassroomAvatarUploaded(avatar: string) {
    const c = this.classroom();
    if (c) this.classroom.set({ ...c, avatar });
  }
```
Inside the `@else if (classroom())` block (e.g. in the header area below the class code), add:
```html
<div class="mt-3">
  <app-avatar-upload [uploadPath]="'/classrooms/' + classroom().slug + '/avatar'"
    [currentAvatar]="classroom().avatar" (uploaded)="onClassroomAvatarUploaded($event)" />
</div>
```

- [ ] **Step 4: Build + lint**

Run: `cd frontend && npx ng build` (exit 0) and `cd frontend && npx ng lint` (0 errores; warnings preexistentes permitidos).

- [ ] **Step 5: Manual end-to-end verification**

Run backend + frontend. As `student1@legendaryclass.com`, open `/student/profile`, use "📷 Cambiar imagen" to pick a PNG/JPG → la imagen aparece y persiste al recargar. As `teacher@legendaryclass.com`, open a classroom detail, sube una imagen del aula → aparece.
Expected: ambas subidas funcionan, la imagen se sirve desde `/uploads/...` y persiste tras recargar.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/shared/avatar-upload/ frontend/src/app/features/student/profile/ frontend/src/app/features/teacher/classrooms/classroom-detail.component.ts
git commit -m "feat(upload): AvatarUploadComponent + mount in profile and classroom detail"
```

---

## Notas de verificación final

- Backend: `npx nest build` (0), `npx jest` (avatar-upload + suite previa verdes), endpoints `200`/`400`/`403` y estático servible.
- Frontend: `ng build` (0), `ng lint` (0 errores), ambas subidas funcionan en el smoke E2E.
- Sin dependencias nuevas (`multer`/`@types/multer` ya estaban).
