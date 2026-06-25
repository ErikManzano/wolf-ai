import type { Athlete, Exercise, GeneratedProgram, Session, SessionExerciseBlock, SetScheme } from '../models/training';
import { applySessionMetrics, normalizeBlockType, parseRepTokens, roundPercentagePrilepin } from './trainingEngine';

const MIN_REPS_PER_SET = 1;
const MAX_REPS_PER_SET = 25;
const MIN_SETS_PER_SCHEME = 1;
const MAX_SETS_PER_SCHEME = 10;
const MAX_ROWS_PER_BLOCK = 8;
const MAX_BLOCKS_PER_SESSION = 8;
const MIN_COMPLEX_SEGMENTS = 2;
const MAX_COMPLEX_SEGMENTS = 4;

function cloneSession(session: Session): Session {
  return JSON.parse(JSON.stringify(session)) as Session;
}

/** Deriva `reps` total desde segmentReps en bloques complejos */
function syncDerivedReps(s: Session): void {
  for (const b of s.exercises) {
    if (normalizeBlockType(b) === 'complex' && b.segments?.length) {
      if (b.segments.length > MAX_COMPLEX_SEGMENTS) {
        b.segments = b.segments.slice(0, MAX_COMPLEX_SEGMENTS);
      }
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
  if (field === 'targetRir') {
    next.targetRir = Math.min(5, Math.max(0, Math.round(value)));
  }
  if (field === 'restSec') {
    next.restSec = Math.min(600, Math.max(0, Math.round(value)));
  }
  block.sets[setIndex] = next;
  return finalize(s, athlete, catalog);
}

export function updateSetSchemeTextField(
  session: Session,
  blockIndex: number,
  setIndex: number,
  field: 'coachNote',
  value: string,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block?.sets[setIndex]) return session;
  block.sets[setIndex] = { ...block.sets[setIndex], [field]: value };
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
  const current = block.segments ?? [];
  if (current.length >= MAX_COMPLEX_SEGMENTS) return session;
  block.segments = [...current, { exerciseId }];
  const n = block.segments.length;
  for (const scheme of block.sets) {
    const sr = [...(scheme.segmentReps ?? [])];
    while (sr.length < n) sr.push('1');
    scheme.segmentReps = sr;
    scheme.reps = block.segments.reduce((acc, _, i) => acc + parseRepTokens(scheme.segmentReps![i] ?? '0'), 0);
  }
  return finalize(s, athlete, catalog);
}

export function reorderComplexSegments(
  session: Session,
  blockIndex: number,
  fromIndex: number,
  toIndex: number,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block?.segments || fromIndex === toIndex) return session;
  const segs = [...block.segments];
  if (fromIndex < 0 || fromIndex >= segs.length || toIndex < 0 || toIndex >= segs.length) return session;
  const [moved] = segs.splice(fromIndex, 1);
  segs.splice(toIndex, 0, moved!);
  block.segments = segs;
  for (const scheme of block.sets) {
    if (scheme.segmentReps) {
      const sr = [...scheme.segmentReps];
      const [rep] = sr.splice(fromIndex, 1);
      sr.splice(toIndex, 0, rep ?? '1');
      scheme.segmentReps = sr;
    }
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

export type ExerciseBlockKind = 'simple' | 'complex' | 'warmup';

export function getExerciseBlockKind(block: SessionExerciseBlock): ExerciseBlockKind {
  if (block.countsTowardTechnicalNBL === false) return 'warmup';
  if (normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length)) return 'complex';
  return 'simple';
}

/** Simple, complejo o calentamiento (mutuamente excluyentes en la hoja). */
export function setExerciseBlockKind(
  session: Session,
  blockIndex: number,
  kind: ExerciseBlockKind,
  athlete: Athlete,
  catalog: Exercise[],
  defaultSecondExerciseId: string,
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block) return session;
  if (getExerciseBlockKind(block) === kind) return session;

  if (kind === 'warmup') {
    block.countsTowardTechnicalNBL = false;
    return finalize(s, athlete, catalog);
  }

  block.countsTowardTechnicalNBL = true;
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);

  if (kind === 'complex' && !isComplex) {
    block.blockType = 'complex';
    block.segments = [{ exerciseId: block.exerciseId }, { exerciseId: defaultSecondExerciseId }];
    for (const scheme of block.sets) {
      scheme.segmentReps = ['1', '1'];
      scheme.reps = 2;
    }
  } else if (kind === 'simple' && isComplex) {
    block.blockType = 'single';
    delete block.segments;
    for (const scheme of block.sets) {
      delete scheme.segmentReps;
      scheme.reps = Math.max(1, scheme.reps);
    }
  }

  return finalize(s, athlete, catalog);
}

