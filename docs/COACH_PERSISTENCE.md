# Coach workflow: week 1, persistence, catalog

## Primera prueba end-to-end (coach-wl → erik)

### A) Local rápido (memoria, sin Postgres)

| Variable | Valor |
|----------|--------|
| `.env.development` | `VITE_API_URL=/api` |
| API | `npm run server` → `http://localhost:4000` |
| Front | `npm run dev` → `http://localhost:5173` |

**Login**

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Coach | `coach-wl` | `CoachWL2026!` |
| Atleta | `erik` | `ErikWL2026!` |
| Admin (cuentas) | `admin@wolf-ai.app` | `WolfAdmin_9jH3nM8vPq` |

**Flujo**

1. Coach → **Atletas**: revisar roster (Erik), editar PRs si hace falta.
2. Coach → **Programas** → Nuevo → Paso *Programa* → Generar → *Personalizar* → **Asignar** → Erik.
3. Atleta Erik → **Mi plan WL**: sesión del día, marcar series completadas.

Los datos viven en memoria del API mientras el servidor esté encendido. Reiniciar `npm run server` borra asignaciones nuevas (el seed incluye un plan demo para Erik).

### B) Local persistente (Postgres / Neon)

```bash
# .env del API (no commitear)
DATABASE_URL=postgresql://...
JWT_SECRET=openssl rand -base64 48   # 32+ chars
WOLF_SYNC_SEED_PASSWORDS=1           # alinear hashes con users.json

npm run db:setup
npm run db:provision-users           # coach-wl + erik + ath-erik
npm run server
npm run dev
```

Comprobar: `GET http://localhost:4000/health` → `"persistence":"postgres"`.

### C) Producción (Railway + Netlify)

- Railway: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `WOLF_SYNC_SEED_PASSWORDS=0` tras provisionar.
- Netlify: `VITE_API_URL=/api`, `NETLIFY_API_PROXY_TARGET=https://TU-API.up.railway.app`, luego redeploy del front.
- `npm run db:setup` + `npm run db:provision-users` en Neon una vez.

### Roles y control del coach

| Acción | Coach | Admin |
|--------|-------|-------|
| Ver roster y adherencia | ✓ | ✓ |
| Editar PRs / nivel / añadir atleta al roster | ✓ | ✓ |
| Crear programas y asignar | ✓ | ✓ |
| Crear usuario login (email/user/pass) | — | Panel maestro |
| Eliminar perfil WL | — | ✓ |

La cuenta de login del atleta (`erik` ↔ perfil `ath-erik`) la crea el **admin** hoy; a futuro correo + auth avanzada.

## Flujo coach → Erik (producción)

1. **Coach** (`coach-wl` / `CoachWL2026!` o `chiron.traine@gmail.com`): **Programas** → crear/editar mesociclo → **Asignar** → marcar **Erik Manzano**.
2. **Atleta Erik** (`erik` / `ErikWL2026!`): **Mi plan WL** — ve la rutina clonada al instante (WebSocket `assignments:changed` + recarga de `/assignments`).
3. Requisitos: front con `VITE_API_URL`, API con `DATABASE_URL` + `JWT_SECRET`, perfiles `user-coach-wl` + `user-erik` (`linkedAthleteId`: `ath-erik`) en Postgres.

## Coach programs week 1

1. Log in as **coach** (`programs` view).
2. **Generar:** atleta de referencia, objetivo, preset semanas/días, generar mesociclo.
3. **Personalizar:** semana 1, editor de sesión (picker G1–G4 o catálogo completo).
4. **Asignar:** desde el editor o la tabla de programas; el atleta ve el plan en **Mi plan WL**.

## Persistence (local + production)

| Environment | Frontend | Backend | What persists |
|-------------|----------|---------|----------------|
| Local demo | `npm run dev` | optional `npm run server` | `localStorage` keys `wolf_wl_*` |
| Shared coach/athlete | `VITE_API_URL` → API | `DATABASE_URL` (Neon) | Postgres `assignments`, `workout_completions`, `workout_set_logs` |

### Local + API on your PC

```bash
# Terminal 1
npm run server

# Terminal 2 — .env.development incluye VITE_API_URL=/api (proxy Vite → :4000)
npm run dev
```

Con API activo, las asignaciones y ediciones de plan se sincronizan en **tiempo real** vía WebSocket (`assignments:changed`): coach asigna o edita → el atleta ve el cambio en «Mi plan WL» sin recargar (misma BD o memoria del API).

Health: `GET http://localhost:4000/health` → `"persistence":"memory"` or `"postgres"` if `DATABASE_URL` is set.

### Production (Railway + Postgres)

1. Set `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN` on Railway.
2. Netlify: `VITE_API_URL=/api` + `NETLIFY_API_PROXY_TARGET` per [README.md](../README.md).
3. Seed catalog after JSON changes:

```bash
DATABASE_URL="postgresql://..." npm run db:setup
```

4. Restart API; health must show `"persistence":"postgres"`.

## Exercise catalog (Bulgarian groups)

- Data: [src/data/bulgarianCatalogData.ts](../src/data/bulgarianCatalogData.ts) + [src/data/exercises-bulgarian-catalog.json](../src/data/exercises-bulgarian-catalog.json)
- Merged with legacy **39** movements in [loadMockData.ts](../src/data/loadMockData.ts) (incl. Snatch Extension, Clean Extension)
- Technical collections **Grupo 1–15** in Ejercicios hub via [seedCollections.ts](../src/data/exercise-intelligence/seedCollections.ts)

## Assignments module

WL assignments live in [src/modules/assignments/](../src/modules/assignments/):

- `WlAssignmentsProvider` — state, API, WebSocket `assignments:changed`
- `useWlAssignments()` — use in `wl-management` and anywhere you only need assignments
- `useWolfAssign()` — full app context (auth + catalog + assignments)

Coach templates (`CoachWlProgramTemplate`) remain **localStorage only** (`wolf_wl_program_templates_v1`).
