# Contexto completo — Motor de halterofilia (Wolf AI)

Documento de referencia para handoff a otra IA o desarrollador. Proyecto: **wolf-ai** (React + Vite + Express API opcional + Postgres/Neon).

---

## 1. Qué es y para qué sirve

El módulo **Programas** (`programs`) reemplaza al antiguo Motor WL (`wolf-engine`). Es el flujo principal del coach para:

1. **Gestionar** mesociclos en una tabla CRUD (hub principal)
2. **Editar** cada programa en pestañas: Contexto → Generar → Personalizar
3. **Asignar** a uno o varios atletas (clones independientes agrupados por `coach_program_id`)
4. Revisar **adherencia** por atleta desde filas expandibles

El atleta sigue viendo su instancia clonada en **Mi plan WL** (`my-wl-plan`).

**Deprecado:** `OlympicEnginePanel` (wizard 4 pasos) y paso 4 de `WlAssignmentManagement`. Se mantienen en el repo temporalmente; la navegación apunta a `programs`.

**Fuera de alcance del motor WL (legacy — no mezclar):**

- `AppContext` con `programs`, `assignments` numéricos (`wolf_assignments`)
- Vista antigua “Atletas / Planificación”
- El motor WL usa **`ProgramAssignment`** + **`GeneratedProgram`**, no los programas legacy `id: 101/102`

---

## 2. Arquitectura de capas

```
┌─────────────────────────────────────────────────────────────┐
│  UI                                                         │
│  WlProgramsPanel (hub + editor) │ AthleteTrainingView         │
│  OlympicProgramPlan │ OlympicSessionEditor │ wl-programs     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Estado                                                     │
│  WolfAssignContext (auth, catálogo ejercicios, usuarios)    │
│    └── WlProgramsProvider (coach_programs CRUD + assign bulk) │
│  AppContext (intakes/Stats PRs — puente vía wlStatsBridge)  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Servicios                                                  │
│  programGenerator │ sessionGenerator │ sessionMutations      │
│  programStructureMutations │ trainingEngine │ programDraftStore│
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Persistencia                                               │
│  API: POST/PATCH /assignments + WebSocket assignments:changed│
│  Postgres: assignments, workout_completions, workout_set_logs│
│  localStorage: drafts, templates, fallback sin API            │
└─────────────────────────────────────────────────────────────┘
```

**Providers (orden en `App.tsx`):**

`AppProvider` → `WolfAlertProvider` → `WolfAssignProvider` → `AppShell`

**Hooks principales:**

- `useWolfAssign()` — todo (auth + asignaciones + catálogo)
- `useWlAssignments()` — solo módulo de asignaciones (gestión WL)

---

## 3. Modelo de datos (dominio WL)

**Archivo canónico:** `src/models/training.ts`

### Jerarquía del programa

```
GeneratedProgram
├── id, name, athleteId, createdAt
├── totalWeeks, daysPerWeek, primaryGoal: 'technique' | 'strength' | 'power'
└── weeks: ProgramWeek[]
    └── days: ProgramDay[]
        ├── dayNumber, label?
        └── session: Session
            ├── id, athleteId
            ├── exercises: SessionExerciseBlock[]
            ├── totalReps, avgRelativeIntensity, avgAbsoluteIntensity
            ├── load (tonelaje kg), kValue
            └── métricas vía trainingEngine.applySessionMetrics()
```

### Bloque de ejercicio en sesión

```typescript
SessionExerciseBlock {
  exerciseId: string
  blockType?: 'single' | 'complex'
  segments?: ComplexSegmentDef[]   // solo complejos
  sets: SetScheme[]                // % × reps × series
  countsTowardTechnicalNBL?: boolean  // false = calentamiento
}

SetScheme {
  percentage: number   // % del 1RM ancla
  reps: number
  sets: number
  segmentReps?: string[] // complejos: reps por segmento
}
```

### Asignación coach → atleta

```typescript
ProgramAssignment {
  id: string
  coachId: string                    // WolfUser.id del coach
  athleteUserId?: string             // WolfUser.id del atleta (erik → user-erik)
  athleteProfileId: string           // Athlete.id WL (erik → ath-erik)
  version: number
  program: GeneratedProgram
  versionHistory: ProgramAssignmentVersion[]
  assignedAt: string
}
```

**Regla crítica:** solo **una asignación activa por `athleteProfileId`** (upsert en POST; UNIQUE en Postgres).

