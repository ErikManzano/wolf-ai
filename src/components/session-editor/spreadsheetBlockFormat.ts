import type { SessionExerciseBlock } from '../../models/training';
import { blockTotalReps } from './blockMetrics';

/** Reps totales prescritas en el bloque (sin desglose de complejo). */
export function formatBlockRepsSummary(block: SessionExerciseBlock): string {
  return String(blockTotalReps(block));
}
