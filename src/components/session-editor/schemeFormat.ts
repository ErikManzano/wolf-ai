import type { SessionExerciseBlock, SetScheme } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';
import { formatRestSec } from './setSchemeUtils';

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

/** Una fila legible para coaches: 70%×3×3 */
export function formatSetSchemeDisplayRow(row: SetScheme, isComplex: boolean): string {
  const reps = formatSchemeRepsToken(row, isComplex);
  return `${row.percentage}%×${reps}×${row.sets}`;
}

/** Prescripción legible en cards mobile coach: 70% - 3x3 */
export function formatBlockPrescriptionCoachMobile(block: SessionExerciseBlock): string {
  const isComplex = blockUsesComplexReps(block);
  if (!block.sets.length) return '—';

  const formatRow = (row: SetScheme) => {
    const reps = formatSchemeRepsToken(row, isComplex);
    if (row.percentage > 0) {
      return `${row.percentage}% - ${row.sets}x${reps}`;
    }
    return `${row.sets}x${reps}`;
  };

  if (block.sets.length === 1) return formatRow(block.sets[0]!);
  return block.sets.map(formatRow).join(' · ');
}

/** Una fila en card mobile coach: 70% - 3x3 */
export function formatSetPrescriptionCoachMobile(row: SetScheme, isComplex: boolean): string {
  const reps = formatSchemeRepsToken(row, isComplex);
  if (row.percentage > 0) {
    return `${row.percentage}% - ${row.sets}x${reps}`;
  }
  return `${row.sets}x${reps}`;
}

/** Tab de bloque en editor coach: 70% - 3 - 3 */
export function formatSetSchemeCoachTab(row: SetScheme, isComplex: boolean): string {
  const reps = formatSchemeRepsToken(row, isComplex);
  return `${row.percentage}% - ${row.sets} - ${reps}`;
}

/** Línea principal en resumen de bloque: 70% 3 x 3 */
export function formatSetSchemeCoachOverviewPrimary(row: SetScheme, isComplex: boolean): string {
  const reps = formatSchemeRepsToken(row, isComplex);
  if (row.percentage > 0) {
    return `${row.percentage}% ${row.sets} x ${reps}`;
  }
  return `${row.sets} x ${reps}`;
}

/** Línea secundaria en resumen de bloque: 2 x 3, 2:30 */
export function formatSetSchemeCoachOverviewSecondary(
  row: SetScheme,
  isComplex: boolean,
  restSec: number,
): string {
  const reps = formatSchemeRepsToken(row, isComplex);
  return `${row.sets} x ${reps}, ${formatRestSec(restSec)}`;
}

/** Prescripción legible del bloque, p. ej. 70%×3×3 · 80%×2×3 */
export function formatBlockPrescriptionDisplay(block: SessionExerciseBlock): string {
  const isComplex = blockUsesComplexReps(block);
  if (!block.sets.length) return '—';
  return block.sets.map((row) => formatSetSchemeDisplayRow(row, isComplex)).join(' · ');
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
