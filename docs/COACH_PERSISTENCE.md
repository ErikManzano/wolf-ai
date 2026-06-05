# Coach workflow: week 1, persistence, catalog

## Coach programs week 1 (Motor WL)

1. Log in as **coach** (`wolf-engine` view).
2. **Step 1 — Context:** pick athlete, goal, K-band; confirm PRs in Stats.
3. **Step 2 — Create:** preset **4 weeks × 3 days**, generate mesocycle.
4. **Step 3 — Customize:** stay on **Week 1**, edit each day in the session editor. Use filter chips **G1–G4** (snatch groups) in the toolbar to narrow the exercise picker; full list also in **Ejercicios** → technical collections Grupo 1–15.
5. **Step 4 — Assign:** tap **Assign to athlete**; athlete sees the plan under **My WL plan**.

## Persistence (local + production)

| Environment | Frontend | Backend | What persists |
|-------------|----------|---------|----------------|
| Local demo | `npm run dev` | optional `npm run server` | `localStorage` keys `wolf_wl_*` |
| Shared coach/athlete | `VITE_API_URL` → API | `DATABASE_URL` (Neon) | Postgres `assignments`, `workout_completions`, `workout_set_logs` |

### Local + API on your PC

```bash
# Terminal 1
npm run server

# Terminal 2 — .env or .env.local
VITE_API_URL=http://localhost:4000
npm run dev
```

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
- Merged with legacy 37 movements in [loadMockData.ts](../src/data/loadMockData.ts)
- Technical collections **Grupo 1–15** in Ejercicios hub via [seedCollections.ts](../src/data/exercise-intelligence/seedCollections.ts)

## Assignments module

WL assignments live in [src/modules/assignments/](../src/modules/assignments/):

- `WlAssignmentsProvider` — state, API, WebSocket `assignments:changed`
- `useWlAssignments()` — use in `wl-management` and anywhere you only need assignments
- `useWolfAssign()` — full app context (auth + catalog + assignments)

Coach templates (`CoachWlProgramTemplate`) remain **localStorage only** (`wolf_wl_program_templates_v1`).
