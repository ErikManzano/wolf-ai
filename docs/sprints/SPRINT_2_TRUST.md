# Sprint 2 — Confianza (Legal + Quitar IA mock + Tests)

**Objetivo:** Que un coach no sienta que el producto miente o está incompleto en lo legal/básico.  
**Duración estimada:** 2 semanas  
**Audience UX:** Rediseñar Account (sin “Coming soon” muertos), panel asistente honesto, Terms/Privacy leíbles.

---

## Entregables

### 1. Terms of Service + Privacy Policy

- Pantallas / rutas in-app accesibles desde Account
- Texto ES + EN (versión v1 razonable para fitness SaaS LATAM)
- Links en login/register footer

**UX notes:**
- Tipografía readable, scrollbar, “Última actualización”
- No walls of text sin headings

### 2. Quitar / reclibrar IA mock

Según [`docs/IA_STRATEGY.md`](../IA_STRATEGY.md):

- Renombrar “Asistente AI” → “Asistente” / “Tips”
- Quitar fatiga inventada
- Tips estáticos útiles (cómo duplicar semana, K-value, etc.) o panel “próximamente con acciones reales”
- No mutar `AppContext` deload desde el chat

### 3. Tests de integración críticos

Mínimo:
- Auth login / reject bad password
- Assignment create + program patch sync concepts (unit-level si no hay DB en CI)
- `duplicateWeekInGeneratedProgram` / structure mutations
- Billing limit helpers

Stack: Vitest (alineado con Vite).

---

## Criterios de aceptación

- [x] Account no muestra 4 “Coming soon” vacíos sin alternativa
- [x] Terms y Privacy abren contenido real
- [x] Chat/sidebar no dice “AI analizó fatiga”
- [x] `npm test` corre y pasa suite mínima

## Estado de implementación (Julio 2026)

Implementado. Ver `docs/IA_STRATEGY.md`, `src/components/legal/`, Vitest en `src/config/billing.test.ts`.
## Archivos clave

- `src/components/account/WlAccountView.tsx`
- `src/components/legal/*` (nuevo)
- `src/components/ChatPanel.tsx`, `Sidebar.tsx`
- `docs/IA_STRATEGY.md`
- `vitest.config.ts`, `src/**/*.test.ts`

## UX — espacio para el diseñador

| Pantalla | Wireframe | Copy ES | Notas |
|----------|-----------|---------|-------|
| Account limpio | | | Billing + Legal + Language |
| Assistant tips panel | | | Honestidad > marketing |
| Terms layout | | | |
| Privacy layout | | | |
