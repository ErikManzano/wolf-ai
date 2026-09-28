import type { Athlete, Exercise, GeneratedProgram, ProgramWeek, Session } from '../../models/training';
import {
  estimateSessionMinutes,
  sessionTotalReps,
  sessionTotalSets,
} from './blockMetrics';
import {
  computeSessionScienceSummary,
  computeStimulusDistribution,
  computeWeekScience,
  sessionIntensityWeightedByRepVolume,
  sessionTrainingLoad,
  type ScienceZoneSlice,
  type SessionScienceSummary,
} from './programScienceStats';
import {
  computeWeekAggregateMetrics,
  mergeExerciseVolumesWithRemainder,
  type ExerciseVolumeRemainder,
} from './programWeekStats';
import type { ExerciseVolumeSlice } from './sessionSummaryMetrics';
import { formatStatsKg, statsExerciseVolumes, statsSessionTonnage } from './statsTonnage';
import {
  buildCompactDelta,
  buildCompactPtsDelta,
  intensityDeltaPts,
  volumeDeltaPct,
  type MetricDeltaTone,
} from './statsComparison';
import type { ContextComparisonRow } from './program-context/ContextComparisonTable';
import { intensityMetricLabel, intensityMetricTooltip } from './statsLabels';

function fromCompactDelta(
  compact: ReturnType<typeof buildCompactDelta> | ReturnType<typeof buildCompactPtsDelta> | undefined,
): Pick<ContextComparisonRow, 'delta' | 'deltaTone' | 'deltaSymbol'> {
  if (!compact) return {};
  return {
    delta: compact.text,
    deltaTone: compact.tone as MetricDeltaTone,
    deltaSymbol: compact.symbol,
  };
}
import { formatStatsDuration } from './programStatsShared';
import { PROGRAM_CONTEXT_EXERCISE_RANK_LIMIT } from './program-context/constants';

export type DayMetricKey = 'volume' | 'imp' | 'sets' | 'reps' | 'au' | 'dur' | 'dens';

export interface DayMetricItem {
  key: DayMetricKey;
  label: string;
  value: string;
  delta?: { symbol: string; text: string; tone: 'up' | 'down' | 'flat' };
}

export interface DaySessionMetrics {
  tonnage: number;
  intensityWeighted: number;
  sets: number;
  reps: number;
  au: number;
  durationMinutes: number;
  density: number;
  science: ReturnType<typeof computeSessionScienceSummary>;
  stimulus: ScienceZoneSlice[];
  families: ExerciseVolumeSlice[];
  weeklySeries: DayMetricsBundle['weeklySeries'];
  /** Sin sesión en este día */
  empty: boolean;
}

export interface DayMetricsBundle {
  items: DayMetricItem[];
  science: ReturnType<typeof computeSessionScienceSummary>;
  sets: number;
  reps: number;
  /** Por semana (mismo dayNumber) para popover */
  weeklySeries: Array<{
    weekNumber: number;
    tonnage: number;
    imp: number;
    sets: number;
    reps: number;
    au: number;
    density: number;
    minutes: number;
  }>;
}

function daySession(program: GeneratedProgram, weekNumber: number, dayNumber: number): Session | null {
  const week = program.weeks.find((w) => w.weekNumber === weekNumber);
  const day = week?.days.find((d) => d.dayNumber === dayNumber);
  return day?.session ?? null;
}

function canonicalDayScience(
  session: Session,
  athlete: Athlete,
  exercises: Exercise[],
  templateMetrics: boolean,
): SessionScienceSummary {
  const base = computeSessionScienceSummary(session, athlete, exercises);
  const sets = sessionTotalSets(session.exercises);
  const reps = sessionTotalReps(session.exercises);
  const durationMinutes = base.durationMinutes || estimateSessionMinutes(session);

  if (templateMetrics) {
    const au = Math.round(sessionTrainingLoad(session) * 10) / 10;
    const imp = sessionIntensityWeightedByRepVolume(session);
    return {
      ...base,
      tonnage: 0,
      intensityWeighted: imp,
      trainingLoad: au,
      density: 0,
      durationMinutes,
      totalSets: sets,
      totalReps: reps,
    };
  }

  const tonnage = statsSessionTonnage(session, athlete, exercises);
  const density =
    durationMinutes > 0 ? Math.round((tonnage / durationMinutes) * 10) / 10 : 0;

  return {
    ...base,
    tonnage,
    density,
    durationMinutes,
    totalSets: sets,
    totalReps: reps,
  };
}

