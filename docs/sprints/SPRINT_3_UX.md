# Sprint 3 — UX Coach (Editor + Dashboard home + Deep links)

**Objetivo:** Reducir fricción del coach diario y hacer el producto compartible/linkeable.  
**Duración estimada:** 2 semanas  
**Audience UX:** Prioridad máxima — el diseñador define jerarquías; eng implementa comportamiento.

---

## Entregables

### 1. Dashboard como home del coach

- Login coach → `dashboard` (no `programs`)
- Mantener Programs como acción primaria en bottom nav / sidebar
- Empty dashboard: CTAs “Crear programa” / “Invitar atleta”

### 2. Deep links (hash routing MVP)

URLs ejemplo:
- `#/dashboard`
- `#/programs`
- `#/programs/:programId`
- `#/programs/:programId/week/:w/day/:d`
- `#/athletes`
- `#/account`
- `#/legal/terms`, `#/legal/privacy`
- `#/invite/:token` (si aplica)

**UX notes:**
- Reload debe restaurar vista
- Share program week/day from editor “Copiar enlace”

### 3. Unificar edición de SetScheme (fase 1)

No es un rewrite total en un sprint. Fase 1:

- Exponer RIR en spreadsheet expand (`SpreadsheetSetBlocksPanel`) alineado con `SetsTable`
- Conectar `BlockIntensityPresets` en el expand panel
- Documentar superficie canónica: **Spreadsheet expand = desktop source of truth**

(Refactor completo de 4 superficies queda como deuda documentada.)

---

## Criterios de aceptación

- [x] Coach fresh login aterriza en Dashboard
- [x] Recargar `#/programs/<id>` abre el editor de ese programa (week/day en URL: parser listo; selección de día en editor se puede ampliar)
- [x] RIR visible/editable en spreadsheet
- [x] Apply intensity preset a todas las filas del bloque funciona (`BlockIntensityPresets`)

## Estado de implementación (Julio 2026)

Implementado. Deep links: `src/navigation/deepLinks.ts`. Dashboard home en `App.tsx`.
## Archivos clave

- `src/App.tsx`, `src/navigation/appNavigation.ts`, `src/navigation/deepLinks.ts` (nuevo)
- `src/components/CentralPanel.tsx`
- `src/components/session-editor/SpreadsheetSetBlocksPanel.tsx`
- `src/components/session-editor/BlockIntensityPresets.tsx`

## UX — espacio para el diseñador

| Pantalla | Wireframe | Prioridad | Notas |
|----------|-----------|-----------|-------|
| Coach dashboard empty + loaded | | Alta | Home post-login |
| Deep link share affordance | | Media | Icono link en editor |
| Spreadsheet RIR + intensity presets | | Alta | Densidad vs claridad |
| Mobile coach set editor parity | | Media | Misma data, menos chrome |

### Principios de diseño para este sprint

1. El dashboard debe responder en <3s “¿qué requiere mi atención hoy?”
2. El editor no debe pedir expandir tres niveles para un cambio de %
3. Los deep links deben sentirse nativos (no “hack de hash”)
4. Copy ES primero; EN en paralelo

> El diseñador puede editar este doc con wireframes, tokens y copy antes de más CSS.
