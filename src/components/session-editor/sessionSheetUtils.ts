import type { Exercise, SessionExerciseBlock } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';
import { exerciseName, findCatalogExercise } from './blockMetrics';

function missingExerciseLabel(isEs: boolean): string {
  return isEs ? 'Sin ejercicio' : 'No exercise';
}

function segmentExerciseLabel(exercises: Exercise[], exerciseId: string, isEs: boolean): string {
  const trimmed = exerciseId.trim();
  if (!trimmed) return missingExerciseLabel(isEs);
  const catalog = findCatalogExercise(exercises, trimmed);
  const name = catalog?.name?.trim() || exerciseName(exercises, trimmed).trim();
  if (!name || name === trimmed && !catalog) return trimmed;
  return name;
}

export function blockDisplayName(
  block: SessionExerciseBlock,
  exercises: Exercise[],
  isEs = false,
): string {
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  if (isComplex && block.segments?.length) {
    return block.segments
      .map((s) => segmentExerciseLabel(exercises, s.exerciseId, isEs))
      .join(' → ');
  }
  return segmentExerciseLabel(exercises, block.exerciseId, isEs);
}

export function blockHasExercise(block: SessionExerciseBlock): boolean {
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  if (isComplex && block.segments?.length) {
    return block.segments.some((s) => Boolean(s.exerciseId?.trim()));
  }
  return Boolean(block.exerciseId?.trim());
}

export function formatWeekTonnageLabel(kg: number, isEs: boolean): string {
  if (kg <= 0) return '— kg';
  return `${Math.round(kg).toLocaleString(isEs ? 'es-ES' : 'en-US', {
    maximumFractionDigits: 0,
  })} kg`;
}
