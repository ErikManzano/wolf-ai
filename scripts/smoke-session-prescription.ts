/**
 * Smoke: esquema de series ↔ hoja ↔ resumen (singles + complejos).
 * Run: npx tsx scripts/smoke-session-prescription.ts
 */
import { mockAthletes, mockExercises } from '../src/data/loadMockData';
import { blockTotalReps, blockTotalSets } from '../src/components/session-editor/blockMetrics';
import { formatBlockPrescription } from '../src/components/session-editor/schemeFormat';
import { buildSessionFromBlocks } from '../src/services/sessionGenerator';
import {
  duplicateSetAt,
  replaceProgramSession,
  updateSegmentRepAt,
  updateSetSchemeField,
} from '../src/services/sessionMutations';
import { generatePeriodizedProgram } from '../src/services/programGenerator';
import type { SessionExerciseBlock } from '../src/models/training';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const athlete = mockAthletes[0]!;
const exercises = mockExercises;

const singleBlock: SessionExerciseBlock = {
  exerciseId: 'ex-001',
  sets: [
    { percentage: 84, reps: 2, sets: 5, restSec: 150 },
    { percentage: 84, reps: 2, sets: 1, restSec: 150 },
    { percentage: 84, reps: 2, sets: 1, restSec: 150 },
  ],
};

assert(formatBlockPrescription(singleBlock) === '(84%/2)5,84%/2,84%/2', 'Sheet rx for singles');
assert(blockTotalReps(singleBlock) === 14, `Total reps singles = 14, got ${blockTotalReps(singleBlock)}`);
assert(blockTotalSets(singleBlock) === 7, `Total work sets = 7, got ${blockTotalSets(singleBlock)}`);

let session = buildSessionFromBlocks(athlete.id, [singleBlock], athlete, exercises);
session = updateSetSchemeField(session, 0, 0, 'sets', 3, athlete, exercises);
assert(session.exercises[0]!.sets[0]!.sets === 3, 'updateSetSchemeField sets');
assert(blockTotalReps(session.exercises[0]!) === 10, `After 3×2 + 2 + 2 = 10 reps, got ${blockTotalReps(session.exercises[0]!)}`);

session = duplicateSetAt(session, 0, 1, athlete, exercises);
assert(session.exercises[0]!.sets.length === 4, 'duplicateSetAt adds row');
assert(session.exercises[0]!.sets[2]!.sets === 1, 'duplicate copies sets count');

const complexBlock: SessionExerciseBlock = {
  exerciseId: 'ex-001',
  blockType: 'complex',
  segments: [{ exerciseId: 'ex-001' }, { exerciseId: 'ex-022' }],
  sets: [{ percentage: 84, reps: 2, sets: 3, segmentReps: ['1', '1'], restSec: 150 }],
};

assert(formatBlockPrescription(complexBlock) === '(84%/1+1)3', 'Sheet rx for complex');
assert(blockTotalReps(complexBlock) === 6, `Complex reps = 6, got ${blockTotalReps(complexBlock)}`);

let complexSession = buildSessionFromBlocks(athlete.id, [complexBlock], athlete, exercises);
complexSession = updateSegmentRepAt(complexSession, 0, 0, 0, '2', athlete, exercises);
assert(complexSession.exercises[0]!.sets[0]!.segmentReps?.[0] === '2', 'segment rep update');
assert(blockTotalReps(complexSession.exercises[0]!) === 9, `Complex after 2+1 ×3 = 9, got ${blockTotalReps(complexSession.exercises[0]!)}`);

const program = generatePeriodizedProgram({
  athleteId: athlete.id,
  athlete,
  exercises,
  totalWeeks: 1,
  daysPerWeek: 1,
  primaryGoal: 'strength',
});
const daySession = program.weeks[0]!.days[0]!.session;
const nextProgram = replaceProgramSession(program, 1, 1, complexSession);
assert(
  nextProgram.weeks[0]!.days[0]!.session.exercises[0]!.sets[0]!.segmentReps?.[0] === '2',
  'replaceProgramSession persists segmentReps',
);
assert(daySession.exercises.length >= 1, 'generated session has blocks');

console.log('smoke-session-prescription: OK');
console.log(`  single rx: ${formatBlockPrescription(singleBlock)}`);
console.log(`  complex rx: ${formatBlockPrescription(complexBlock)}`);
