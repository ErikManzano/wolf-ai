import type { Athlete, Exercise, GeneratedProgram, Session, SessionExerciseBlock, SetScheme } from '../models/training';
import { applySessionMetrics, normalizeBlockType, parseRepTokens, roundPercentagePrilepin } from './trainingEngine';

const MIN_REPS_PER_SET = 1;
const MAX_REPS_PER_SET = 8;
const MIN_SETS_PER_SCHEME = 1;
const MAX_SETS_PER_SCHEME = 10;
const MAX_ROWS_PER_BLOCK = 8;
const MAX_BLOCKS_PER_SESSION = 8;

function cloneSession(session: Session): Session {
  return JSON.parse(JSON.stringify(session)) as Session;
}

/** Deriva `reps` total desde segmentReps en bloques complejos */
function syncDerivedReps(s: Session): void {
  for (const b of s.exercises) {
    if (normalizeBlockType(b) === 'complex' && b.segments?.length) {
      for (const scheme of b.sets) {
        if (!scheme.segmentReps || scheme.segmentReps.length < b.segments.length) {
          scheme.segmentReps = b.segments.map((_, i) => scheme.segmentReps?.[i] ?? '1');
        }
        scheme.reps = b.segments.reduce((acc, _, i) => acc + parseRepTokens(scheme.segmentReps![i] ?? '0'), 0);
      }
    }
  }
}

function finalize(session: Session, athlete: Athlete, catalog: Exercise[]): Session {
  syncDerivedReps(session);
  return applySessionMetrics(session, athlete, catalog);
}

export function updateSetSchemeField(
  session: Session,
  blockIndex: number,
  setIndex: number,
  field: keyof SetScheme,
  value: number,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block?.sets[setIndex]) return session;
  const next = { ...block.sets[setIndex], [field]: value } as SetScheme;
  if (field === 'sets' || field === 'reps') {
    const n = Math.round(value);
    if (field === 'reps') next.reps = Math.min(MAX_REPS_PER_SET, Math.max(MIN_REPS_PER_SET, n));
    else next.sets = Math.min(MAX_SETS_PER_SCHEME, Math.max(MIN_SETS_PER_SCHEME, n));
  }
  if (field === 'percentage') {
    next.percentage = roundPercentagePrilepin(value);
  }
  block.sets[setIndex] = next;
  return finalize(s, athlete, catalog);
}

export function updateSegmentRepAt(
  session: Session,
  blockIndex: number,
  setIndex: number,
  segmentIndex: number,
  value: string,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block?.sets[setIndex] || normalizeBlockType(block) !== 'complex' || !block.segments?.length) return session;
  const row = { ...block.sets[setIndex] };
  const sr = [...(row.segmentReps ?? block.segments.map(() => '1'))];
  sr[segmentIndex] = value;
  row.segmentReps = sr;
  row.reps = block.segments.reduce((acc, _, i) => acc + parseRepTokens(sr[i] ?? '0'), 0);
  block.sets[setIndex] = row;
  return finalize(s, athlete, catalog);
}

export function setSegmentExercise(
  session: Session,
  blockIndex: number,
  segmentIndex: number,
  exerciseId: string,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block?.segments?.[segmentIndex]) return session;
  block.segments[segmentIndex] = { ...block.segments[segmentIndex], exerciseId };
  return finalize(s, athlete, catalog);
}

export function addComplexSegment(
  session: Session,
  blockIndex: number,
  exerciseId: string,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block || normalizeBlockType(block) !== 'complex') return session;
  block.segments = [...(block.segments ?? []), { exerciseId }];
  const n = block.segments.length;
  for (const scheme of block.sets) {
    const sr = [...(scheme.segmentReps ?? [])];
    while (sr.length < n) sr.push('1');
    scheme.segmentReps = sr;
    scheme.reps = block.segments.reduce((acc, _, i) => acc + parseRepTokens(scheme.segmentReps![i] ?? '0'), 0);
  }
  return finalize(s, athlete, catalog);
}

export function removeComplexSegment(session: Session, blockIndex: number, segmentIndex: number, athlete: Athlete, catalog: Exercise[]): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block?.segments || block.segments.length <= 2) return session;
  block.segments = block.segments.filter((_, i) => i !== segmentIndex);
  for (const scheme of block.sets) {
    if (scheme.segmentReps) {
      scheme.segmentReps = scheme.segmentReps.filter((_, i) => i !== segmentIndex);
    }
  }
  return finalize(s, athlete, catalog);
}

