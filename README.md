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
- `GET /exercises`
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

## Free Backend Deploy (Recommended: Render + Neon Postgres)

Este repo incluye `render.yaml` para desplegar gratis el backend.

1. Sube el repo a GitHub.
2. En Render, crea un **Blueprint** apuntando al repo.
3. Crea una base Postgres gratis en Neon y copia el `DATABASE_URL`.
4. Verifica variables en Render:
   - `FRONTEND_ORIGIN`: URL de tu Netlify (ej. `https://tu-app.netlify.app`)
   - `JWT_SECRET`: 32+ caracteres aleatorios (obligatorio en producción)
   - `DATABASE_URL`: connection string de Neon
   - En el **front** (Netlify): `VITE_API_URL=/api` + `NETLIFY_API_PROXY_TARGET` = URL del API, o `VITE_API_URL` = URL https del API.
   - Usuarios demo (coach / atleta): ver `.env.example`.
5. Deploy.
6. Prueba:
   - `https://TU-BACKEND.onrender.com/health`
   - Debe devolver `"persistence":"postgres"` cuando esté bien conectado.

### Persistencia y demo multi-dispositivo

- Si `DATABASE_URL` no está configurado, la API cae en modo memoria (`"persistence":"memory"`).
- Con `DATABASE_URL`, `/users` y `/assignments*` quedan persistidos en Postgres.
- Al ser plan gratis, Render puede “dormir” tras inactividad.
- Para demo en tiempo real, todos deben usar el mismo backend URL.

### Local funciona pero el deploy no (login)

1. **Netlify (recomendado):** en *Site settings → Environment variables*:
   - `NETLIFY_API_PROXY_TARGET` = `https://TU-API.onrender.com` (sin `/` final)
   - `VITE_API_URL` = `/api`
   El build de Netlify ya ejecuta `prep-netlify-proxy.mjs` y genera `public/_redirects` para enrutar `/api/*` al backend.
2. **Alternativa:** `VITE_API_URL` = `https://TU-API.onrender.com` (URL completa) y redeploy del front.
3. **Render (API):** `FRONTEND_ORIGIN` = URL exacta del front Netlify. Opcional: `FRONTEND_ORIGINS` (varias URLs separadas por comas).
4. `GET https://TU-API.onrender.com/health` → revisa `corsOrigins`.
