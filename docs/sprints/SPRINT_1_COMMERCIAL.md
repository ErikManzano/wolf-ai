# Sprint 1 — Comercial (Billing + Invite + Duplicate Week)

**Objetivo:** Convertir Wolf en un producto cobrable y usable sin super_admin.  
**Duración estimada:** 2 semanas  
**Audience UX:** Diseñar sheet de invite, pantalla/plan billing, confirmación de duplicar semana.

---

## Entregables de producto

### 1. Billing (Stripe-ready + límites Free/Pro)

| Tier | Límite atletas | Programas activos | Precio (lista) |
|------|----------------|-------------------|----------------|
| Free | 3 | 1 | $0 |
| Pro | Ilimitado | Ilimitado | $39 USD/mes (placeholder) |

**UX notes (diseñador):**
- Account → sección Plan + Upgrade CTA
- Banner soft cuando el coach está en Free y cerca del límite
- Sheet “Límite alcanzado” al intentar invitar el 4º atleta o crear el 2º programa
- Copy honesto: Pro desbloquea roster y programas ilimitados (sin vender “IA” aún)

**Engineering:**
- Modelo `billing` en config + enforcement en API/client
- Checkout Stripe opcional vía env (`STRIPE_PRICE_PRO`, `STRIPE_SECRET_KEY`); sin keys → modo manual “Contactar / Activar Pro (admin)”
- Webhook o patch admin para marcar coach `plan: 'pro'`

### 2. Coach invite atletas (self-serve)

**Flujo:**
1. Coach → Atletas → “Invitar atleta”
2. Genera link / código o crea usuario con email + password temporal + perfil WL
3. Atleta inicia sesión y ve planes asignados

**UX notes:**
- Sheet: nombre, email, PRs opcionales (snatch/C&J/squat), nivel
- Success state con “Copiar link de invitacion” o credenciales
- Empty state roster: CTA primario “Invitar primer atleta”

### 3. Duplicar semana + copiar día entre semanas

**Flujo editor:**
- Week nav → acción “Duplicar semana” (inserta copia después de la actual)
- Matrix / day actions → “Copiar a…” (selector semana/día destino)

**UX notes:**
- Confirm modal: “Se insertará una copia de la Semana N. ¿Continuar?”
- Toast success
- Disable si se alcanza MAX weeks (52)

---

## Criterios de aceptación

- [x] Coach Free con 3 atletas no puede invitar el 4º sin upgrade messaging
- [x] Coach Pro (flag / local upgrade) no tiene ese límite
- [x] Coach crea atleta + login atleta funciona sin Master panel (`POST /wl-athletes/invite`)
- [x] Duplicar semana clona días/sesiones (deep clone), no re-genera auto-content
- [x] Copiar día a otra semana reemplaza el slot destino (`copyDayAcrossProgram`)

## Estado de implementación (Julio 2026)

Implementado en código. UX puede seguir refinando sheets/copy en las tablas abajo.
## Archivos clave

- `src/config/billing.ts` (nuevo)
- `src/services/programStructureMutations.ts`
- `src/components/OlympicProgramPlan.tsx` / `ProgramWeekDayNav.tsx`
- `src/components/wl-management/` / invite sheet
- `src/api/routes.ts` + postgresStore
- `src/components/account/WlAccountView.tsx`

## UX — espacio para el diseñador

> Completar wireframes / copy ES+EN antes de pulir CSS avanzado.

| Pantalla | Wireframe | Copy ES | Notas |
|----------|-----------|---------|-------|
| Invite sheet | | | |
| Plan / Upgrade | | | |
| Limit reached | | | |
| Duplicate week confirm | | | |
| Copy day picker | | | |