/** Convierte entre bloque simple y complejo (≥2 movimientos). */
export function toggleBlockComplex(
  session: Session,
  blockIndex: number,
  athlete: Athlete,
  catalog: Exercise[],
  defaultSecondExerciseId: string,
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block) return session;

  if (normalizeBlockType(block) === 'complex') {
    block.blockType = 'single';
    delete block.segments;
    for (const scheme of block.sets) {
      delete scheme.segmentReps;
      scheme.reps = Math.max(1, scheme.reps);
    }
  } else {
    block.blockType = 'complex';
    block.segments = [{ exerciseId: block.exerciseId }, { exerciseId: defaultSecondExerciseId }];
    for (const scheme of block.sets) {
      scheme.segmentReps = ['1', '1'];
      scheme.reps = 2;
    }
  }
  return finalize(s, athlete, catalog);
}

export function addSetToBlock(session: Session, blockIndex: number, athlete: Athlete, catalog: Exercise[]): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block) return session;
  if (block.sets.length >= MAX_ROWS_PER_BLOCK) return session;
  const last = block.sets[block.sets.length - 1] ?? { percentage: 75, reps: 2, sets: 3 };
  const copy: SetScheme = {
    percentage: last.percentage,
    reps: last.reps,
    sets: last.sets,
    ...(last.segmentReps ? { segmentReps: [...last.segmentReps] } : {}),
  };
  block.sets.push(copy);
  return finalize(s, athlete, catalog);
}

export function removeSetFromBlock(
  session: Session,
  blockIndex: number,
  setIndex: number,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block || block.sets.length <= 1) return session;
  block.sets = block.sets.filter((_, i) => i !== setIndex);
  return finalize(s, athlete, catalog);
}

/** `countsTowardTechnicalNBL === false` marca calentamiento (excluye NBL, carga de trabajo y K). */
export function setBlockCountsTowardTechnicalNBL(
  session: Session,
  blockIndex: number,
  countsTowardTechnicalNBL: boolean,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block) return session;
  block.countsTowardTechnicalNBL = countsTowardTechnicalNBL;
  return finalize(s, athlete, catalog);
}

export function setBlockExercise(
  session: Session,
  blockIndex: number,
  exerciseId: string,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block) return session;
  block.exerciseId = exerciseId;
  if (normalizeBlockType(block) === 'complex' && block.segments?.[0]) {
    block.segments[0] = { ...block.segments[0], exerciseId };
  }
  return finalize(s, athlete, catalog);
}

export function addExerciseBlock(
  session: Session,
  exerciseId: string,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  if (s.exercises.length >= MAX_BLOCKS_PER_SESSION) return session;
  const nb: SessionExerciseBlock = {
    exerciseId,
    blockType: 'single',
    sets: [{ percentage: 75, reps: 2, sets: 3 }],
  };
  s.exercises.push(nb);
  return finalize(s, athlete, catalog);
}

export function moveExerciseBlock(
  session: Session,
  fromIndex: number,
  toIndex: number,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const arr = [...s.exercises];
  if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) return session;
  const [item] = arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, item!);
  s.exercises = arr;
  return finalize(s, athlete, catalog);
}

export function removeExerciseBlock(session: Session, blockIndex: number, athlete: Athlete, catalog: Exercise[]): Session {
  const s = cloneSession(session);
  if (s.exercises.length <= 1) return session;
  s.exercises = s.exercises.filter((_, i) => i !== blockIndex);
  return finalize(s, athlete, catalog);
}

export function refreshSession(session: Session, athlete: Athlete, catalog: Exercise[]): Session {
  return finalize(cloneSession(session), athlete, catalog);
}

export function replaceProgramSession(
  program: GeneratedProgram,
  weekNumber: number,
  dayNumber: number,
  session: Session,
): GeneratedProgram {
  const next = JSON.parse(JSON.stringify(program)) as GeneratedProgram;
  const w = next.weeks.find((x) => x.weekNumber === weekNumber);
  const d = w?.days.find((x) => x.dayNumber === dayNumber);
  if (d) d.session = session;
  return next;
}

export const WL_SESSION_LIMITS = {
  MIN_REPS_PER_SET,
  MAX_REPS_PER_SET,
  MIN_SETS_PER_SCHEME,
  MAX_SETS_PER_SCHEME,
  MAX_ROWS_PER_BLOCK,
  MAX_BLOCKS_PER_SESSION,
} as const;
