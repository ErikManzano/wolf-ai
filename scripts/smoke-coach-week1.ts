/**
 * Smoke: catalog size, demo assignment seed, grupo snatch exercises present.
 * Run: npx tsx scripts/smoke-coach-week1.ts
 */
import { mockExercises } from '../src/data/loadMockData';
import { bulgarianCatalogEntries } from '../src/data/bulgarianCatalogData';
import { seedTechnicalCollectionsLocal } from '../src/data/exercise-intelligence/seedCollections';
import { seedDemoAssignments, initialAssignmentsState } from '../src/modules/assignments/assignmentStore';
import { generatePeriodizedProgram } from '../src/services/programGenerator';
import { getExercisePoolForGoal } from '../src/services/sessionGenerator';
import { mockAthletes } from '../src/data/loadMockData';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const grupo2 = mockExercises.filter((e) => e.catalogGroup === 'grupo_2' || e.tags?.includes('grupo_2'));
const grupo4 = mockExercises.filter((e) => e.catalogGroup === 'grupo_4');
const collections = seedTechnicalCollectionsLocal();

assert(mockExercises.length >= 120, `Expected merged catalog >= 120, got ${mockExercises.length}`);
assert(bulgarianCatalogEntries.length >= 90, `Bulgarian entries >= 90, got ${bulgarianCatalogEntries.length}`);
assert(grupo2.length >= 6, `Grupo 2 snatch variants >= 6, got ${grupo2.length}`);
assert(grupo4.length >= 10, `Grupo 4 snatch pulls >= 10, got ${grupo4.length}`);
assert(collections.length === 15, `Expected 15 technical collections, got ${collections.length}`);

const seed = seedDemoAssignments();
assert(seed.length === 1, 'Demo assignment seed');
assert(seed[0]!.program.totalWeeks === 4, 'Demo 4 weeks');
assert(seed[0]!.program.daysPerWeek === 3, 'Demo 3 days/week');

const athlete = mockAthletes.find((a) => a.id === 'ath-you')!;
const program = generatePeriodizedProgram({
  athleteId: athlete.id,
  athlete,
  exercises: mockExercises,
  totalWeeks: 4,
  daysPerWeek: 3,
  primaryGoal: 'strength',
});
const w1 = program.weeks.find((w) => w.weekNumber === 1);
assert(Boolean(w1?.days.length === 3), 'Week 1 has 3 days');

const init = initialAssignmentsState();
assert(init.length >= 1, 'initialAssignmentsState returns demo');

const techPool = getExercisePoolForGoal('technique', mockExercises);
assert(
  !techPool.some((e) => e.tags?.includes('four_stops')),
  'Technique pool must exclude four_stops pulls',
);

console.log('smoke-coach-week1: OK');
console.log(`  catalog: ${mockExercises.length} exercises`);
console.log(`  grupo_2: ${grupo2.length}, grupo_4: ${grupo4.length}`);
console.log(`  collections: ${collections.length}`);
