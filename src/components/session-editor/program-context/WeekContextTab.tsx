import { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram, ProgramWeek } from '../../../models/training';
import { buildWeekComparisonRows } from '../programMetricsService';
import {
  buildWeekDailyTrendChartData,
  buildWeekScatterSeries,
} from '../programChartSeries';
import { PROGRAM_CONTEXT_EXERCISE_RANK_LIMIT } from './constants';
import {
  ExerciseRanking,
  DailyTrendChart,
  ScienceDistributionBar,
  VolumeIntensityScatter,
} from '../stats-ds';
import { ProgramContextSection } from './ProgramContextSection';
import { ContextComparisonTable } from './ContextComparisonTable';

export function WeekContextTab({
  program,
  weekNumber,
  weekData,
  previousWeekData,
  athlete,
  exercises,
  isEs,
}: {
  program: GeneratedProgram;
  weekNumber: number;
  weekData?: ProgramWeek;
  previousWeekData?: ProgramWeek;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
}) {
  const comparison = useMemo(
    () =>
      buildWeekComparisonRows({
        weekData,
        previousWeekData,
        program,
        weekNumber,
        athlete,
        exercises,
        isEs,
      }),
    [weekData, previousWeekData, program, weekNumber, athlete, exercises, isEs],
  );

  const hasComparison = comparison.hasWeekComparison;
  const prevLabel = weekNumber > 1 ? `Sem ${weekNumber - 1}` : '—';

  const scatterPoints = useMemo(
    () =>
      buildWeekScatterSeries({
        week: weekData,
        previousWeek: previousWeekData,
        athlete,
        exercises,
        isEs,
      }),
    [weekData, previousWeekData, athlete, exercises, isEs],
  );

  const dailyTrend = useMemo(
    () =>
      buildWeekDailyTrendChartData({
        program,
        week: weekData,
        previousWeek: previousWeekData,
        weekNumber,
        athlete,
        exercises,
        isEs,
      }),
    [program, weekData, previousWeekData, weekNumber, athlete, exercises, isEs],
  );

  const compareSubtitle = hasComparison
    ? isEs
      ? `vs ${prevLabel}`
      : `vs ${prevLabel}`
    : isEs
      ? 'Primera semana del programa'
      : 'First week of the program';

  return (
    <div className="wl-program-context-tab">
      <ProgramContextSection
        title={isEs ? `Semana ${weekNumber}` : `Week ${weekNumber}`}
        subtitle={compareSubtitle}
      >
        <ContextComparisonTable
          rows={comparison.rows}
          hasComparison={hasComparison}
          prevLabel={prevLabel}
          isEs={isEs}
        />
      </ProgramContextSection>

      <ProgramContextSection
        title={isEs ? 'Volumen × intensidad (semana)' : 'Volume × intensity (week)'}
      >
        <VolumeIntensityScatter points={scatterPoints} isEs={isEs} variant="compact" />
      </ProgramContextSection>

      <ProgramContextSection title={isEs ? 'Tendencia diaria' : 'Daily trend'}>
        <DailyTrendChart data={dailyTrend} isEs={isEs} variant="compact" prevWeekLabel={prevLabel} />
      </ProgramContextSection>

      {comparison.weekStimulus.length > 0 ? (
        <ProgramContextSection title={isEs ? 'Zonas (semana)' : 'Zones (week)'}>
          <ScienceDistributionBar
            slices={comparison.weekStimulus}
            isEs={isEs}
            compact
            showRepsInLegend
            singleZoneVolumeHint
            animateOnMount
            showTooltips
          />
        </ProgramContextSection>
      ) : null}

      {comparison.exerciseVolumes.length > 0 || comparison.exerciseVolumeRemainder ? (
        <ProgramContextSection
          title={isEs ? 'Top 5 ejercicios (tonnage semana)' : 'Top 5 exercises (week tonnage)'}
        >
          <ExerciseRanking
            slices={comparison.exerciseVolumes}
            isEs={isEs}
            maxSlices={PROGRAM_CONTEXT_EXERCISE_RANK_LIMIT}
            remainder={comparison.exerciseVolumeRemainder}
            animateOnMount
          />
        </ProgramContextSection>
      ) : null}
    </div>
  );
}
