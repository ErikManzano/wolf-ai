import type { Athlete, Exercise, Session } from '../../models/training';
import { calcularCargaTotal } from '../../services/trainingEngine';
import {
  estimateSessionMinutes,
  sessionAvgIntensity,
  sessionTotalReps,
  sessionTotalSets,
  sessionTonnage,
} from './blockMetrics';
import { sessionExerciseVolumes, sessionPurposeBreakdown } from './sessionSummaryMetrics';
import type { ProgramWeek } from '../../models/training';

export interface WeekDayMetricRow {
  dayNumber: number;
  label: string;
  tonnage: number;
  sets: number;
  reps: number;
  avgPct: number;
  minutes: number;
  sharePct: number;
}

export interface WeekAggregateMetrics {
  tonnage: number;
  sets: number;
  reps: number;
  avgPct: number;
  minutes: number;
  dayCount: number;
  purpose: ReturnType<typeof sessionPurposeBreakdown>;
  dayRows: WeekDayMetricRow[];
  exerciseVolumes: ReturnType<typeof sessionExerciseVolumes>;
}

function mergeExerciseVolumes(
  blocks: Session['exercises'][],
  athlete: Athlete,
  exercises: Exercise[],
  maxSlices: number,
) {
  const tonnageByLabel = new Map<string, number>();
  for (const blockList of blocks) {
    for (const slice of sessionExerciseVolumes(blockList, athlete, exercises, 999)) {
      tonnageByLabel.set(slice.label, (tonnageByLabel.get(slice.label) ?? 0) + slice.tonnage);
    }
  }
  const total = [...tonnageByLabel.values()].reduce((sum, n) => sum + n, 0);
  if (total <= 0) return [];

  return [...tonnageByLabel.entries()]
    .map(([label, tonnage]) => ({
      label,
      tonnage,
      pct: Math.round((tonnage / total) * 100),
    }))
    .sort((a, b) => b.tonnage - a.tonnage)
    .slice(0, maxSlices);
}

export function computeWeekAggregateMetrics(
  weekData: ProgramWeek | undefined,
  athlete: Athlete,
  exercises: Exercise[],
  isEs: boolean,
  maxExerciseSlices = 12,
): WeekAggregateMetrics {
  const days = weekData?.days ?? [];
  let tonnage = 0;
  let sets = 0;
  let reps = 0;
  let minutes = 0;
  let weightedIntensity = 0;
  let intensitySets = 0;
  const purpose = { technique: 0, work: 0, intensity: 0, total: 0 };
  const allBlocks: Session['exercises'][] = [];

  for (const day of days) {
    const blocks = day.session.exercises;
    allBlocks.push(blocks);
    tonnage += sessionTonnage(day.session, athlete, exercises);
    sets += sessionTotalSets(blocks);
    reps += sessionTotalReps(blocks);
    minutes += estimateSessionMinutes(day.session);

    for (const block of blocks) {
      for (const row of block.sets) {
        weightedIntensity += row.percentage * row.sets;
        intensitySets += row.sets;
      }
    }

    const dayPurpose = sessionPurposeBreakdown(blocks);
    purpose.technique += dayPurpose.technique;
    purpose.work += dayPurpose.work;
    purpose.intensity += dayPurpose.intensity;
    purpose.total += dayPurpose.total;
  }

  const dayRows: WeekDayMetricRow[] = days.map((day) => {
    const blocks = day.session.exercises;
    const dayTonnage = calcularCargaTotal(day.session, athlete, exercises);
    const label =
      day.label?.trim() || (isEs ? `Día ${day.dayNumber}` : `Day ${day.dayNumber}`);
    return {
      dayNumber: day.dayNumber,
      label,
      tonnage: dayTonnage,
      sets: sessionTotalSets(blocks),
      reps: sessionTotalReps(blocks),
      avgPct: sessionAvgIntensity(blocks),
      minutes: estimateSessionMinutes(day.session),
      sharePct: tonnage > 0 ? Math.round((dayTonnage / tonnage) * 100) : 0,
    };
  });

  return {
    tonnage,
    sets,
    reps,
    avgPct: intensitySets > 0 ? Math.round(weightedIntensity / intensitySets) : 0,
    minutes,
    dayCount: days.length,
    purpose,
    dayRows,
    exerciseVolumes: mergeExerciseVolumes(allBlocks, athlete, exercises, maxExerciseSlices),
  };
}
