# Despliegue gratuito — Neon + Render + Vercel

Arquitectura: **Neon** (PostgreSQL) + **Render** (API NestJS con WebSockets) + **Vercel** (Angular estático).
Todo en tier gratuito. Tiempo estimado: 30–45 min.

> Prerrequisito: haber hecho `git push` de la rama `main` a GitHub — Render y Vercel
> despliegan desde el repo.

---

## 1. Neon — base de datos (~10 min)

1. Crear cuenta en <https://neon.tech> (con GitHub es un click).
2. **New Project** → nombre `legendaryclass`, región AWS más cercana (us-east-2 va bien).
3. En el dashboard del proyecto, abrir **Connection string** y copiar **las dos** variantes:
   - **Pooled connection** (el host contiene `-pooler`) → será `DATABASE_URL`
   - **Direct connection** (host sin `-pooler`) → será `DIRECT_URL`
4. Poblar la base de datos **desde tu máquina** (una sola vez):

   ```bash
   cd backend
   # PowerShell:
   $env:DATABASE_URL = "<pooled>"
   $env:DIRECT_URL   = "<directa>"
   npx prisma migrate deploy
   npx ts-node prisma/seed.ts          # cuentas demo básicas
   npx ts-node prisma/seed-rich.ts     # (opcional) datos ricos de demo
   ```

   > Al cerrar la terminal, las variables vuelven a las del `.env` local. No edites
   > el `.env` para esto.

## 2. Render — backend (~10 min)

1. Crear cuenta en <https://render.com> (con GitHub).
2. **New → Blueprint** → seleccionar el repo `LegendaryClass` → Render lee `render.yaml`
   y propone el servicio `legendaryclass-api`.
3. Completar las env vars que piden valor:
   - `DATABASE_URL` = URL **pooled** de Neon
   - `DIRECT_URL` = URL **directa** de Neon
   - `FRONTEND_URL` = déjala vacía por ahora; se completa en el paso 3.4
   - `JWT_SECRET` se genera solo.
4. Deploy. Al terminar, verificar: `https://legendaryclass-api.onrender.com/api/docs`
   debe mostrar Swagger.

   > ⚠️ Si el nombre `legendaryclass-api` está tomado, Render asigna otro subdominio.
   > En ese caso actualizar `apiUrl` en `frontend/src/environments/environment.prod.ts`,
   > commit + push, antes del paso 3.

## 3. Vercel — frontend (~10 min)

1. Crear cuenta en <https://vercel.com> (con GitHub).
2. **Add New → Project** → importar el repo → **Root Directory: `frontend`**
   (Vercel lee `frontend/vercel.json` para el build y el rewrite SPA).
3. Deploy. Anotar la URL final, p. ej. `https://legendaryclass.vercel.app`.
4. Volver a Render → env vars del servicio → `FRONTEND_URL` = la URL de Vercel
   (sin barra final) → guardar (Render redeploya solo). Esto habilita CORS y el
   WebSocket del ranking.

## 4. Verificación final

- Abrir la URL de Vercel → login `student1@legendaryclass.com` / `password123`.
- Dashboard con buzón de XP, misiones y ranking en vivo (WebSocket) funcionando.
- Si la API tarda ~40 s en responder la primera vez: es el cold start del tier
  gratuito de Render (ver abajo).

## Limitaciones del tier gratuito (y mitigaciones)

| Limitación | Impacto | Mitigación |
|---|---|---|
| Render duerme tras ~15 min sin tráfico | Primer request tarda 30–60 s | Monitor gratuito en <https://uptimerobot.com> pingueando `/api/docs` cada 5 min, o abrir el link 2 min antes de mostrar |
| Disco de Render es efímero | Las evidencias subidas (`/uploads`) se pierden en cada redeploy | Aceptable para demo; a futuro migrar a Supabase Storage / Cloudinary |
| Neon suspende la BD sin uso | Primera query tarda ~1 s extra | Despierta sola; nada que hacer |

## Resumen de piezas ya configuradas en el repo

- `backend/prisma/schema.prisma` → `directUrl` para migraciones vía conexión directa.
- `render.yaml` → blueprint del servicio (build, start con `migrate deploy`, env vars).
- `frontend/vercel.json` → build de producción + rewrite SPA.
- `frontend/src/environments/environment.prod.ts` → `apiUrl` absoluta del backend
  (HTTP, WebSocket y links de `/uploads` derivan de ella).
