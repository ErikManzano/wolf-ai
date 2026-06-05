/**
 * Verifica que el catálogo y el picker del coach incluyan los ejercicios
 * necesarios para programar semanas 1–4 (mesociclo 4×3).
 * Run: npx tsx scripts/verify-coach-exercises.ts
 */
import { mockAthletes, mockExercises } from '../src/data/loadMockData';
import { seedExerciseDefinitionsFromLegacy } from '../src/api/exerciseCatalogSeed';
import { seedTechnicalCollectionsLocal } from '../src/data/exercise-intelligence/seedCollections';
import {
  browseExerciseRegistry,
  getExerciseTaxonomy,
  mergedViewsToPickerOptions,
} from '../src/services/exercise';
import { generatePeriodizedProgram } from '../src/services/programGenerator';
import {
  filterPickerByCatalogGroup,
  searchPickerOptions,
} from '../src/services/exercise/sessionPickerCatalog';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const taxonomy = getExerciseTaxonomy();
const defs = seedExerciseDefinitionsFromLegacy();
const browseAll = browseExerciseRegistry(
  defs,
  [],
  { coachId: 'user-coach', includeDeprecated: false, status: 'all', kind: 'all' },
  taxonomy,
);
const picker = mergedViewsToPickerOptions(browseAll.definitions, taxonomy);
const browseSingles = browseExerciseRegistry(
  defs,
  [],
  { coachId: 'user-coach', includeDeprecated: false, status: 'all', kind: 'single' },
  taxonomy,
);
const pickerSingles = mergedViewsToPickerOptions(browseSingles.definitions, taxonomy);

const byId = new Map(picker.map((o) => [o.id, o]));

const athlete = mockAthletes.find((a) => a.id === 'ath-you')!;
const program = generatePeriodizedProgram({
  athleteId: athlete.id,
  athlete,
  exercises: mockExercises,
  totalWeeks: 4,
  daysPerWeek: 3,
  primaryGoal: 'strength',
});

const w1Ids = new Set<string>();
for (const day of program.weeks[0]!.days) {
  for (const b of day.session.exercises) {
    w1Ids.add(b.exerciseId);
    for (const s of b.segments ?? []) w1Ids.add(s.exerciseId);
  }
}
const missingW1 = [...w1Ids].filter((id) => !byId.has(id));
assert(missingW1.length === 0, `Week 1 exercises missing from picker: ${missingW1.join(', ')}`);

function pickerIdsForGroup(catalogGroup: string): Set<string> {
  const fromCatalog = mockExercises
    .filter((e) => e.catalogGroup === catalogGroup)
    .map((e) => e.id);
  const fromCollection =
    seedTechnicalCollectionsLocal()
      .find((c) => c.code === catalogGroup)
      ?.items.map((i) => i.definitionId) ?? [];
  return new Set([...fromCatalog, ...fromCollection]);
}

const essentials: { id?: string; search: string; grupo?: string }[] = [
  { id: 'ex-001', search: 'snatch', grupo: 'grupo_1' },
  { search: 'classic snatch', grupo: 'grupo_1' },
  { search: 'power snatch', grupo: 'grupo_3' },
  { search: 'snatch pull', grupo: 'grupo_4' },
  { search: 'clean', grupo: 'grupo_5' },
  { search: 'jerk', grupo: 'grupo_8' },
  { search: 'front squat', grupo: 'grupo_10' },
  { search: 'back squat', grupo: 'grupo_10' },
  { search: 'press', grupo: 'grupo_12' },
  { search: 'below knee', grupo: 'grupo_2' },
];

const searchFails: string[] = [];
for (const e of essentials) {
  if (e.id && !byId.has(e.id)) searchFails.push(`missing id ${e.id}`);
  const hits = searchPickerOptions(picker, e.search, 8);
  if (hits.length === 0) searchFails.push(`no search hits for "${e.search}"`);
  if (e.grupo) {
    const ids = pickerIdsForGroup(e.grupo);
    const filtered = filterPickerByCatalogGroup(picker, e.grupo, ids);
    if (filtered.length === 0) searchFails.push(`empty filter ${e.grupo}`);
  }
}
assert(searchFails.length === 0, searchFails.join('; '));

const g1 = filterPickerByCatalogGroup(picker, 'grupo_1', pickerIdsForGroup('grupo_1'));
assert(g1.some((o) => o.id === 'ex-001'), 'G1 filter must include legacy Snatch (ex-001)');
const g5 = filterPickerByCatalogGroup(picker, 'grupo_5', pickerIdsForGroup('grupo_5'));
assert(g5.some((o) => o.id === 'ex-025'), 'G5 filter must include legacy Clean & Jerk (ex-025)');

const collections = seedTechnicalCollectionsLocal();
const collFails: string[] = [];
for (const c of collections) {
  const missing = c.items.filter((it) => !byId.has(it.definitionId));
  if (missing.length) collFails.push(`${c.code}: missing ${missing.length} in picker`);
}
assert(collFails.length === 0, collFails.join('; '));

const badNames = picker.filter((o) => !o.name?.trim() || o.name.length < 3);
assert(badNames.length === 0, `Bad display names: ${badNames.map((o) => o.id).join(', ')}`);

const groupCounts: Record<string, number> = {};
for (const o of picker) {
  const g = o.catalogGroup ?? o.tags?.find((t) => /^grupo_\d+$/.test(t));
  if (g) groupCounts[g] = (groupCounts[g] ?? 0) + 1;
}
for (let i = 1; i <= 12; i++) {
  const g = `grupo_${i}`;
  assert((groupCounts[g] ?? 0) >= 1, `${g} has no picker entries`);
}

console.log('verify-coach-exercises: OK');
console.log(`  catalog merged: ${mockExercises.length} exercises`);
console.log(`  picker: ${picker.length} total | ${pickerSingles.length} singles`);
console.log(`  week 1 auto-programmed: ${w1Ids.size} unique movements`);
console.log(
  '  week 1 sample:',
  [...w1Ids].slice(0, 6).map((id) => byId.get(id)?.name ?? id).join(' · '),
);
console.log(
  '  groups G1–G12:',
  Object.fromEntries(
    Object.entries(groupCounts)
      .filter(([k]) => /^grupo_(1[0-2]|[1-9])$/.test(k))
      .sort(([a], [b]) => a.localeCompare(b)),
  ),
);
