import type { Athlete, Exercise, GeneratedProgram } from '../../models/training';
import { sessionPurposeBreakdown } from './sessionSummaryMetrics';
import { computeWeekAggregateMetrics } from './programWeekStats';

export interface ProgramWeekMetricRow {
  weekNumber: number;
  label: string;
  tonnage: number;
  sets: number;
  reps: number;
  avgPct: number;
  minutes: number;
  dayCount: number;
  sharePct: number;
}

export interface ProgramAggregateMetrics {
  tonnage: number;
  sets: number;
  reps: number;
  avgPct: number;
  minutes: number;
  weekCount: number;
  sessionCount: number;
  purpose: ReturnType<typeof sessionPurposeBreakdown>;
  weekRows: ProgramWeekMetricRow[];
  exerciseVolumes: ReturnType<typeof computeWeekAggregateMetrics>['exerciseVolumes'];
}

export function computeProgramAggregateMetrics(
  program: GeneratedProgram | null | undefined,
  athlete: Athlete,
  exercises: Exercise[],
  isEs: boolean,
  maxExerciseSlices = 16,
): ProgramAggregateMetrics {
  const weeks = program?.weeks ?? [];
  let tonnage = 0;
  let sets = 0;
  let reps = 0;
  let minutes = 0;
  let sessionCount = 0;
  let weightedIntensity = 0;
  let intensitySets = 0;
  const purpose = { technique: 0, work: 0, intensity: 0, total: 0 };
  const exerciseTonnage = new Map<string, number>();
  const weekRows: ProgramWeekMetricRow[] = [];

  for (const week of weeks) {
    const weekMetrics = computeWeekAggregateMetrics(week, athlete, exercises, isEs, 999);
    tonnage += weekMetrics.tonnage;
    sets += weekMetrics.sets;
    reps += weekMetrics.reps;
    minutes += weekMetrics.minutes;
    sessionCount += weekMetrics.dayCount;

    purpose.technique += weekMetrics.purpose.technique;
    purpose.work += weekMetrics.purpose.work;
    purpose.intensity += weekMetrics.purpose.intensity;
    purpose.total += weekMetrics.purpose.total;

    for (const day of week.days) {
      for (const block of day.session.exercises) {
        for (const row of block.sets) {
          weightedIntensity += row.percentage * row.sets;
          intensitySets += row.sets;
        }
      }
    }

    for (const slice of weekMetrics.exerciseVolumes) {
      exerciseTonnage.set(slice.label, (exerciseTonnage.get(slice.label) ?? 0) + slice.tonnage);
    }

    weekRows.push({
      weekNumber: week.weekNumber,
      label: isEs ? `Semana ${week.weekNumber}` : `Week ${week.weekNumber}`,
      tonnage: weekMetrics.tonnage,
      sets: weekMetrics.sets,
      reps: weekMetrics.reps,
      avgPct: weekMetrics.avgPct,
      minutes: weekMetrics.minutes,
      dayCount: weekMetrics.dayCount,
      sharePct: 0,
    });
  }

  const exerciseTotal = [...exerciseTonnage.values()].reduce((sum, n) => sum + n, 0);
  const exerciseVolumes =
    exerciseTotal <= 0
      ? []
      : [...exerciseTonnage.entries()]
          .map(([label, vol]) => ({
            label,
            tonnage: vol,
            pct: Math.round((vol / exerciseTotal) * 100),
          }))
          .sort((a, b) => b.tonnage - a.tonnage)
          .slice(0, maxExerciseSlices);

  if (tonnage > 0) {
    for (const row of weekRows) {
      row.sharePct = Math.round((row.tonnage / tonnage) * 100);
    }
  }

  return {
    tonnage,
    sets,
    reps,
    avgPct: intensitySets > 0 ? Math.round(weightedIntensity / intensitySets) : 0,
    minutes,
    weekCount: weeks.length,
    sessionCount,
    purpose,
    weekRows,
    exerciseVolumes,
  };
}
