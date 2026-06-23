# Wolf AI (Frontend + API)

Proyecto React + TypeScript + Vite con API Express para demos coach/athlete.

## Local Development

- Frontend:
  - `npm run dev`
- API backend:
  - `npm run server`
- Health check API:
  - `GET http://localhost:4000/health`

## API Endpoints (Demo)

- `POST /auth/login` (email + password demo)
- `GET /users`
- `GET /athletes`
- `GET /exercises` (JWT — catálogo sistema + personalizados del coach del atleta)
- `POST /exercises` (coach / super_admin — crear ejercicio con ancla y ratio)
- `PATCH /exercises/:id` (solo ejercicios propios; los del sistema son de solo lectura)
- `DELETE /exercises/:id` (solo ejercicios propios)
- `GET /sessions`
- `POST /sessions/generate`
- `POST /sessions/evaluate`
- `POST /sessions/adapt`
- `POST /simulate/microcycle`
- `GET /assignments`
- `GET /assignments/athlete/:athleteProfileId`
- `POST /assignments`
- `PATCH /assignments/:id/program`
- `DELETE /assignments/:id`

## Backend deploy (Railway + Postgres)

### Railway (API)

1. **New Project** → Deploy from GitHub → repo `wolf-ai` (web service, root `/`).
2. **Variables** (required before the service will pass healthcheck):
   - `JWT_SECRET` — run locally `npm run generate-jwt-secret` and paste the output (32+ chars). **Without this the API crash-loops on startup.**
   - `DATABASE_URL` — Railway Postgres or Neon connection string (use the **public** URL for local scripts, not `railway.internal`)
   - `FRONTEND_ORIGIN` — e.g. `https://tu-app.netlify.app` (exact URL, no trailing `/`)
   - `JWT_EXPIRES_IN` — `7d` (optional; not bare `604800` — use `7d` or `604800s`)
   - `WOLF_SYNC_SEED_PASSWORDS` — `0`
   - `WOLF_ALLOW_PUBLIC_REGISTER` — `0`
3. **Networking** → Generate domain → copy `https://….up.railway.app`.
4. **Netlify** (front): `VITE_API_URL=/api`, `NETLIFY_API_PROXY_TARGET=https://….up.railway.app`, then **redeploy** the front.
5. Test: `curl https://….up.railway.app/health` → `"ok":true`, `"persistence":"postgres"`.

Repo includes `railway.toml` (start command + `/health` check). Secrets are **never** committed; set `JWT_SECRET` only in the Railway dashboard.

### Persistencia y demo multi-dispositivo

- Si `DATABASE_URL` no está configurado, la API cae en modo memoria (`"persistence":"memory"`).
- Con `DATABASE_URL`, `/users`, `/assignments*` y el catálogo **Exercise OS** (`exercise_definitions`, taxonomía, relaciones) quedan en Postgres.
- Al arrancar el API se ejecutan migraciones `CREATE TABLE IF NOT EXISTS` + **upsert** del catálogo oficial desde `exercises.json` (37) + catálogo búlgaro [exercises-bulgarian-catalog.json](src/data/exercises-bulgarian-catalog.json) (~100 movimientos).
- Guía coach semana 1 y persistencia: [docs/COACH_PERSISTENCE.md](docs/COACH_PERSISTENCE.md).
- En la app: menú coach **Ejercicios** — registro composable; los ejercicios creados por coach se guardan con `coach_id` y no se pisan al redeploy.
- Para demo en tiempo real, todos deben usar el mismo backend URL (Railway).

### Exercise OS — base de datos (producción y pruebas)

**Tablas principales** (creadas en `initExerciseCatalogTables` al iniciar API o con el script manual):

| Tabla | Contenido |
|-------|-----------|
| `exercise_families`, `exercise_variations`, `start_positions`, … | Taxonomía desde `taxonomy.json` |
| `exercise_definitions` | Catálogo oficial (`coach_id` NULL) + ejercicios del coach |
| `exercise_relationship_rules` | Reglas de carga (snatch → pull, etc.) |
| `coach_exercise_overrides` | Overrides por coach |
| `technical_collections` | Colecciones técnicas demo |

**Antes del primer deploy o tras cambiar `exercises.json`**, ejecuta contra la misma `DATABASE_URL` de Railway/Neon:

```bash
# En local (copia DATABASE_URL de Neon en .env o export)
npm run db:setup
```

Equivale a:

```bash
DATABASE_URL="postgresql://..." npx tsx scripts/db-setup-production.ts
```

**Verificar en producción:**

```bash
curl https://TU-API.up.railway.app/health
```

Respuesta esperada con Postgres:

```json
{
  "ok": true,
  "persistence": "postgres",
  "exerciseCatalog": {
    "officialDefinitions": 37,
    "coachDefinitions": 0,
    "relationshipRules": 12,
    "technicalCollections": 5
  }
}
```

**Probar ejercicios reales en la UI:**

1. Login coach (`coach@wolf.ai` / contraseña demo).
2. Menú **Ejercicios** → Explorer debe listar Snatch, Clean, Squat, etc.
3. **Componer** un movimiento propio → queda en DB con `coach_id`; aparece en autocomplete del editor de sesión.
4. `GET /exercise-definitions` (Bearer JWT) debe devolver oficial + propios del coach.

**Notas:**

- El seed oficial usa `ON CONFLICT DO UPDATE` solo si `coach_id IS NULL` (no sobrescribe forks del coach).
- Si `officialDefinitions` es 0 en `/health`, ejecuta `npm run db:setup` contra esa base y reinicia el API.

### Los cambios no se ven en producción (Netlify)

1. **Comprueba el deploy:** Netlify → *Deploys* → el último debe ser el commit de `main` (p. ej. `40% - 120% added to exercises`). Si falló el build, abre el log.
2. **Fuerza un deploy:** *Deploys* → **Trigger deploy** → **Deploy site** (o push vacío a `main`).
3. **Caché del navegador:** recarga forzada `Ctrl+Shift+R` (Mac: `Cmd+Shift+R`) o ventana privada.
4. **Verifica el bundle:** en producción, F12 → *Network* → recarga → el JS debe ser `index-*.js` distinto al anterior tras cada deploy relevante.
5. **Backend (Railway):** tras cambios en `src/api/*`, Railway redeploy automático desde `main` o **Redeploy** manual. Prueba `GET https://TU-API.up.railway.app/health`.

Variables Netlify necesarias para login/API: `VITE_API_URL=/api` y `NETLIFY_API_PROXY_TARGET=https://TU-API.up.railway.app` (sin `/` final).

### Local funciona pero el deploy no (login)

1. **Netlify (recomendado):** en *Site settings → Environment variables*:
   - `NETLIFY_API_PROXY_TARGET` = `https://TU-API.up.railway.app` (sin `/` final)
   - `VITE_API_URL` = `/api`
   El build de Netlify ejecuta `prep-netlify-proxy.mjs` y genera `public/_redirects` para enrutar `/api/*` al backend Railway.
2. **Alternativa:** `VITE_API_URL` = `https://TU-API.up.railway.app` (URL completa) y redeploy del front.
3. **Railway (API):** `FRONTEND_ORIGIN` = URL exacta del front Netlify. Opcional: `FRONTEND_ORIGINS` (varias URLs separadas por comas).
4. `GET https://TU-API.up.railway.app/health` → revisa `corsOrigins` y `persistence`.