### Plantillas de coach (solo local)

```typescript
CoachWlProgramTemplate {
  id, coachId, name, program, sourceAssignmentId?, createdAt, updatedAt
}
```

**No hay API/Postgres para plantillas** — solo `localStorage` (`wolf_wl_program_templates_v1`).

### Atleta WL vs usuario

| Concepto | Dónde | Ejemplo Erik |
|----------|-------|--------------|
| Perfil WL (PRs, nivel, K) | `src/data/athletes.json` | `ath-erik` |
| Cuenta login | `src/data/users.json` | `user-erik`, username `erik` |
| Enlace | `linkedAthleteId` | `ath-erik` |
| Coach dueño | `coachId` | `user-coach-wl` |

---

## 4. Flujo coach — 4 pasos

**Componente:** `src/components/OlympicEnginePanel.tsx`

| Paso | ID | UI | Acciones clave |
|------|-----|-----|----------------|
| 1 | Contexto | Selector atleta, objetivo, banda K, PRs | `athletesForCoach()` filtra roster del coach |
| 2 | Creación | `OlympicProgramPlan` mode `create` | `generatePeriodizedProgram()` |
| 3 | Personalización | `OlympicProgramPlan` mode `customize` + `OlympicSessionEditor` | mutaciones sesión; PATCH si edita asignación existente |
| 4 | Asignación | `WlAssignmentManagement` | `assignProgramToAthlete()` → POST `/assignments` |

### Generación automática

**`src/services/programGenerator.ts`**

- `generatePeriodizedProgram(config)` — mesociclo completo
- `buildBlocksForSlot()` — bloques por día con periodización (fases, deload cada 4 semanas, taper final)
- Rotación de objetivo por día: `[primary, strength|power, technique]`
- Templates base: 72%×3×3, 82%×2×3, 87%×1×3 (`sessionGenerator.getDefaultBlockTemplates()`)

**Presets UI en `OlympicProgramPlan`:**

- beginner: 4 sem × 3 días
- intermediate: 8 sem × 4 días
- advanced: 12 sem × 5 días

### Personalización de sesión

**Mutaciones:** `src/services/sessionMutations.ts`

- `replaceProgramSession`, `addExerciseBlock`, `setBlockExercise`
- `updateSetSchemeField`, helpers de complejos
- `refreshSession` recalcula métricas K/volumen

**Estructura del mesociclo:** `src/services/programStructureMutations.ts`

- `addWeekToGeneratedProgram`, `removeWeekFromGeneratedProgram`
- `addDayToGeneratedWeek`, `removeDayFromGeneratedWeek`
- `syncProgramMeta`, `PROGRAM_STRUCTURE_LIMITS`

**Motor de cargas:** `src/services/trainingEngine.ts`

- `resolveBaseOneRm()` — ancla snatch/C&J/sentadillas según ejercicio
- `applySessionMetrics()` — K-value, tonelaje, intensidad
- `K_VALUE_RANGES`: beginner 65–70, intermediate 71–75, advanced 76–82

### Borradores locales

| Key | Contenido |
|-----|-----------|
| `wolf_olympic_program_v1` | Borrador no asignado (paso 2–3) |
| `wolf_program_edit_draft_v1` | Draft del editor (paso 3) |
| `wolf_program_edit_backups_v1` | Hasta 6 backups |

**Servicio:** `src/services/programDraftStore.ts`

### Asignar al atleta

**`WlAssignmentsProvider.assignProgramToAthlete()`**

1. Resuelve `athleteUserId` desde `users` donde `linkedAthleteId === athleteProfileId`
2. Con API: POST `/assignments` (requiere JWT; **no hay éxito optimista** — falla con alerta si error)
3. Sin API: guarda en `wolf_wl_assignments_v1`
4. WebSocket emite `assignments:changed` → atleta recarga

**Edición en vivo de plan ya asignado:**

- Debounce 600 ms → `updateAssignmentProgram()` → PATCH `/assignments/:id/program`
- Incrementa `version`, guarda snapshot en `versionHistory`

---

## 5. Flujo atleta — Mi plan WL

**Componente:** `src/components/AthleteTrainingView.tsx`

1. Login atleta (`erik` / `ErikWL2026!`)
2. `myAssignment` = última asignación donde:
   - `athleteProfileId === linkedAthleteId` **o**
   - `athleteUserId === user.id`