export function computeDaySessionMetrics(params: {
  program: GeneratedProgram;
  weekNumber: number;
  dayNumber: number;
  athlete: Athlete;
  exercises: Exercise[];
  templateMetrics?: boolean;
}): DaySessionMetrics {
  const { program, weekNumber, dayNumber, athlete, exercises, templateMetrics = false } = params;
  const session = daySession(program, weekNumber, dayNumber);
  const emptyScience = computeSessionScienceSummary(
    {
      id: 'metrics-empty',
      athleteId: athlete.id,
      exercises: [],
      totalReps: 0,
      avgRelativeIntensity: 0,
      avgAbsoluteIntensity: 0,
      load: 0,
      kValue: 0,
    },
    athlete,
    exercises,
  );

  if (!session) {
    return {
      tonnage: 0,
      intensityWeighted: 0,
      sets: 0,
      reps: 0,
      au: 0,
      durationMinutes: 0,
      density: 0,
      science: emptyScience,
      stimulus: [],
      families: [],
      weeklySeries: [],
      empty: true,
    };
  }

  const science = canonicalDayScience(session, athlete, exercises, templateMetrics);
  const stimulus = computeStimulusDistribution(session, athlete, exercises);
  const families = statsExerciseVolumes(session.exercises, athlete, exercises, 8);

  const weeklySeries: DaySessionMetrics['weeklySeries'] = [];
  for (const week of [...program.weeks].sort((a, b) => a.weekNumber - b.weekNumber)) {
    const day = week.days.find((d) => d.dayNumber === dayNumber);
    if (!day?.session.exercises.length) continue;
    const s = canonicalDayScience(day.session, athlete, exercises, templateMetrics);
    weeklySeries.push({
      weekNumber: week.weekNumber,
      tonnage: s.tonnage,
      imp: templateMetrics ? sessionIntensityWeightedByRepVolume(day.session) : s.intensityWeighted,
      sets: s.totalSets,
      reps: s.totalReps,
      au: s.trainingLoad,
      density: s.density,
      minutes: s.durationMinutes,
    });
  }

  return {
    tonnage: science.tonnage,
    intensityWeighted: science.intensityWeighted,
    sets: science.totalSets,
    reps: science.totalReps,
    au: science.trainingLoad,
    durationMinutes: science.durationMinutes,
    density: science.density,
    science,
    stimulus,
    families,
    weeklySeries,
    empty: false,
  };
}

export function buildDayMetricsBundle(params: {
  program: GeneratedProgram;
  weekNumber: number;
  dayNumber: number;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  templateMetrics?: boolean;
}): DayMetricsBundle {
  const { program, weekNumber, dayNumber, athlete, exercises, isEs, templateMetrics = false } = params;
  const current = computeDaySessionMetrics({
    program,
    weekNumber,
    dayNumber,
    athlete,
    exercises,
    templateMetrics,
  });

  if (current.empty) {
    return {
      items: [],
      science: current.science,
      sets: 0,
      reps: 0,
      weeklySeries: [],
    };
  }

  const prevSession = program.weeks
    .find((w) => w.weekNumber === weekNumber - 1)
    ?.days.find((d) => d.dayNumber === dayNumber)?.session;
  const prev = prevSession
    ? canonicalDayScience(prevSession, athlete, exercises, templateMetrics)
    : null;

  const vs = isEs ? 'vs Sem ant.' : 'vs prev wk';

  const items: DayMetricItem[] = [
    ...(templateMetrics
      ? []
      : [
          {
            key: 'volume' as const,
            label: 'VOL',
            value: formatStatsKg(current.tonnage),
            delta: buildCompactDelta(
              volumeDeltaPct(current.tonnage, prev?.tonnage ?? 0),
              vs,
              isEs,
            ),
          },
        ]),
    {
      key: 'imp',
      label: 'IMP',
      value: current.intensityWeighted > 0 ? `${current.intensityWeighted}%` : '—',
      delta: buildCompactPtsDelta(
        prev && prev.intensityWeighted > 0
          ? intensityDeltaPts(current.intensityWeighted, prev.intensityWeighted)
          : null,
        vs,
        isEs,
      ),
    },
    {
      key: 'sets',
      label: 'SETS',
      value: String(current.sets),
      delta: buildCompactDelta(
        prev && prev.totalSets > 0 ? volumeDeltaPct(current.sets, prev.totalSets) : null,
        vs,
        isEs,
      ),
    },
    {
      key: 'reps',
      label: 'REPS',
      value: String(current.reps),
      delta: buildCompactDelta(
        prev && prev.totalReps > 0 ? volumeDeltaPct(current.reps, prev.totalReps) : null,
        vs,
        isEs,
      ),
    },
    {
      key: 'au',
      label: 'AU',
      value: current.au > 0 ? `${current.au}` : '—',
      delta: buildCompactDelta(
        prev && prev.trainingLoad > 0
          ? volumeDeltaPct(Math.round(current.au * 10), Math.round(prev.trainingLoad * 10))
          : null,
        vs,
        isEs,
      ),
    },
    {
      key: 'dur',
      label: 'DUR',
      value: formatStatsDuration(current.durationMinutes),
      delta: buildCompactDelta(
        prev && prev.durationMinutes > 0
          ? volumeDeltaPct(current.durationMinutes, prev.durationMinutes)
          : null,
        vs,
        isEs,
      ),
    },
    ...(templateMetrics
      ? []
      : [
          {
            key: 'dens' as const,
            label: 'DENS',
            value: current.density > 0 ? `${current.density} kg/min` : '—',
            delta: buildCompactDelta(
              prev && prev.density > 0 ? volumeDeltaPct(current.density, prev.density) : null,
              vs,
              isEs,
            ),
          },
        ]),
  ];

  return {
    items,
    science: current.science,
    sets: current.sets,
    reps: current.reps,
    weeklySeries: current.weeklySeries,
  };
}

