# Subir Avatar/Foto — Diseño

- **Fecha:** 2026-06-19
- **Estado:** Aprobado (pendiente de plan de implementación)
- **Alcance:** Feature #3 de 4 (previas: Ranking en vivo ✅, Exportar a Excel ✅; siguiente: Notificaciones in-app)

## Objetivo

Permitir subir una imagen real (no solo pegar una URL) como avatar: cualquier usuario
autenticado sube su foto de perfil y el profesor dueño sube la imagen de su aula. Los
campos `User.avatar` y `Classroom.avatar` (ya existentes, `String?`) almacenan la ruta
del archivo subido. `multer` ya está instalado en el backend.

## Almacenamiento y serving

- Los archivos se guardan en **`backend/uploads/avatars/`** (carpeta nueva, añadida a
  `.gitignore`; se crea en el arranque si no existe).
- Se sirven como estáticos vía `app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), { prefix: '/uploads' })`
  en `main.ts` (NestJS con `platform-express`) → accesibles en
  `http://<host>:3000/uploads/avatars/<archivo>`, **fuera** del prefijo `/api`.
- El campo `avatar` guarda la **ruta relativa** `/uploads/avatars/<archivo>`. El frontend
  antepone el origen del API (derivado de `environment.apiUrl` quitando `/api/v1`).
- Nombre de archivo **único** generado en el servidor: `<random>.<ext>` (random = cuid o
  uuid; ext derivada del mimetype permitido). No se confía en el nombre del cliente.

## Validación (multer)

- Tipos permitidos (raster): `image/jpeg`, `image/png`, `image/webp`. **SVG excluido**
  (riesgo XSS al servirse del mismo origen).
- Tamaño máximo: **2 MB** (`limits: { fileSize: 2 * 1024 * 1024 }`).
- `fileFilter` rechaza tipos no permitidos → la petición falla con 400.

## Endpoints (multipart/form-data, `FileInterceptor('file')`)

- **`POST /users/profile/avatar`** — el usuario autenticado (`@CurrentUser`) sube su
  propia foto. Guarda el archivo, actualiza `User.avatar` con la ruta, borra
  best-effort el avatar local anterior, devuelve `{ avatar: '/uploads/avatars/...' }`.
- **`POST /classrooms/:slug/avatar`** — el profesor **dueño** del aula (verificación de
  propiedad existente en `ClassroomsService`) o `director`/`admin`. Guarda, actualiza
  `Classroom.avatar`, borra best-effort el anterior, devuelve `{ avatar: '...' }`.
- Ambos: `@UseInterceptors(FileInterceptor('file', { storage, fileFilter, limits }))`.
  Si no llega archivo o es inválido → 400.

## Limpieza de archivos

Al reemplazar un avatar, si el valor anterior era un upload local
(`/uploads/avatars/...`), se elimina ese archivo del disco best-effort (errores de
borrado se ignoran/loguean, no rompen la respuesta). Avatares que no empiezan por
`/uploads/` (URLs externas previas) no se tocan.

## Componentes del backend

- **`upload.config.ts`** (en `src/common/` o `src/uploads/`): exporta la config
  reutilizable de multer — `multerAvatarOptions` con `diskStorage` (destino
  `uploads/avatars`, filename único), `imageFileFilter` (función pura, testeable) y
  `limits`. También un helper `localAvatarDiskPath(avatarUrl)` para mapear la ruta
  pública `/uploads/avatars/x` al path en disco (para el borrado).
- Modificaciones: `users.controller.ts` (+ método upload, usa `UsersService.update`
  existente para setear `avatar`), `classrooms.controller.ts`/`classrooms.service.ts`
  (+ método upload con verificación de propiedad), `main.ts` (`useStaticAssets`).

## Componentes del frontend (Angular)

- **`AvatarUploadComponent`** (standalone, reutilizable): input `type="file"`, valida
  tipo y tamaño en cliente (feedback inmediato), sube vía `HttpClient` con `FormData`
  (`file`), recibe `{ avatar }` y emite/aplica la nueva ruta; muestra la imagen.
- **Helper de URL** (en un `UploadService` o el propio componente): convierte
  `/uploads/...` a URL absoluta usando el origen del API.
- Ubicación: foto de perfil en `/student/profile`; imagen del aula en el detalle de aula
  del profesor (`/teacher/classrooms/:slug`).

## Pruebas

- **Unit** (sin disco): `imageFileFilter` (acepta jpeg/png/webp, rechaza p. ej.
  `application/pdf` y `image/svg+xml`); el generador de nombre único (extensión correcta
  por mimetype, dos llamadas → nombres distintos).
- **Smoke de integración**: subir un PNG pequeño a `/users/profile/avatar` → 200 +
  `avatar` con prefijo `/uploads/avatars/` + el archivo es servible (`GET /uploads/...`
  → 200); subir un no-imagen → 400; subir a `/classrooms/:slug/avatar` de un aula ajena
  → 403.

## Fuera de alcance (YAGNI)

- Recorte/redimensión (cliente o servidor), generación de miniaturas.
- CDN o almacenamiento en la nube.
- Galería de avatares predefinidos / selección sin subir.
- Drag-and-drop, subida múltiple, progreso de subida.

## Riesgos / consideraciones

- El disco local es **efímero** en muchos despliegues (se pierde al reiniciar el
  contenedor). Aceptable para el entorno local/docker actual; migrar a nube si va a
  producción.
- Servir archivos subidos desde el mismo origen: se mitiga restringiendo a imágenes
  raster (sin SVG) y generando el nombre en el servidor.
- `multer` ya está en `backend/package.json`; `@types/multer` también. No se añaden
  dependencias nuevas de runtime.
