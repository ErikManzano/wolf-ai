import type { SessionExerciseBlock, SetScheme } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';

export function blockUsesComplexReps(block: SessionExerciseBlock): boolean {
  if (normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length)) return true;
  return block.sets.some((scheme) => (scheme.segmentReps?.filter((t) => t.trim()).length ?? 0) >= 2);
}

/** Reps de una fila: "7" en simple, "1+1" / "2+1" en complejo. */
export function formatSchemeRepsToken(row: SetScheme, isComplex: boolean): string {
  const segmentCount = row.segmentReps?.filter((t) => t.trim()).length ?? 0;
  const useSegments = isComplex || segmentCount >= 2;
  if (useSegments && row.segmentReps?.length) {
    return row.segmentReps.map((t) => t.trim() || '0').join('+');
  }
  return String(row.reps);
}

/** Una fila: (85%/2)4 o 85%/2 si es 1 serie */
export function formatSetSchemeRow(row: SetScheme, isComplex: boolean): string {
  const reps = formatSchemeRepsToken(row, isComplex);

  if (row.sets > 1) {
    return `(${row.percentage}%/${reps})${row.sets}`;
  }
  return `${row.percentage}%/${reps}`;
}

/** Rx de una sola fila atleta (cada fila = una série) — % y reps, sin ×series. */
export function formatAthleteSetRxLabel(row: SetScheme, isComplex: boolean): string {
  return `${row.percentage}%/${formatSchemeRepsToken(row, isComplex)}`;
}

/** Prescripción completa del bloque, p. ej. 60%/2,70%/2,(85%/2)2 */
export function formatBlockPrescription(block: SessionExerciseBlock): string {
  const isComplex = blockUsesComplexReps(block);
  if (!block.sets.length) return '—';
  return block.sets.map((row) => formatSetSchemeRow(row, isComplex)).join(',');
}

export function blockWorkSets(block: SessionExerciseBlock): number {
  return block.sets.reduce((a, r) => a + r.sets, 0);
}
