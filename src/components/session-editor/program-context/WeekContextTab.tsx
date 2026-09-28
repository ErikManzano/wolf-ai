import { useMemo, useState } from 'react';
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
import { ProgramContextGroup } from './ProgramContextGroup';
import { ContextComparisonTable } from './ContextComparisonTable';
import { ProgramContextChartDetail } from './ProgramContextChartDetail';
import { ProgramContextChartExpandButton } from './ProgramContextChartExpandButton';

type WeekExpandedChart = 'dailyTrend' | 'scatter' | null;

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

  const loadGroupTitle = isEs ? 'Carga' : 'Load';
  const distributionTitle = isEs ? 'Distribución' : 'Distribution';
  const detailTitle = isEs ? 'Detalle' : 'Detail';

  const dailyTrendTitle = isEs ? 'Tendencia diaria' : 'Daily trend';
  const scatterTitle = isEs ? 'Volumen × intensidad (semana)' : 'Volume × intensity (week)';

  const [expandedChart, setExpandedChart] = useState<WeekExpandedChart>(null);

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

      <ProgramContextGroup title={loadGroupTitle}>
        <ProgramContextSection
          title={dailyTrendTitle}
          action={
            <ProgramContextChartExpandButton
              isEs={isEs}
              chartTitle={dailyTrendTitle}
              onClick={() => setExpandedChart('dailyTrend')}
            />
          }
        >
          <DailyTrendChart
            data={dailyTrend}
            isEs={isEs}
            variant="context"
            prevWeekLabel={prevLabel}
          />
        </ProgramContextSection>

        <ProgramContextSection
          title={scatterTitle}
          action={
            <ProgramContextChartExpandButton
              isEs={isEs}
              chartTitle={scatterTitle}
              onClick={() => setExpandedChart('scatter')}
            />
          }
        >
          <VolumeIntensityScatter points={scatterPoints} isEs={isEs} variant="context" />
        </ProgramContextSection>
      </ProgramContextGroup>

      <ProgramContextChartDetail
        open={expandedChart === 'dailyTrend'}
        title={dailyTrendTitle}
        isEs={isEs}
        onClose={() => setExpandedChart(null)}
      >
        <DailyTrendChart
          data={dailyTrend}
          isEs={isEs}
          variant="detail"
          prevWeekLabel={prevLabel}
        />
      </ProgramContextChartDetail>

      <ProgramContextChartDetail
        open={expandedChart === 'scatter'}
        title={scatterTitle}
        isEs={isEs}
        onClose={() => setExpandedChart(null)}
      >
        <VolumeIntensityScatter points={scatterPoints} isEs={isEs} variant="detail" />
      </ProgramContextChartDetail>

      {comparison.weekStimulus.length > 0 ? (
        <ProgramContextGroup title={distributionTitle}>
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
        </ProgramContextGroup>
      ) : null}

      {comparison.exerciseVolumes.length > 0 || comparison.exerciseVolumeRemainder ? (
        <ProgramContextGroup title={detailTitle}>
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
        </ProgramContextGroup>
      ) : null}
    </div>
  );
}
