import type { SessionExerciseBlock, SetScheme } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';

/** Una fila: (85%/2)4 o 85%/2 si es 1 serie */
export function formatSetSchemeRow(row: SetScheme, isComplex: boolean): string {
  const reps =
    isComplex && row.segmentReps?.length
      ? row.segmentReps.map((t) => t.trim() || '0').join('+')
      : String(row.reps);

  if (row.sets > 1) {
    return `(${row.percentage}%/${reps})${row.sets}`;
  }
  return `${row.percentage}%/${reps}`;
}

/** Rx de una sola fila atleta (cada fila = una série) — % y reps, sin ×series. */
export function formatAthleteSetRxLabel(row: SetScheme, isComplex: boolean): string {
  const reps =
    isComplex && row.segmentReps?.length
      ? row.segmentReps.map((t) => t.trim() || '0').join('+')
      : String(row.reps);
  return `${row.percentage}%/${reps}`;
}

/** Prescripción completa del bloque, p. ej. 60%/2,70%/2,(85%/2)2 */
export function formatBlockPrescription(block: SessionExerciseBlock): string {
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  if (!block.sets.length) return '—';
  return block.sets.map((row) => formatSetSchemeRow(row, isComplex)).join(',');
}

export function blockWorkSets(block: SessionExerciseBlock): number {
  return block.sets.reduce((a, r) => a + r.sets, 0);
}