export function buildDayComparisonRows(params: {
  program: GeneratedProgram;
  weekNumber: number;
  dayNumber: number;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  templateMetrics?: boolean;
}) {
  const { program, weekNumber, dayNumber, athlete, exercises, isEs, templateMetrics = false } = params;
  const current = computeDaySessionMetrics({
    program,
    weekNumber,
    dayNumber,
    athlete,
    exercises,
    templateMetrics,
  });

  const prevSession = program.weeks
    .find((w) => w.weekNumber === weekNumber - 1)
    ?.days.find((d) => d.dayNumber === dayNumber)?.session;
  const prev =
    prevSession && prevSession.exercises.length
      ? canonicalDayScience(prevSession, athlete, exercises, templateMetrics)
      : null;

  if (current.empty) {
    return {
      rows: [] as ContextComparisonRow[],
      stimulus: [] as ScienceZoneSlice[],
      exerciseVolumes: [] as ReturnType<typeof statsExerciseVolumes>,
      exerciseVolumeRemainder: null as ExerciseVolumeRemainder | null,
      hasDayComparison: false,
      empty: true,
    };
  }

  const hasDayComparison = weekNumber > 1 && Boolean(prev);

  const rows: ContextComparisonRow[] = [
    ...(templateMetrics
      ? []
      : [
          {
            label: 'Tonnage',
            current: formatStatsKg(current.tonnage, { alwaysKg: true }),
            prev: prev ? formatStatsKg(prev.tonnage, { alwaysKg: true }) : '—',
            ...fromCompactDelta(
              buildCompactDelta(
                prev && prev.tonnage > 0 ? volumeDeltaPct(current.tonnage, prev.tonnage) : null,
                '',
                isEs,
              ),
            ),
          },
        ]),
    {
      label: 'Sets',
      current: String(current.sets),
      prev: prev ? String(prev.totalSets) : '—',
      ...fromCompactDelta(
        buildCompactDelta(
          prev && prev.totalSets > 0 ? volumeDeltaPct(current.sets, prev.totalSets) : null,
          '',
          isEs,
        ),
      ),
    },
    {
      label: 'Reps',
      current: String(current.reps),
      prev: prev ? String(prev.totalReps) : '—',
      ...fromCompactDelta(
        buildCompactDelta(
          prev && prev.totalReps > 0 ? volumeDeltaPct(current.reps, prev.totalReps) : null,
          '',
          isEs,
        ),
      ),
    },
    {
      label: intensityMetricLabel(isEs),
      title: intensityMetricTooltip(isEs),
      current: current.intensityWeighted > 0 ? `${current.intensityWeighted}%` : '—',
      prev: prev && prev.intensityWeighted > 0 ? `${prev.intensityWeighted}%` : '—',
      ...fromCompactDelta(
        buildCompactPtsDelta(
          prev && prev.intensityWeighted > 0
            ? intensityDeltaPts(current.intensityWeighted, prev.intensityWeighted)
            : null,
          '',
          isEs,
        ),
      ),
    },
  ];

  const session = daySession(program, weekNumber, dayNumber);
  const ranked = session
    ? mergeExerciseVolumesWithRemainder(
        [session.exercises],
        athlete,
        exercises,
        PROGRAM_CONTEXT_EXERCISE_RANK_LIMIT,
      )
    : { slices: [], remainder: null };

  return {
    rows,
    stimulus: current.stimulus,
    exerciseVolumes: ranked.slices,
    exerciseVolumeRemainder: ranked.remainder,
    hasDayComparison,
    empty: false,
  };
}

