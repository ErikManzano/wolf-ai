import type { Athlete, Exercise, SessionExerciseBlock } from '../../models/training';
import { blockTonnage, blockTotalSets } from './blockMetrics';
import { purposeForScheme, purposeLabel, type SetPurpose } from './spreadsheetPurposeUtils';
import { blockDisplayName } from './sessionSheetUtils';

export interface SessionPurposeBreakdown {
  technique: number;
  work: number;
  intensity: number;
  total: number;
}

export interface ExerciseVolumeSlice {
  label: string;
  tonnage: number;
  pct: number;
}

export function sessionPurposeBreakdown(blocks: SessionExerciseBlock[]): SessionPurposeBreakdown {
  const counts: Record<SetPurpose, number> = { technique: 0, work: 0, intensity: 0 };
  for (const block of blocks) {
    for (const row of block.sets) {
      const purpose = purposeForScheme(row);
      counts[purpose] += row.sets;
    }
  }
  const total = counts.technique + counts.work + counts.intensity;
  return { ...counts, total };
}

export function purposePct(breakdown: SessionPurposeBreakdown, purpose: SetPurpose): number {
  if (breakdown.total <= 0) return 0;
  return Math.round((breakdown[purpose] / breakdown.total) * 100);
}

export { purposeLabel };
export type { SetPurpose };

export function sessionExerciseVolumes(
  blocks: SessionExerciseBlock[],
  athlete: Athlete,
  exercises: Exercise[],
  maxSlices = 4,
): ExerciseVolumeSlice[] {
  const slices = blocks
    .map((block) => ({
      label: blockDisplayName(block, exercises),
      tonnage: blockTonnage(block, athlete, exercises),
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

export function sessionWorkExerciseCount(blocks: SessionExerciseBlock[]): number {
  return blocks.filter((block) => block.countsTowardTechnicalNBL !== false).length;
}

export function sessionWarmupSetCount(blocks: SessionExerciseBlock[]): number {
  return blocks
    .filter((block) => block.countsTowardTechnicalNBL === false)
    .reduce((sum, block) => sum + blockTotalSets(block), 0);
}
