import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import {
  calcularCargaTotal,
  calcularCargaTotalBlocks,
  exercisesForTechnicalNBL,
} from '../../services/trainingEngine';
import { blockDisplayName } from './sessionSheetUtils';
import type { ExerciseVolumeSlice } from './sessionSummaryMetrics';

/**
 * Canonical tonnage for stats dashboards: working / NBL technical load only
 * (excludes blocks with countsTowardTechnicalNBL === false).
 */
export function statsSessionTonnage(
  session: Session,
  athlete: Athlete,
  exercises: Exercise[],
): number {
  return Math.round(calcularCargaTotal(session, athlete, exercises));
}

export function statsBlockTonnage(
  block: SessionExerciseBlock,
  athlete: Athlete,
  exercises: Exercise[],
): number {
  if (block.countsTowardTechnicalNBL === false) return 0;
  return Math.round(calcularCargaTotalBlocks([block], athlete, exercises));
}

export function statsWorkBlocks(session: Session): SessionExerciseBlock[] {
  return exercisesForTechnicalNBL(session);
}

/** Exercise volume ranking using the same NBL tonnage rule as KPIs. */
export function statsExerciseVolumes(
  blocks: SessionExerciseBlock[],
  athlete: Athlete,
  exercises: Exercise[],
  maxSlices = 6,
): ExerciseVolumeSlice[] {
  const workBlocks = blocks.filter((b) => b.countsTowardTechnicalNBL !== false);
  const slices = workBlocks
    .map((block) => ({
      label: blockDisplayName(block, exercises),
      tonnage: statsBlockTonnage(block, athlete, exercises),
    }))
    .filter((row) => row.tonnage > 0)
    .sort((a, b) => b.tonnage - a.tonnage);

  const total = slices.reduce((sum, row) => sum + row.tonnage, 0);
  if (total <= 0) return [];

  return slices.slice(0, maxSlices).map((row) => ({
    ...row,
    pct: Math.round((row.tonnage / total) * 100),
  }));
}

export function formatStatsKg(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return '—';
  if (kg >= 1000) {
    const k = kg / 1000;
    return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k kg`;
  }
  return `${Math.round(kg).toLocaleString()} kg`;
}