3. Navegación por semanas (`MobileWeekNavigator`)
4. Por día: `DayTrackingCard` con series prescritas
5. Tracking: `toggleSetComplete`, `toggleExerciseComplete`, `toggleSessionComplete`
6. Disciplina % = ejercicios completados / total (`completionHelpers.ts`)

**Tiempo real:** WebSocket `assignments:changed` → `loadAssignmentsFromApi()` → UI se actualiza sin refresh.

---

## 6. Autenticación y cuentas demo

| Rol | Login | Password | IDs |
|-----|-------|----------|-----|
| Coach WL | `coach-wl` o `chiron.traine@gmail.com` | `CoachWL2026!` | `user-coach-wl` |
| Atleta Erik | `erik` | `ErikWL2026!` | `user-erik` → `ath-erik` |
| Demo genérico (evitar) | `coach@wolf-ai.app` / `atleta@wolf-ai.app` | ver `users.json` | `ath-you` |

**Accesos rápidos login:** `src/config/demoQuickLogin.ts` (alineado a coach-wl + erik)

**Roster del coach:** `src/utils/coachAthleteRoster.ts` → `athletesForCoach()`

- Filtra `mockAthletes` por usuarios con `coachId === currentUser.id`
- Si no hay vínculos, fallback a **todos** los atletas mock (limitación)

**PRs del atleta en el motor:** `src/utils/wlStatsBridge.ts`

- Fusiona perfil WL + último intake de `AppContext`
- Mapa hardcoded: `ath-erik` y `ath-you` → app athlete id `1`

---

## 7. API y persistencia

### Activar API

```bash
# Terminal 1
npm run server          # Express :4000 + WebSocket /ws

# Terminal 2 (.env.development)
VITE_API_URL=/api       # proxy Vite → :4000, ws: true
npm run dev
```

**Cliente:** `src/modules/assignments/apiClient.ts`

- `getApiBase()`, `isApiEnabled()`, `getWebSocketUrl()`, `assignmentApiFetch()`

### Endpoints de asignaciones (`src/api/routes.ts`)

| Método | Ruta | Quién | Qué hace |
|--------|------|-------|----------|
| GET | `/assignments` | JWT | Lista filtrada por rol |
| GET | `/assignments/athlete/:profileId` | JWT | Última asignación del perfil |
| POST | `/assignments` | Coach/admin | Crea/reemplaza asignación |
| PATCH | `/assignments/:id/program` | Coach dueño | Actualiza JSON + versionHistory |
| DELETE | `/assignments/:id` | Coach dueño | Borra asignación |

**Tracking:**

- `/completions`, `/completions/toggle`, `/completions/session-toggle`
- `/set-logs`, `/set-logs/toggle`, PATCH `/set-logs`

**WebSocket:** `src/modules/assignments/realtimeClient.ts`

- Evento: `assignments:changed`
- Reconexión exponencial

### Postgres (`src/api/postgresStore.ts`)

| Tabla | Notas |
|-------|-------|
| `assignments` | `athlete_profile_id` UNIQUE, `program` JSONB, `version_history` JSONB |
| `workout_completions` | FK → assignments |
| `workout_set_logs` | FK → assignments |
| `users` | `coach_id`, `linked_athlete_id` |

**No persistido en BD:** perfiles `athletes.json`, plantillas coach, borradores sin asignar.

### localStorage (WL)

| Key | Uso |
|-----|-----|
| `wolf_wl_assignments_v1` | Solo modo sin API |
| `wolf_wl_completions_v1` | Siempre (cache) |
| `wolf_wl_set_logs_v1` | Siempre (cache) |
| `wolf_wl_program_templates_v1` | Plantillas coach |
| `wolf_api_token_v1` | JWT |

### sessionStorage

| Key | Uso |
|-----|-----|
| `wolf_programs_focus_id` | Deep-link al hub Programas (fila expandida) |
| `wolf_manage_focus_assignment_id` | Legacy — redirige a Programas |

---

## 8. Mapa de archivos

