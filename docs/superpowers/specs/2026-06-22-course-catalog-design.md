# Course Catalog & Activity Bank — Diseño

- **Fecha:** 2026-06-22
- **Estado:** Aprobado
- **Alcance:** Catálogo de cursos, banco de plantillas de actividades por tipo, importación copy/reference a salones, flujo de aprobación director→profesor.

---

## Objetivo

Agregar un catálogo de cursos predefinidos (Aritmética, Álgebra, Geometría, Razonamiento Matemático, Trigonometría, Química, Física…) gestionado por el director. Cada salón se vincula a un curso al crearse. Cada curso tiene un banco de plantillas de actividades (Tarea, Ejercicio, Formulario, Examen) que los profesores proponen y el director aprueba. Los profesores importan plantillas a sus salones eligiendo modo copia o referencia.

---

## Modelo de datos

### `Course` — catálogo global

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `name` | String | ej. "Álgebra" |
| `description` | String? | |
| `icon` | String? | emoji o URL |
| `color` | String? | hex para UI |
| `category` | enum `CourseCategory` | mathematics \| sciences \| language \| social \| arts \| other |
| `isActive` | Boolean | default true |
| `createdAt` / `updatedAt` | DateTime | |

CRUD exclusivo de director/admin. Sin FK a otras entidades — es el catálogo global.

---

### 4 tablas de plantillas del banco

**Campos comunes** en las cuatro tablas:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `courseId` | FK Course | |
| `title` | String | |
| `description` | String? | |
| `xpReward` | Int | default 50 |
| `difficulty` | enum `Difficulty` | easy \| medium \| hard |
| `status` | enum `TemplateStatus` | draft \| pending \| approved \| rejected |
| `rejectionNote` | String? | nota del director al rechazar |
| `authorId` | FK User | quien la creó |
| `approvedById` | FK User? | quien la aprobó |
| `approvedAt` | DateTime? | |
| `createdAt` / `updatedAt` | DateTime | |

**Campos específicos por tabla:**

#### `HomeworkTemplate`
- `instructions` String — enunciado detallado
- `defaultDueDays` Int (default 7) — días sugeridos desde asignación
- `attachmentUrl` String? — recurso adjunto opcional

#### `ExerciseTemplate`
- `problems` Json — array de `{ question: string, hint?: string, answer?: string }`

#### `FormTemplate`
- `questions` Json — array de `{ text: string, type: "text" | "choice", options?: string[], required: boolean }`

#### `ExamTemplate`
- `questions` Json — array de `{ text: string, type: "text" | "choice", options?: string[], points: number }`
- `durationMinutes` Int
- `passingScore` Int — porcentaje 0–100
- `totalPoints` Int

---

### `ClassroomActivity` — instancias en salón

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `classroomId` | FK Classroom | |
| `activityType` | enum `ActivityType` | homework \| exercise \| form \| exam |
| `templateId` | String? | FK al template original (null si creada directamente en salón) |
| `mode` | enum `ActivityMode` | reference \| copy |
| `overrides` | Json | customizaciones (reference) o snapshot completo (copy) |
| `dueDate` | DateTime? | |
| `assignedAt` | DateTime | default now() |
| `isActive` | Boolean | default true |
| `createdAt` / `updatedAt` | DateTime | |

**Semántica de `overrides`:**
- `mode = reference` → solo los campos que el profesor sobreescribió (`title?`, `description?`, `dueDate?`). El resto se lee del template en vivo.
- `mode = copy` → snapshot completo del template al momento de importar. El template puede cambiar sin afectar al salón.
- `templateId = null` → actividad creada directamente en el salón (siempre `mode = copy`).

**Regla:** El modo no puede cambiarse después de crear la instancia. Para cambiar, se elimina y se reimporta.

---

### Cambio en `Classroom`

Añadir `courseId String?` FK a `Course`. Nullable en migración (para salones existentes). Requerido en el DTO de creación desde esta versión. Los salones sin curso son válidos pero no acceden al banco de plantillas.

El campo `subject: String?` existente se mantiene en el schema (nullable, sin migración destructiva) pero se retira del formulario de creación — `courseId` lo reemplaza semánticamente. El helper `generateUniqueSlug` deja de incluirlo en la construcción del slug.

---

### Nota sobre FK polimórfica en `ClassroomActivity`

`templateId` apunta a una de 4 tablas distintas según `activityType`. Prisma no soporta FK polimórficas nativas, por lo que `templateId` se declara como `String?` sin `@relation` formal. La capa de servicio resuelve el join correcto consultando la tabla correspondiente según `activityType`. El campo `activityType` es siempre obligatorio cuando `templateId != null`.

---

## Enums nuevos

```prisma
enum CourseCategory {
  mathematics
  sciences
  language
  social
  arts
  other
}

enum Difficulty {
  easy
  medium
  hard
}

enum TemplateStatus {
  draft
  pending
  approved
  rejected
}

enum ActivityType {
  homework
  exercise
  form
  exam
}

enum ActivityMode {
  reference
  copy
}
```

---

