# Exportar Reportes a Excel — Diseño

- **Fecha:** 2026-06-19
- **Estado:** Aprobado (pendiente de plan de implementación)
- **Alcance:** Feature #2 de 4 (previa: Ranking en vivo ✅; siguientes: Subir avatar, Notificaciones in-app)

## Objetivo

Permitir descargar reportes en formato Excel (`.xlsx`): el profesor exporta su aula
y el director exporta un libro institucional. La librería `xlsx` ya está instalada en
el backend (hoy sin usar).

## Dónde se genera

El **backend** genera el `.xlsx` con `xlsx` y lo envía como descarga
(`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` +
`Content-Disposition: attachment; filename="..."`). Nuevo **`ExportModule`** con:
- `export.service.ts` — arma los workbooks a partir de consultas Prisma; contiene
  funciones puras de mapeo de datos → filas (testeables sin BD ni `xlsx`).
- `export.controller.ts` — los endpoints HTTP, protegidos con guards.

## Endpoints

### Profesor — `GET /export/classroom/:classroomId`
Un libro `.xlsx` del aula seleccionada con **2 hojas**:
- **Ranking**: columnas `Estudiante`, `Personaje`, `Nivel`, `XP`, `Puntos de aula`.
  Ordenado por puntos de aula descendente (misma fuente que el reporte actual:
  `StudentPoint.totalPoints`).
- **Comportamientos**: columnas `Estudiante`, `Puntos por comportamiento (total)`,
  `Nº de registros` — a partir del `behaviorStats` (`groupBy studentId`,
  `_sum.pointsAwarded`, `_count.id`).

Acceso: solo el profesor dueño del aula (`Classroom.teacherId`) o `director`/`admin`.
Nombre de archivo: `aula-<slug>.xlsx`.

### Director — `GET /export/institution`
Un solo libro `.xlsx` con **4 hojas**:
- **Estudiantes**: `Nombre`, `Email`, `Nivel`, `XP`, `Puntos`, `Personaje`, `Activo`.
- **Profesores**: `Nombre`, `Email`, `Nº de aulas`, `Activo`.
- **Aulas**: `Nombre`, `Materia`, `Docente`, `Código`, `Nº de estudiantes`, `Activa`.
- **Resumen**: las estadísticas del dashboard (totales de profesores, estudiantes,
  padres, aulas, comportamientos asignados, canjes, y los conteos mensuales) como
  pares clave/valor.

Trae **todos** los registros (ignora la paginación de los endpoints normales).
Acceso: `director`/`admin`. Nombre de archivo: `institucion.xlsx`.

## Componentes del backend

- **Funciones puras de mapeo** (en `export.service.ts`), una por hoja, p. ej.:
  - `buildClassroomRankingRows(students, studentPoints)` → `RankingRow[]`
  - `buildClassroomBehaviorRows(students, behaviorStats)` → `BehaviorRow[]`
  - `buildStudentRows(users)` / `buildTeacherRows(users)` / `buildClassroomRows(classrooms)`
  - `buildSummaryRows(stats)` → `{ Métrica, Valor }[]`
  Cada una transforma datos del dominio en arreglos de objetos planos (las claves son
  los encabezados de columna). No tocan `xlsx` ni Prisma → testeables en aislamiento.
- **Armado del workbook**: métodos que llaman a Prisma para obtener los datos, invocan
  las funciones de mapeo y usan `xlsx` (`XLSX.utils.json_to_sheet`,
  `XLSX.utils.book_append_sheet`, `XLSX.write(..., { type: 'buffer', bookType: 'xlsx' })`)
  para devolver un `Buffer`.
- **Control de acceso**: el endpoint del aula reutiliza la verificación de propiedad ya
  existente (profesor dueño) o permite director/admin; el institucional exige
  `director`/`admin` vía `RolesGuard`.

## Componentes del frontend (Angular)

- **`ExportService`** (`core/`): descarga con `HttpClient` usando
  `responseType: 'blob'` (el `auth.interceptor` ya adjunta el JWT), luego crea un
  `URL.createObjectURL(blob)`, dispara un `<a download>` programático y revoca el URL.
  Método genérico `downloadFile(url, filename)`.
- **Botones "📊 Exportar a Excel"**:
  - Profesor: en el detalle de aula (`/teacher/classrooms/:slug`), llamando a
    `/export/classroom/:id` con el id del aula cargada.
  - Director: en el dashboard o la vista de reportes (`/director/...`), llamando a
    `/export/institution`.

## Pruebas

- **Unit** (sin BD ni `xlsx`): las funciones puras de mapeo — orden, columnas/encabezados,
  totales (ranking ordenado por puntos; behavior stats agregados; resumen clave/valor).
- **Smoke de integración**: cada endpoint responde `200`, con el `Content-Type` de Excel
  y un cuerpo (`Buffer`) no vacío, para un usuario autorizado; y `403` para uno no
  autorizado (profesor ajeno / no-director).

## Fuera de alcance (YAGNI)

- Exportación a PDF.
- Envío programado por correo / adjuntos.
- Plantillas con estilos, branding, colores, logos o gráficos embebidos.
- Filtros por rango de fechas u otros parámetros de consulta.
- Exportación de un "todas mis aulas" combinado para el profesor (solo el aula
  seleccionada).

## Riesgos / consideraciones

- La descarga autenticada NO puede usar un `<a href>` simple (no envía el header
  `Authorization`); por eso el frontend descarga el blob vía `HttpClient` y dispara la
  descarga en cliente.
- Los listados del director ya están paginados (`{ data, meta }`) para la UI; la
  exportación debe consultar el dataset completo, no reutilizar la ruta paginada.
- `xlsx` ya está en `package.json` del backend; no se añaden dependencias nuevas.
