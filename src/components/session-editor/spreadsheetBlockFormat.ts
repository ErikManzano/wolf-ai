import type { SessionExerciseBlock } from '../../models/training';
import { blockTotalReps } from './blockMetrics';
import { blockUsesComplexReps, formatSchemeRepsToken } from './schemeFormat';

/** Reps totales prescritas en el bloque (sin desglose de complejo). */
export function formatBlockRepsSummary(block: SessionExerciseBlock): string {
  return String(blockTotalReps(block));
}

/** Valor en columna Reps de la hoja: notación 1+1 en complejo cuando aplica. */
export function formatBlockRepsMetricDisplay(block: SessionExerciseBlock): {
  value: string;
  totalReps: number;
  complexNotation: boolean;
} {
  const totalReps = blockTotalReps(block);
  if (!blockUsesComplexReps(block) || !block.sets.length) {
    return { value: String(totalReps), totalReps, complexNotation: false };
  }

  const tokens = block.sets.map((row) => formatSchemeRepsToken(row, true));
  const singlePattern = new Set(tokens).size === 1;

  if (singlePattern && block.sets.length === 1) {
    const row = block.sets[0]!;
    const token = tokens[0]!;
    const value = row.sets > 1 ? `${token}×${row.sets}` : token;
    return { value, totalReps, complexNotation: true };
  }

  if (singlePattern && block.sets.length > 1) {
    const token = tokens[0]!;
    return { value: token, totalReps, complexNotation: true };
  }

  return { value: String(totalReps), totalReps, complexNotation: false };
}
