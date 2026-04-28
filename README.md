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

## Free Backend Deploy (Recommended: Render)

Este repo incluye `render.yaml` para desplegar gratis el backend.

1. Sube el repo a GitHub.
2. En Render, crea un **Blueprint** apuntando al repo.
3. Verifica variables:
   - `FRONTEND_ORIGIN`: URL de tu Netlify (ej. `https://tu-app.netlify.app`)
   - `DEMO_LOGIN_PASSWORD`: contraseña demo (`wolf2026` por defecto)
4. Deploy.
5. Prueba:
   - `https://TU-BACKEND.onrender.com/health`

### Notas para demo en varios dispositivos

- Al ser plan gratis, Render puede “dormir” tras inactividad.
- Para demo en tiempo real, todos deben usar el mismo backend URL.
- Si quieres persistencia fuerte (sin perder estado al reiniciar), conecta DB externa (Supabase/Neon).
