# Coach workflow: week 1, persistence, catalog

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

### Production (Render + Neon)

1. Set `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN` on Render.
2. Front: `VITE_API_URL` or Netlify proxy per [README.md](../README.md).
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