export function buildWeekComparisonRows(params: {
  weekData?: ProgramWeek;
  previousWeekData?: ProgramWeek;
  program: GeneratedProgram;
  weekNumber: number;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
}) {
  const { weekData, previousWeekData, program, weekNumber, athlete, exercises, isEs } = params;
  const metrics = computeWeekAggregateMetrics(
    weekData,
    athlete,
    exercises,
    isEs,
    PROGRAM_CONTEXT_EXERCISE_RANK_LIMIT,
  );
  const prev = previousWeekData
    ? computeWeekAggregateMetrics(
        previousWeekData,
        athlete,
        exercises,
        isEs,
        PROGRAM_CONTEXT_EXERCISE_RANK_LIMIT,
      )
    : null;
  const science = computeWeekScience(program, weekNumber, athlete, exercises, null);
  const hasWeekComparison = weekNumber > 1 && Boolean(previousWeekData);

  const rows: ContextComparisonRow[] = [
    {
      label: isEs ? 'Tonnage' : 'Tonnage',
      current: formatStatsKg(metrics.tonnage, { alwaysKg: true }),
      prev: prev ? formatStatsKg(prev.tonnage, { alwaysKg: true }) : '—',
      ...fromCompactDelta(
        buildCompactDelta(
          prev && prev.tonnage > 0 ? volumeDeltaPct(metrics.tonnage, prev.tonnage) : null,
          '',
          isEs,
        ),
      ),
    },
    {
      label: 'Sets',
      current: String(metrics.sets),
      prev: prev ? String(prev.sets) : '—',
      ...fromCompactDelta(
        buildCompactDelta(
          prev && prev.sets > 0 ? volumeDeltaPct(metrics.sets, prev.sets) : null,
          '',
          isEs,
        ),
      ),
    },
    {
      label: 'Reps',
      current: String(metrics.reps),
      prev: prev ? String(prev.reps) : '—',
      ...fromCompactDelta(
        buildCompactDelta(
          prev && prev.reps > 0 ? volumeDeltaPct(metrics.reps, prev.reps) : null,
          '',
          isEs,
        ),
      ),
    },
    {
      label: intensityMetricLabel(isEs),
      title: intensityMetricTooltip(isEs),
      current: metrics.avgPct > 0 ? `${metrics.avgPct}%` : '—',
      prev: prev && prev.avgPct > 0 ? `${prev.avgPct}%` : '—',
      ...fromCompactDelta(
        buildCompactPtsDelta(
          prev && prev.avgPct > 0 ? intensityDeltaPts(metrics.avgPct, prev.avgPct) : null,
          '',
          isEs,
        ),
      ),
    },
  ];

  return {
    rows,
    metrics,
    science,
    exerciseVolumes: metrics.exerciseVolumes,
    exerciseVolumeRemainder: metrics.exerciseVolumeRemainder,
    weekStimulus: science?.stimulusDistribution ?? [],
    hasWeekComparison,
  };
}

export function prescribedTonnageWindow(
  program: GeneratedProgram,
  athlete: Athlete,
  exercises: Exercise[],
  endWeek: number,
  endDay: number,
  dayCount: number,
): number {
  let total = 0;
  let counted = 0;
  const weeks = [...program.weeks].sort((a, b) => b.weekNumber - a.weekNumber);
  for (const week of weeks) {
    if (week.weekNumber > endWeek) continue;
    const days = [...week.days].sort((a, b) => b.dayNumber - a.dayNumber);
    for (const day of days) {
      if (week.weekNumber === endWeek && day.dayNumber > endDay) continue;
      total += statsSessionTonnage(day.session, athlete, exercises);
      counted += 1;
      if (counted >= dayCount) return total;
    }
  }
  return total;
}
