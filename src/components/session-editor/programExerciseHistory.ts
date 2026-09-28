import type {
  Athlete,
  Exercise,
  GeneratedProgram,
  SessionExerciseBlock,
} from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';
import { blockAvgIntensity, blockTotalReps, blockTotalSets, blockTonnage } from './blockMetrics';
import { exerciseName } from './blockMetrics';

export interface ExercisePrescriptionSnapshot {
  weekNumber: number;
  dayNumber: number;
  avgPct: number;
  sets: number;
  reps: number;
  tonnage: number;
  /** Resumen tipo 75%/3 */
  label: string;
  isCurrent: boolean;
}

function blockSignature(block: SessionExerciseBlock): string {
  const kind = normalizeBlockType(block);
  if (kind === 'complex' && block.segments?.length) {
    return `complex:${block.segments.map((s) => s.exerciseId).join('+')}`;
  }
  return `single:${block.exerciseId}`;
}

export function blockMatchesHistoryTarget(
  block: SessionExerciseBlock,
  target: SessionExerciseBlock,
): boolean {
  return blockSignature(block) === blockSignature(target);
}

export function collectExerciseHistory(
  program: GeneratedProgram,
  targetBlock: SessionExerciseBlock,
  athlete: Athlete,
  exercises: Exercise[],
  currentWeek: number,
  currentDay: number,
  maxWeeks = 4,
): ExercisePrescriptionSnapshot[] {
  const rows: ExercisePrescriptionSnapshot[] = [];
  const weeks = [...program.weeks].sort((a, b) => a.weekNumber - b.weekNumber);

  for (const week of weeks) {
    if (week.weekNumber > currentWeek) continue;
    const day = week.days.find((d) => d.dayNumber === currentDay);
    if (!day) continue;
    const match = day.session.exercises.find((b) => blockMatchesHistoryTarget(b, targetBlock));
    if (!match) continue;

    const sets = blockTotalSets(match);
    const reps = blockTotalReps(match);
    const tonnage = blockTonnage(match, athlete, exercises);
    const avgPct = blockAvgIntensity(match);
    const label = avgPct > 0 ? `${avgPct}%/${sets}` : `${sets}×${reps}`;

    rows.push({
      weekNumber: week.weekNumber,
      dayNumber: currentDay,
      avgPct,
      sets,
      reps,
      tonnage,
      label,
      isCurrent: week.weekNumber === currentWeek,
    });
  }

  return rows.slice(-maxWeeks);
}

export function formatInlineHistoryLine(
  snapshots: ExercisePrescriptionSnapshot[],
  isEs: boolean,
): string {
  if (snapshots.length === 0) {
    return isEs ? 'Sin histórico' : 'No history';
  }
  return snapshots
    .filter((s) => !s.isCurrent)
    .slice(-3)
    .map((s) => `Sem${s.weekNumber}: ${s.label}`)
    .join(' · ');
}

export function exerciseDisplayForBlock(block: SessionExerciseBlock, exercises: Exercise[]): string {
  return exerciseName(exercises, block.exerciseId);
}
