import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import { normalizeBlockType, parseRepTokens, repsPerRoundForScheme, resolveBaseOneRm } from '../../services/trainingEngine';
export function exerciseName(exercises: Exercise[], id: string): string {
  return findCatalogExercise(exercises, id)?.name ?? id;
}

/** Resolve motor/catalog exercise by id (exact, case-insensitive id, or name). */
export function findCatalogExercise(exercises: Exercise[], exerciseId: string): Exercise | undefined {
  const trimmed = exerciseId.trim();
  if (!trimmed) return undefined;
  const direct = exercises.find((e) => e.id === trimmed);
  if (direct) return direct;
  const lower = trimmed.toLowerCase();
  return exercises.find(
    (e) => e.id.toLowerCase() === lower || e.name.toLowerCase() === lower,
  );
}

export function formatAthleteKg(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return '—';
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1);
}

export function matchExerciseQuery(query: string, name: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const n = name.toLowerCase();
  if (n.includes(q)) return true;
  const words = n.split(/[\s()-]+/).filter(Boolean);
  const acronym = words.map((w) => w[0]).join('');
  if (acronym.includes(q) || acronym.startsWith(q)) return true;
  let qi = 0;
  for (const w of words) {
    if (qi < q.length && w.startsWith(q[qi]!)) qi += 1;
    else if (w.includes(q[qi] ?? '')) qi += 1;
  }
  return qi >= q.length && q.length > 0;
}

export function filterExercises(exercises: Exercise[], query: string, limit = 8): Exercise[] {
  const q = query.trim();
  if (!q) return exercises.slice(0, limit);
  return exercises.filter((e) => matchExerciseQuery(q, e.name)).slice(0, limit);
}

export function kgForExercise(athlete: Athlete, ex: Exercise, pct: number): number {
  return Math.round((pct / 100) * resolveBaseOneRm(ex, athlete) * 10) / 10;
}

export function blockTonnage(block: SessionExerciseBlock, athlete: Athlete, exercises: Exercise[]): number {
  let total = 0;
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  if (isComplex && block.segments?.length) {
    for (const row of block.sets) {
      const rounds = row.sets;
      for (let si = 0; si < block.segments.length; si++) {
        const seg = block.segments[si];
        if (!seg) continue;
        const ex = findCatalogExercise(exercises, seg.exerciseId);
        if (!ex) continue;
        const kg = (row.percentage / 100) * resolveBaseOneRm(ex, athlete);
        const reps = parseRepTokens(row.segmentReps?.[si] ?? '0');
        total += kg * reps * rounds;
      }
    }
    return Math.round(total);
  }
  const ex = findCatalogExercise(exercises, block.exerciseId);
  if (!ex) return 0;
  const oneRm = resolveBaseOneRm(ex, athlete);
  for (const row of block.sets) {
    total += (row.percentage / 100) * oneRm * row.reps * row.sets;
  }
  return Math.round(total);
}

export function blockAvgIntensity(block: SessionExerciseBlock): number {
  if (!block.sets.length) return 0;
  let weighted = 0;
  let sets = 0;
  for (const row of block.sets) {
    weighted += row.percentage * row.sets;
    sets += row.sets;
  }
  return sets ? Math.round((weighted / sets) * 10) / 10 : 0;
}

export function blockTotalSets(block: SessionExerciseBlock): number {
  return block.sets.reduce((a, r) => a + r.sets, 0);
}

/** Total de repeticiones prescritas en el bloque (todas las filas × series). */
export function blockTotalReps(block: SessionExerciseBlock): number {
  let total = 0;
  for (const scheme of block.sets) {
    total += repsPerRoundForScheme(block, scheme) * scheme.sets;
  }
  return Math.round(total);
}

/** Tonelaje estimado de una fila de series en un bloque complejo. */
export function complexSetRowTonnage(
  block: SessionExerciseBlock,
  row: SessionExerciseBlock['sets'][number],
  athlete: Athlete,
  exercises: Exercise[],
): number {
  if (!block.segments?.length) return 0;
  let total = 0;
  for (let si = 0; si < block.segments.length; si++) {
    const seg = block.segments[si];
    if (!seg) continue;
    const ex = findCatalogExercise(exercises, seg.exerciseId);
    if (!ex) continue;
    const kg = (row.percentage / 100) * resolveBaseOneRm(ex, athlete);
    const reps = parseRepTokens(row.segmentReps?.[si] ?? '0');
    total += kg * reps * row.sets;
  }
  return Math.round(total * 10) / 10;
}

/** Repeticiones totales de una fila de series (ronda × series). */
export function complexSetRowTotalReps(block: SessionExerciseBlock, row: SessionExerciseBlock['sets'][number]): number {
  return repsPerRoundForScheme(block, row) * row.sets;
}

export function sessionTotalReps(blocks: SessionExerciseBlock[]): number {
  return blocks.reduce((sum, block) => sum + blockTotalReps(block), 0);
}

export function sessionTotalSets(blocks: SessionExerciseBlock[]): number {
  return blocks.reduce((sum, block) => sum + blockTotalSets(block), 0);
}

export function sessionTonnage(session: Session, athlete: Athlete, exercises: Exercise[]): number {
  return session.exercises.reduce((sum, block) => sum + blockTonnage(block, athlete, exercises), 0);
}

export function sessionAvgIntensity(blocks: SessionExerciseBlock[]): number {
  if (!blocks.length) return 0;
  let weighted = 0;
  let sets = 0;
  for (const block of blocks) {
    for (const row of block.sets) {
      weighted += row.percentage * row.sets;
      sets += row.sets;
    }
  }
  return sets > 0 ? Math.round(weighted / sets) : 0;
}

export function estimateBlockMinutes(block: SessionExerciseBlock): number {
  const workSets = blockTotalSets(block);
  return Math.max(1, Math.round(workSets * 2));
}

export function estimateSessionMinutes(session: Session): number {
  return session.exercises.reduce((a, b) => a + estimateBlockMinutes(b), 0);
}

export function sequenceLabel(block: SessionExerciseBlock, exercises: Exercise[]): string {
  if (normalizeBlockType(block) === 'complex' && block.segments?.length) {
    return block.segments.map((s) => exerciseName(exercises, s.exerciseId)).join(' → ');
  }
  return exerciseName(exercises, block.exerciseId);
}

export const PCT_PRESETS = [70, 75, 80, 85, 90] as const;