```
src/
├── models/training.ts              # Tipos WL (GeneratedProgram, ProgramAssignment, …)
├── components/
│   ├── wl-programs/
│   │   ├── WlProgramsPanel.tsx     # Hub ↔ editor
│   │   ├── WlProgramsHub.tsx       # Tabla CRUD + KPIs
│   │   ├── WlProgramEditor.tsx     # Pestañas contexto/generar/personalizar
│   │   └── WlProgramAssignSheet.tsx # Multi-asignación
│   ├── OlympicEnginePanel.tsx      # (deprecado) wizard 4 pasos
│   ├── OlympicProgramPlan.tsx      # Generar / customizar / asignar UI
│   ├── OlympicSessionEditor.tsx    # Editor de sesión
│   ├── AthleteTrainingView.tsx     # Mi plan WL (atleta)
│   ├── CentralPanel.tsx            # Router de vistas
│   ├── Sidebar.tsx                 # Nav programs / my-wl-plan
│   ├── session-editor/             # Bloques, tablas, nav semana/día
│   ├── wl-management/              # Detalle instancia, biblioteca legacy
│   └── athlete-tracking/           # Cards tracking atleta
├── modules/wl-programs/
│   ├── WlProgramsProvider.tsx      # coach_programs CRUD + WS
│   ├── apiClient.ts
│   ├── programStore.ts             # localStorage fallback
│   └── types.ts
├── modules/assignments/
│   ├── WlAssignmentsProvider.tsx   # Estado + API asignaciones
│   ├── assignmentStore.ts          # localStorage + seed demo
│   ├── apiClient.ts                # REST/WS
│   ├── realtimeClient.ts           # WebSocket
│   ├── types.ts                    # WlAssignmentsContextValue
│   └── constants.ts                # STORAGE_* keys
├── context/
│   ├── WolfAssignContext.tsx       # Auth, catálogo, merge con WL
│   └── AppContext.tsx              # Legacy + intakes (Stats/PRs)
├── services/
│   ├── programGenerator.ts         # generatePeriodizedProgram
│   ├── sessionGenerator.ts         # buildSessionFromBlocks, pools
│   ├── sessionMutations.ts         # Edición bloques/series
│   ├── programStructureMutations.ts# Semanas/días
│   ├── programDraftStore.ts        # Drafts customize
│   ├── trainingEngine.ts           # K-value, 1RM, Prilepin
│   └── programExport.ts            # exportProgramAsJson/Text
├── utils/
│   ├── coachAthleteRoster.ts       # athletesForCoach
│   ├── wlStatsBridge.ts            # PRs desde intakes
│   ├── completionHelpers.ts        # Lógica completado
│   └── dashboardStats.ts           # buildWlAssignmentRows, alertas
├── api/
│   ├── routes.ts                   # REST assignments + auth
│   ├── server.ts                   # Express + WS
│   └── postgresStore.ts            # Neon/Postgres
└── data/
    ├── users.json, athletes.json
    ├── exercises.json + bulgarian catalog
    └── loadMockData.ts             # mockUsers, mockAthletes, mockExercises
```

---

## 9. Componentes UI clave

| Archivo | Rol |
|---------|-----|
| `OlympicEnginePanel.tsx` | Wizard 4 pasos; state `activeStep`, `athleteId`, `goal`, `program`, `editingAssignmentId` |
| `OlympicProgramPlan.tsx` | Modos `create` / `customize` / `assign` / `full`; `handleGenerate`, `applyProgramUpdate` |
| `OlympicSessionEditor.tsx` | Shell del editor; delega a `ExerciseBlockCard`, picker mobile |
| `WlAssignmentManagement.tsx` | Paso 4; tabs assignments / library |
| `WlAssignmentDetail.tsx` | Detalle, versiones, duplicar, plantilla, editar |
| `WlCoachProgramLibrary.tsx` | Plantillas locales; `assignFromTemplate` |
| `AthleteTrainingView.tsx` | Vista atleta; `myAssignment`, tracking por día |
| `ProgramWeekDayNav.tsx` | Navegación semana/día en editor |
| `DraftRecoveryBanner.tsx` | Recuperación de borrador interrumpido |

---

## 10. Catálogo de ejercicios

- **Legacy + búlgaro:** `loadMockData.ts` → ~37 + ~92 ejercicios
- **Exercise OS:** definiciones en Postgres + `WolfAssignContext` (definitions, overrides, collections Grupo 1–15)
- Picker en sesión: `ExerciseAutocomplete`, `ExercisePickerSheet`
- Grupos técnicos: `seedCollections.ts` (Grupo 1–15)

El generador usa `mockExercises` / `motorExercises` del contexto según el flujo.

---

## 11. Puntos de extensión para agregar programas

### A. Nuevos tipos de programa / presets