export function duplicateSetAt(
  session: Session,
  blockIndex: number,
  setIndex: number,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block?.sets[setIndex] || block.sets.length >= MAX_ROWS_PER_BLOCK) return session;
  const src = block.sets[setIndex]!;
  const copy: SetScheme = {
    percentage: src.percentage,
    reps: src.reps,
    sets: src.sets,
    targetRir: src.targetRir,
    restSec: src.restSec,
    coachNote: src.coachNote,
    ...(src.segmentReps ? { segmentReps: [...src.segmentReps] } : {}),
  };
  block.sets.splice(setIndex + 1, 0, copy);
  return finalize(s, athlete, catalog);
}

export function applyBlockPercentagePreset(
  session: Session,
  blockIndex: number,
  percentage: number,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block) return session;
  const pct = roundPercentagePrilepin(percentage);
  block.sets = block.sets.map((row) => ({ ...row, percentage: pct }));
  return finalize(s, athlete, catalog);
}

export function addSetToBlock(session: Session, blockIndex: number, athlete: Athlete, catalog: Exercise[]): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block) return session;
  if (block.sets.length >= MAX_ROWS_PER_BLOCK) return session;
  const last = block.sets[block.sets.length - 1] ?? {
    percentage: 75,
    reps: 2,
    sets: 1,
    targetRir: 2,
    restSec: 150,
  };
  const copy: SetScheme = {
    percentage: last.percentage,
    reps: last.reps,
    sets: 1,
    targetRir: last.targetRir ?? 2,
    restSec: last.restSec ?? 150,
    coachNote: last.coachNote,
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

export function reorderSetsInBlock(
  session: Session,
  blockIndex: number,
  fromIndex: number,
  toIndex: number,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block || fromIndex === toIndex) return session;
  const sets = [...block.sets];
  if (fromIndex < 0 || fromIndex >= sets.length || toIndex < 0 || toIndex >= sets.length) return session;
  const [moved] = sets.splice(fromIndex, 1);
  sets.splice(toIndex, 0, moved!);
  block.sets = sets;
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
    sets: [{ percentage: 75, reps: 3, sets: 1, targetRir: 2, restSec: 150 }],
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

export function setExerciseBlockOrder(
  session: Session,
  orderedBlocks: Session['exercises'],
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  s.exercises = orderedBlocks;
  return finalize(s, athlete, catalog);
}

export function removeExerciseBlock(session: Session, blockIndex: number, athlete: Athlete, catalog: Exercise[]): Session {
  const s = cloneSession(session);
  if (blockIndex < 0 || blockIndex >= s.exercises.length) return session;
  s.exercises = s.exercises.filter((_, i) => i !== blockIndex);
  return finalize(s, athlete, catalog);
}

export function duplicateExerciseBlock(
  session: Session,
  blockIndex: number,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block || s.exercises.length >= MAX_BLOCKS_PER_SESSION) return session;
  s.exercises.splice(blockIndex + 1, 0, structuredClone(block));
  return finalize(s, athlete, catalog);
}