## Flujo de aprobación de plantillas

```
draft ──► pending ──► approved
              │
              └──► rejected ──► pending (profesor reenvía)
```

| Acción | Actor |
|---|---|
| Crear plantilla (draft → pending) | Profesor o director |
| Aprobar (pending → approved) | Director/admin |
| Rechazar con nota (pending → rejected) | Director/admin |
| Editar un `draft` o `rejected` propio y reenviar | Autor (profesor) |
| Editar cualquier plantilla | Director/admin |
| Crear y auto-aprobar (salta el flujo) | Director/admin |
| Eliminar del banco | Director/admin |

**Visibilidad:**
- Profesores ven solo `approved` de cursos donde tienen salones activos.
- Director ve todos los estados de todos los cursos.
- Una plantilla `rejected` solo la ven su autor y el director.

**Notificación:** Al aprobar o rechazar, se emite una notificación in-app al autor. Requiere añadir `template_review` al enum `NotificationType` del schema.

---

## Mecánica de importación al salón

El profesor abre el banco del curso de su salón y hace clic en **Importar**. Un modal le pide:
1. **Modo:** `reference` (recibe actualizaciones del banco) o `copy` (snapshot independiente)
2. **Fecha límite** (`dueDate`) — opcional
3. Confirmación

Se crea un `ClassroomActivity` con los parámetros elegidos.

El profesor también puede crear actividades directamente en el salón (sin banco): `templateId = null`, `mode = copy`, todo el contenido en `overrides`.

---

## API Endpoints

### Cursos

| Método | Ruta | Roles | Acción |
|---|---|---|---|
| GET | `/courses` | todos autenticados | Listado de cursos activos |
| POST | `/courses` | director/admin | Crear curso |
| PATCH | `/courses/:id` | director/admin | Editar curso |
| DELETE | `/courses/:id` | director/admin | Desactivar curso |

### Banco de plantillas

| Método | Ruta | Roles | Acción |
|---|---|---|---|
| GET | `/courses/:courseId/templates` | teacher/director | Banco del curso (approved para teacher, todo para director) |
| POST | `/courses/:courseId/templates` | teacher/director | Crear plantilla |
| PATCH | `/templates/:id` | autor o director | Editar plantilla |
| PATCH | `/templates/:id/review` | director | Aprobar o rechazar |
| DELETE | `/templates/:id` | director | Eliminar del banco |

### Actividades en salón

| Método | Ruta | Roles | Acción |
|---|---|---|---|
| GET | `/classrooms/:slug/activities` | teacher (dueño) / student (inscrito) | Lista de actividades |
| POST | `/classrooms/:slug/activities` | teacher (dueño) | Importar o crear actividad |
| PATCH | `/classrooms/:slug/activities/:id` | teacher (dueño) | Editar instancia |
| DELETE | `/classrooms/:slug/activities/:id` | teacher (dueño) | Eliminar del salón |

---

## Módulos backend nuevos / modificados

| Módulo | Acción | Descripción |
|---|---|---|
| `courses` | Nuevo | `CoursesController` + `CoursesService` + `CoursesModule` |
| `templates` | Nuevo | `TemplatesController` + `TemplatesService` + `TemplatesModule` (gestiona las 4 tablas) |
| `classrooms` | Modificado | Añadir endpoints de actividades; inyectar `TemplatesService` |
| `notifications` | Modificado | Añadir `template_review` al enum `NotificationType` |
| `prisma/schema.prisma` | Modificado | 7 modelos nuevos + 6 enums nuevos + FK en `Classroom` |

---

## Cambios frontend

### Selector de curso en creación de salón
- Dropdown **"Curso"** (requerido) en el form de creación del profesor
- Carga `GET /courses` al abrir
- El campo `subject` libre se elimina del form (el curso lo reemplaza)

### Director — Gestión de cursos `/director/courses`
- Tabla: nombre, categoría, # plantillas, estado
- Crear / editar / desactivar curso
- Link al banco de plantillas por curso

### Director — Bandeja de revisión `/director/courses/:courseId/templates`
- Tabs: Pendientes / Aprobadas / Rechazadas
- Card por plantilla con preview, botones Aprobar / Rechazar + nota
- Badge de conteo de pendientes en el nav lateral

### Profesor — Banco de plantillas `/teacher/courses/:courseId/templates`
- Solo plantillas `approved` del curso
- Botón **Importar al salón** → modal: salón destino + modo + dueDate
- Botón **Proponer plantilla** → form dinámico según tipo

### Detalle del salón — pestaña Actividades
- **Profesor:** lista de `ClassroomActivity`, acciones crear/importar/editar/eliminar
- **Estudiante:** actividades activas con estado (pendiente / entregada / calificada)

---

## Fuera de alcance (YAGNI)

- Entrega de actividades por el alumno (respuestas, archivos) — fase posterior
- Calificación/corrección automática
- Ordenamiento curricular (unidades, secuencias)
- Duplicar un curso completo con todas sus plantillas
- Exportar banco a Excel
- Notificaciones push / email por revisión
