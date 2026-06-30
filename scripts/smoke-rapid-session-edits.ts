/**
 * Smoke: rapid consecutive session edits (add blocks) keep all exercises.
 * Run: npx tsx scripts/smoke-rapid-session-edits.ts
 */
import { mockAthletes, mockExercises } from '../src/data/loadMockData';
import { buildSessionFromBlocks } from '../src/services/sessionGenerator';
import { addExerciseBlock, replaceProgramSession } from '../src/services/sessionMutations';
import { generatePeriodizedProgram } from '../src/services/programGenerator';
import { countBlocksInProgramDay } from '../src/components/wl-programs/programSync';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const athlete = mockAthletes[0]!;
const exercises = mockExercises;

const baseSession = buildSessionFromBlocks(athlete.id, [], athlete, exercises);
const sessionRef = { current: baseSession };

const apply = (fn: (current: typeof baseSession) => typeof baseSession) => {
  sessionRef.current = fn(sessionRef.current);
};

const ids = ['ex-001', 'ex-008', 'ex-022', 'ex-028', 'ex-033'];
for (const id of ids) {
  apply((current) => addExerciseBlock(current, id, athlete, exercises));
}

assert(sessionRef.current.exercises.length === ids.length, `expected ${ids.length} blocks`);
assert(
  sessionRef.current.exercises.every((b, i) => b.exerciseId === ids[i]),
  'block order / ids mismatch after rapid adds',
);

const program = generatePeriodizedProgram({
  athleteId: athlete.id,
  athlete,
  exercises,
  totalWeeks: 1,
  daysPerWeek: 1,
  primaryGoal: 'strength',
});

let nextProgram = program;
for (const id of ids) {
  const daySession = nextProgram.weeks[0]!.days[0]!.session;
  const updated = addExerciseBlock(daySession, id, athlete, exercises);
  nextProgram = replaceProgramSession(nextProgram, 1, 1, updated);
}

const finalCount = countBlocksInProgramDay(nextProgram, 1, 1);
assert(
  finalCount === program.weeks[0]!.days[0]!.session.exercises.length + ids.length,
  `program integration expected ${program.weeks[0]!.days[0]!.session.exercises.length + ids.length} blocks, got ${finalCount}`,
);

console.log('smoke-rapid-session-edits: OK');
console.log(`  rapid apply: ${ids.length} blocks`);
console.log(`  program day blocks: ${finalCount}`);
