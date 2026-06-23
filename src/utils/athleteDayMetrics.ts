import type { Athlete, Exercise, ExerciseGoal, ProgramDay, SessionExerciseBlock } from '../models/training';
import { findCatalogExercise, kgForExercise } from '../components/session-editor/blockMetrics';
import { formatBlockPrescription, blockUsesComplexReps, formatSchemeRepsToken } from '../components/session-editor/schemeFormat';
import { DEFAULT_REST_SEC } from '../components/session-editor/setSchemeUtils';
import { flattenBlockSets } from './athleteSetLogs';

export function dayDisplayTitle(day: ProgramDay, isEs: boolean): string {
  const trimmed = day.label?.trim();
  if (trimmed) return trimmed;
  return isEs ? `Día ${day.dayNumber}` : `Day ${day.dayNumber}`;
}

export function dayGoalBadge(primaryGoal: ExerciseGoal, isEs: boolean): string {
  if (primaryGoal === 'technique') return isEs ? 'Técnica' : 'Technique';
  if (primaryGoal === 'power') return isEs ? 'Potencia' : 'Power';
  return isEs ? 'Fuerza' : 'Strength';
}

export function dayFocusBadge(day: ProgramDay, primaryGoal: ExerciseGoal, isEs: boolean): string {
  const trimmed = day.label?.trim();
  if (
    trimmed &&
    !/^D[ií]a\s+\d+$/i.test(trimmed) &&
    !/^Day\s+\d+$/i.test(trimmed)
  ) {
    return trimmed;
  }
  const goal = dayGoalBadge(primaryGoal, isEs);
  return isEs ? `${goal} técnica` : `${goal} focus`;
}

export function countBlockSets(block: SessionExerciseBlock): number {
  return block.sets.reduce((sum, row) => sum + Math.max(1, row.sets), 0);
}

export function exercisePreviewMeta(block: SessionExerciseBlock, isEs: boolean): string {
  const { setsText, prescription } = exercisePreviewParts(block, isEs);
  if (!prescription) return setsText;
  return `${setsText} • ${prescription}`;
}

export function exercisePreviewParts(
  block: SessionExerciseBlock,
  isEs: boolean,
): { setsText: string; prescription: string } {
  const totalSets = countBlockSets(block);
  const seriesLabel = isEs ? 'series' : 'sets';
  const repsLabel = isEs ? 'reps' : 'reps';

  if (!block.sets.length) {
    return { setsText: isEs ? 'Sin series' : 'No sets', prescription: '' };
  }

  const isComplex = blockUsesComplexReps(block);
  const setsText = `${totalSets} ${seriesLabel}`;

  if (block.sets.length === 1) {
    const row = block.sets[0]!;
    const repsToken = formatSchemeRepsToken(row, isComplex);
    return {
      setsText,
      prescription: `${row.percentage}% · ${repsToken} ${repsLabel}`,
    };
  }

  return {
    setsText,
    prescription: formatBlockPrescription(block),
  };
}

export function estimateSessionDuration(day: ProgramDay): { min: number; max: number } {
  let totalSets = 0;
  let restSum = 0;
  for (const block of day.session.exercises) {
    for (const row of block.sets) {
      const count = Math.max(1, row.sets);
      totalSets += count;
      restSum += (row.restSec ?? DEFAULT_REST_SEC) * count;
    }
  }
  const workMin = totalSets * 2;
  const restMin = Math.round(restSum / 60);
  const min = Math.max(20, workMin + Math.round(restMin * 0.65));
  const max = Math.max(min + 10, workMin + restMin + 10);
  return { min, max };
}

export function formatDurationRange(min: number, max: number, isEs: boolean): string {
  return isEs ? `${min}–${max} min` : `${min}–${max} min`;
}

export function suggestRestRange(day: ProgramDay, isEs: boolean): string {
  const rests: number[] = [];
  for (const block of day.session.exercises) {
    for (const row of block.sets) {
      rests.push(row.restSec ?? DEFAULT_REST_SEC);
    }
  }
  if (!rests.length) return isEs ? '2–3 min' : '2–3 min';
  const minSec = Math.min(...rests);
  const maxSec = Math.max(...rests);
  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (s === 0) return `${m}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  if (minSec === maxSec) return isEs ? `${fmt(minSec)} min` : `${fmt(minSec)} min`;
  return isEs ? `${fmt(minSec)}–${fmt(maxSec)} min` : `${fmt(minSec)}–${fmt(maxSec)} min`;
}

export function blockExerciseTitle(
  block: SessionExerciseBlock,
  exName: (id: string) => string,
): { title: string; isComplex: boolean } {
  const isComplex = blockUsesComplexReps(block);
  const title = isComplex && block.segments?.length
    ? (block.segments ?? []).map((s) => exName(s.exerciseId)).join(' → ')
    : exName(block.exerciseId);
  return { title, isComplex };
}

export function blockTechniqueTag(
  block: SessionExerciseBlock,
  exercises: Exercise[],
  exName: (id: string) => string,
  isEs: boolean,
): string | null {
  const id = block.segments?.[0]?.exerciseId ?? block.exerciseId;
  const ex = findCatalogExercise(exercises, id);
  if (!ex) return null;
  if (ex.goal === 'technique') return isEs ? 'Técnica de tirón' : 'Pull technique';
  if (ex.subtype) return ex.subtype.replace(/_/g, ' ');
  return exName(id);
}

export function blockSummaryStats(
  block: SessionExerciseBlock,
  athlete: Athlete | undefined,
  exercises: Exercise[],
) {
  const first = block.sets[0];
  const totalSets = countBlockSets(block);
  const intensity = first?.percentage ?? 0;
  const targetReps = first?.reps ?? 0;
  const restSec = first?.restSec ?? DEFAULT_REST_SEC;
  const anchorExerciseId = block.segments?.[0]?.exerciseId ?? block.exerciseId;
  const ex = findCatalogExercise(exercises, anchorExerciseId);
  const anchorKg = athlete && ex ? kgForExercise(athlete, ex, intensity) : 0;
  const flat = flattenBlockSets(block, athlete, exercises, () => '');
  return { totalSets, intensity, targetReps, restSec, anchorKg, flat };
}

export function formatRestLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