/** Actualiza reps de un segmento en todos los bloques de series del complejo. */
export function setSegmentRepForAllSets(
  session: Session,
  blockIndex: number,
  segmentIndex: number,
  value: string,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  const s = cloneSession(session);
  const block = s.exercises[blockIndex];
  if (!block?.segments?.length || normalizeBlockType(block) !== 'complex') return session;
  for (let setIndex = 0; setIndex < block.sets.length; setIndex++) {
    const row = { ...block.sets[setIndex]! };
    const sr = [...(row.segmentReps ?? block.segments.map(() => '1'))];
    sr[segmentIndex] = value;
    row.segmentReps = sr;
    row.reps = block.segments.reduce((acc, _, i) => acc + parseRepTokens(sr[i] ?? '0'), 0);
    block.sets[setIndex] = row;
  }
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

/** Filas extra del bug antiguo o copias accidentales con sets=1 y misma prescripción. */
function isBuggySpreadsheetAddRow(block: SessionExerciseBlock, setIndex: number): boolean {
  if (setIndex <= 0) return false;
  if (normalizeBlockType(block) === 'complex') return false;
  const prev = block.sets[setIndex - 1];
  const curr = block.sets[setIndex];
  if (!prev || !curr) return false;
  const samePrescription =
    curr.percentage === prev.percentage &&
    curr.reps === prev.reps &&
    (curr.restSec ?? 150) === (prev.restSec ?? 150) &&
    (curr.targetRir ?? 2) === (prev.targetRir ?? 2) &&
    !curr.segmentReps &&
    !prev.segmentReps &&
    !curr.coachNote &&
    !prev.coachNote;
  if (!samePrescription) return false;
  // Bug «Agregar fila»: copia con sets=1 aunque la fila anterior tuviera más series.
  if (curr.sets === 1) return true;
  // Copia idéntica accidental (duplicar fila sin cambiar nada).
  return curr.sets === prev.sets;
}

export function sessionNeedsSpreadsheetRepair(session: Session): boolean {
  return session.exercises.some(
    (block) =>
      normalizeBlockType(block) !== 'complex' &&
      block.sets.some((_, setIndex) => isBuggySpreadsheetAddRow(block, setIndex)),
  );
}

/**
 * Convierte en bloques/ejercicios separados las filas que el bug de «Agregar fila»
 * añadía al último ejercicio (esquemas duplicados con sets=1).
 */
export function repairBuggySpreadsheetRows(
  session: Session,
  athlete: Athlete,
  catalog: Exercise[],
): Session {
  if (!sessionNeedsSpreadsheetRepair(session)) return session;

  const newExercises: SessionExerciseBlock[] = [];

  for (const block of session.exercises) {
    if (normalizeBlockType(block) === 'complex' || block.sets.length <= 1) {
      newExercises.push(block);
      continue;
    }

    const kept: SetScheme[] = [block.sets[0]!];
    const toSplit: SetScheme[] = [];

    for (let i = 1; i < block.sets.length; i++) {
      const scheme = block.sets[i]!;
      if (isBuggySpreadsheetAddRow(block, i)) {
        toSplit.push(scheme);
      } else {
        kept.push(scheme);
      }
    }

    if (toSplit.length === 0) {
      newExercises.push(block);
      continue;
    }

    newExercises.push({ ...block, sets: [...kept] });

    for (const scheme of toSplit) {
      if (newExercises.length >= MAX_BLOCKS_PER_SESSION) {
        const last = newExercises[newExercises.length - 1]!;
        last.sets = [...last.sets, { ...scheme }];
        continue;
      }
      newExercises.push({
        exerciseId: block.exerciseId,
        blockType: 'single',
        sets: [{ ...scheme }],
        countsTowardTechnicalNBL: block.countsTowardTechnicalNBL,
      });
    }
  }

  const s = cloneSession(session);
  s.exercises = newExercises;
  return finalize(s, athlete, catalog);
}

export const WL_SESSION_LIMITS = {
  MIN_REPS_PER_SET,
  MAX_REPS_PER_SET,
  MIN_SETS_PER_SCHEME,
  MAX_SETS_PER_SCHEME,
  MAX_ROWS_PER_BLOCK,
  MAX_BLOCKS_PER_SESSION,
  MIN_COMPLEX_SEGMENTS,
  MAX_COMPLEX_SEGMENTS,
} as const;