- **`programGenerator.ts`** — lógica de periodización, `phaseModifiers`, `buildBlocksForSlot`
- **`OlympicProgramPlan.tsx`** — presets semanas×días, botón generar, UI de objetivos
- **`sessionGenerator.ts`** — `getDefaultBlockTemplates()`, `getExercisePoolForGoal()`

### B. Biblioteca de programas del coach

- **`CoachWlProgramTemplate`** + `saveCoachTemplate` / `assignFromTemplate` en `WlAssignmentsProvider`
- **Gap:** solo localStorage — candidato #1 para API + Postgres si quieren biblioteca compartida

### C. Múltiples programas por atleta

- **Gap actual:** upsert por `athleteProfileId` — hay que cambiar:
  - Schema Postgres (quitar UNIQUE o añadir `status`/`active`)
  - `assignProgramToAthlete`, `myAssignment` (hoy toma el más reciente)
  - UI atleta (selector de plan activo)

### D. Programas predefinidos / marketplace

- Crear seed JSON de `GeneratedProgram[]` o templates
- Cargar en `WlCoachProgramLibrary` o nuevo hub
- Asignar vía `assignFromTemplate` o POST directo

### E. Import/export

- **`programExport.ts`** — JSON/texto ya existe
- Falta: import parser → `GeneratedProgram` validado

### F. Regeneración parcial

- **`regenerateProgramDay()`** en `programGenerator.ts` — **exportado pero sin UI**
- Candidato para botón “regenerar este día” en el editor

### G. Sincronización cross-device

- Requiere API + `npm run server` + JWT
- Plantillas y borradores aún no sincronizan

---

## 12. Limitaciones conocidas

1. **Un plan activo por atleta** (upsert)
2. **Plantillas solo local**
3. **Perfiles atleta WL estáticos** (`athletes.json`) — no CRUD API
4. **Dos sistemas de asignación** (WL vs AppContext legacy)
5. **PATCH optimista sin rollback** en edición de plan (fallo silencioso en UI)
6. **`athletesForCoach` fallback** muestra todos si coach sin atletas vinculados
7. **`wlStatsBridge`** solo mapea `ath-erik` / `ath-you` a Stats
8. **`regenerateProgramDay`** sin UI
9. Completions/set-logs: cache local siempre, aunque haya API
10. Sin API (`VITE_API_URL` vacío): todo en localStorage del mismo navegador
11. No PATCH de `coachId` / `athleteProfileId` — hay que borrar y reasignar
12. Dos suscripciones WebSocket (catálogo ejercicios + asignaciones) al mismo `/ws`

---

## 13. Flujo de datos (asignación)

```
Coach genera GeneratedProgram
        │
        ▼
assignProgramToAthlete(program, athleteProfileId)
        │
        ├─ Sin API → wolf_wl_assignments_v1 (localStorage)
        │
        └─ Con API → POST /assignments { coachId, athleteProfileId, athleteUserId, program }
                        │
                        ▼
                   Postgres assignments (JSONB program)
                        │
                        ▼
                   WebSocket assignments:changed
                        │
                        ▼
              Atleta: GET /assignments → myAssignment → AthleteTrainingView
```

---

## 14. Comandos y docs relacionados

```bash
npm run dev      # front (necesita .env.development VITE_API_URL=/api)
npm run server   # API :4000
npm run build    # producción
```

- `docs/COACH_PERSISTENCE.md` — persistencia coach/atleta
- `.env.example` — variables API, WS, cuentas Erik/coach-wl

---

## 15. Prompt sugerido para otra IA

```
Estoy trabajando en wolf-ai, app React/TS de planificación para halterofilia.
El Motor WL (OlympicEnginePanel) tiene 4 pasos: contexto → generar mesociclo
(generatePeriodizedProgram) → personalizar sesiones (sessionMutations) → asignar
(assignProgramToAthlete → POST /assignments). El atleta ve el plan en
AthleteTrainingView vía myAssignment. Los tipos están en src/models/training.ts.
Las asignaciones viven en WlAssignmentsProvider; hay una asignación por
athleteProfileId. Las plantillas coach son solo localStorage.

Contexto completo: docs/MOTOR_WL_CONTEXT.md

Quiero [DESCRIBE TU MEJORA]. Respeta la arquitectura existente y no mezcles
con AppContext legacy.
```

---

*Última actualización: alineado con commits de sync API/WebSocket, fix asignación coach→atleta, y cuentas demo coach-wl / erik.*
