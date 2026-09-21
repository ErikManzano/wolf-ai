# PRD — Catálogo Accesorios / Culturismo / Alto rendimiento

## Resumen

Homilos amplía la biblioteca de ejercicios oficiales con el contenido estructurado de **CONCENTRADO 2** (`docs/exercises/CONCENTRADO 2.md`): calentamiento dinámico, resistencia accesoria, foam roller, enciclopedia por grupo muscular y bodyweight. Estos movimientos **no son halterofilia olímpica**; viven como `family: accessory` sin alterar el grafo de composición Snatch/Clean.

Fuente parseada: `src/data/exercises-concentrado.json`  
Inventario humano: `docs/exercises/concentrado-inventory.md`

---

## Alcance

| Incluye | Descripción |
|---|---|
| Calentamiento dinámico | ~60 movimientos (pares EN/ES), section `warmup` |
| Resistencia accesoria | Filas, lunges, band work, etc., section `strength` |
| Foam roller | 7 zonas corporales, section `foam` |
| Enciclopedia muscular | Pecho, Espalda, Hombros, Antebrazos, Tríceps, Piernas, Pantorrillas, Glúteos, Abdomen |
| Bodyweight | ~70 movimientos únicos, section `bodyweight` |
| Hub Accesorios / Culturismo | Filtro por grupo muscular + ficha con cues ES |

## Fuera de alcance

- Onboarding antropométrico (circunferencias, % grasa)
- Test 1RM pecho / squat / deadlift como flujo de alta
- Nutrición (macros, comidas, suplementos)
- Programas preestablecidos “5–10 semanas masa/grasa”
- Fotos, videos oficiales (solo campo override del coach)
- Duplicar movimientos WL ya oficiales (Front Squat, Back Squat, OHS, Push Press, Power Clean, etc.) — **enriquecer cues** del id existente

---

## Taxonomía

### Disciplinas en el hub

| Disciplina | Catálogo | Chips |
|---|---|---|
| Halterofilia | WL oficial | Familia (Snatch, Clean, …) |
| Accesorios | CONCENTRADO accessory | Grupo muscular |
| Culturismo | Mismo catálogo accesorio | Grupo muscular |
| Alto rendimiento | Parcial (warmup + bodyweight) | Familia (futuro: tags `warmup`) |

### Grupos musculares (chips)

`chest` · `back` · `shoulders` · `forearms` · `triceps` · `quads` · `hamstrings` · `glutes` · `calves` · `core` · `full_body`

Tags en definición: `muscle:chest`, `muscle:back`, …

### Equipo

`barbell` · `dumbbell` · `kettlebell` · `machine` · `band` · `bodyweight` · `foam_roller` · `med_ball`

Tag: `equip:barbell`, etc.

### Secciones

`warmup` · `strength` · `foam` · `bodyweight` — tag `concentrado` + section code.

---

## Ficha de ejercicio (oficial accesorio)

| Campo | Tipo | Notas |
|---|---|---|
| `displayName` | string | Nombre EN compuesto (Homilos default) |
| `nameEs` | vía cues / búsqueda | `nameEs` en JSON CONCENTRADO → `searchText` |
| `cuesEn` | text | Instrucciones EN del OCR |
| `cuesEs` | text | Instrucciones ES del OCR |
| `tags` | string[] | `concentrado`, `muscle:*`, `equip:*`, section |
| `family` | `accessory` | Siempre para catálogo CONCENTRADO |
| `objective` | `strength` \| `recovery` | `recovery` para warmup/foam |
| `composition` | single accessory | `variation: classic`, sin `hang`/`block` WL |
| `mapsToLegacyId` | opcional | Solo en JSON fuente; seed enriquece WL, no crea fila nueva |

Variaciones Delavier (listas bajo Bench press, etc.) → campo `variations[]` en JSON; futuro: UI colapsable.

---

## Relación con grafo WL

- Catálogo búlgaro + `exercises.json` mantienen `family: snatch|clean|squat|…`
- CONCENTRADO **no** introduce variaciones olímpicas falsas (ej. `variation: hang` en bench press)
- Composición accesorio estándar:

```json
{
  "kind": "single",
  "family": "accessory",
  "variation": "classic",
  "startPosition": "floor",
  "modifiers": []
}
```

- Duplicados detectados en parseo → merge de `cuesEn`/`cuesEs` + tags en la definición WL existente (`coach_id NULL`)

---

## Seed y Postgres

1. `seedExerciseDefinitionsFromLegacy()` — sin cambios de comportamiento WL
2. `seedConcentradoAccessoryDefinitions()` — upsert ~375 oficiales nuevos (`ex-conc-*`)
3. `enrichLegacyDefinitionsFromConcentrado()` — parches cues en ids WL mapeados
4. Postgres: columnas `cues_en`, `cues_es` TEXT; migración idempotente en `initExerciseCatalogTables`

Regenerar JSON: `npx tsx scripts/parse-concentrado.ts`

---

## Criterios de aceptación

1. Coach abre **Ejercicios → Accesorios** y ve listado denso (centenas de movimientos), no empty state.
2. Chips muestran **Pecho, Espalda, Hombros…** (no Snatch/Clean) cuando disciplina = Accesorios o Culturismo.
3. Filtrar chip **Pecho** reduce la lista solo a ejercicios con tag `muscle:chest`.
4. Abrir detalle de un accesorio CONCENTRADO muestra **cues en español** en pestaña Intel (cuando `cuesEs` existe).
5. Front Squat / Back Squat / OHS / Push Press / Power Clean **no** aparecen duplicados; sus fichas WL muestran cues CONCENTRADO si el parseo las mapeó.
6. Snatch, Clean y complejos búlgaros **no** cambian composición ni signatures.

---

## Métricas de inventario (referencia)

Ver `docs/exercises/concentrado-inventory.md` tras cada parseo. Objetivo: ~250–350 movimientos únicos colapsando pares EN/ES.
