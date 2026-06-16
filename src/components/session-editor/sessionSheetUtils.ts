import type { Exercise, SessionExerciseBlock } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';

export function blockDisplayName(block: SessionExerciseBlock, exercises: Exercise[]): string {
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  if (isComplex && block.segments?.length) {
    return block.segments
      .map((s) => exercises.find((e) => e.id === s.exerciseId)?.name ?? s.exerciseId)
      .join(' → ');
  }
  return exercises.find((e) => e.id === block.exerciseId)?.name ?? block.exerciseId;
}

export function formatWeekTonnageLabel(kg: number, isEs: boolean): string {
  if (kg <= 0) return '— kg';
  return `${Math.round(kg).toLocaleString(isEs ? 'es-ES' : 'en-US', {
    maximumFractionDigits: 0,
  })} kg`;
}
