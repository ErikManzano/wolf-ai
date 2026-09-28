import { useMemo, useState } from 'react';
import type { Athlete, Exercise, GeneratedProgram } from '../../../models/training';
import { buildDayComparisonRows } from '../programMetricsService';
import { buildDayScatterSeries, buildSessionIntensityBins } from '../programChartSeries';
import { PROGRAM_CONTEXT_EXERCISE_RANK_LIMIT } from './constants';
import {
  IntensityHistogram,
  ScienceDistributionBar,
  ExerciseRanking,
  VolumeIntensityScatter,
} from '../stats-ds';
import { ProgramContextSection } from './ProgramContextSection';
import { ProgramContextGroup } from './ProgramContextGroup';
import { ContextComparisonTable } from './ContextComparisonTable';
import { ProgramContextChartDetail } from './ProgramContextChartDetail';
import { ProgramContextChartExpandButton } from './ProgramContextChartExpandButton';

type DayExpandedChart = 'scatter' | 'histogram' | null;

export function DayContextTab({
  program,
  weekNumber,
  dayNumber,
  dayLabel,
  athlete,
  exercises,
  isEs,
  templateMetrics = false,
}: {
  program: GeneratedProgram;
  weekNumber: number;
  dayNumber: number;
  dayLabel?: string;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  templateMetrics?: boolean;
}) {
  const comparison = useMemo(
    () =>
      buildDayComparisonRows({
        program,
        weekNumber,
        dayNumber,
        athlete,
        exercises,
        isEs,
        templateMetrics,
      }),
    [program, weekNumber, dayNumber, athlete, exercises, isEs, templateMetrics],
  );

  const head = dayLabel?.trim() || (isEs ? `Día ${dayNumber}` : `Day ${dayNumber}`);
  const hasComparison = comparison.hasDayComparison;
  const prevLabel = weekNumber > 1 ? `Sem ${weekNumber - 1}` : '—';

  const scatterPoints = useMemo(
    () =>
      buildDayScatterSeries({
        program,
        weekNumber,
        dayNumber,
        athlete,
        exercises,
        isEs,
        templateMetrics,
      }),
    [program, weekNumber, dayNumber, athlete, exercises, isEs, templateMetrics],
  );

  const dayScatterEmptyMessage =
    scatterPoints.length === 1
      ? isEs
        ? 'Solo hay datos de esta semana. Programa otra semana con el mismo día para comparar, o abre Semana para ver todos los días.'
        : 'Only this week has data. Add another week with the same weekday, or open Week to compare all days.'
      : undefined;

  const intensityBins = useMemo(() => {
    const session =
      program.weeks.find((w) => w.weekNumber === weekNumber)?.days.find((d) => d.dayNumber === dayNumber)
        ?.session ?? null;
    return buildSessionIntensityBins({
      session,
      athlete,
      exercises,
      templateMetrics,
    });
  }, [program, weekNumber, dayNumber, athlete, exercises, templateMetrics]);

  const compareSubtitle = hasComparison
    ? isEs
      ? `vs ${prevLabel} (mismo día)`
      : `vs ${prevLabel} (same day)`
    : weekNumber <= 1
      ? isEs
        ? 'Sin semana anterior para comparar'
        : 'No previous week to compare'
      : undefined;

  const loadGroupTitle = isEs ? 'Carga' : 'Load';
  const distributionTitle = isEs ? 'Distribución' : 'Distribution';
  const detailTitle = isEs ? 'Detalle' : 'Detail';

  const dayLoadTitle = isEs ? 'Carga del día' : 'Day load';
  const histogramTitle = isEs ? 'Distribución %1RM (día)' : 'Intensity % (day)';

  const [expandedChart, setExpandedChart] = useState<DayExpandedChart>(null);

  if (comparison.empty) {
    return (
      <div className="wl-program-context-tab">
        <ProgramContextSection title={head.toUpperCase()}>
          <p className="wl-program-context-empty">
            {isEs ? 'Sin sesión en este día.' : 'No session on this day.'}
          </p>
        </ProgramContextSection>
      </div>
    );
  }

  return (
    <div className="wl-program-context-tab">
      <ProgramContextSection title={head.toUpperCase()} subtitle={compareSubtitle}>
        <ContextComparisonTable
          rows={comparison.rows}
          hasComparison={hasComparison}
          prevLabel={prevLabel}
          isEs={isEs}
        />
      </ProgramContextSection>

      <ProgramContextGroup title={loadGroupTitle}>
        <ProgramContextSection
          title={dayLoadTitle}
          action={
            <ProgramContextChartExpandButton
              isEs={isEs}
              chartTitle={dayLoadTitle}
              onClick={() => setExpandedChart('scatter')}
            />
          }
        >
          <VolumeIntensityScatter
            points={scatterPoints}
            isEs={isEs}
            variant="context"
            emptyMessage={dayScatterEmptyMessage}
          />
        </ProgramContextSection>
      </ProgramContextGroup>

      <ProgramContextChartDetail
        open={expandedChart === 'scatter'}
        title={dayLoadTitle}
        isEs={isEs}
        onClose={() => setExpandedChart(null)}
      >
        <VolumeIntensityScatter
          points={scatterPoints}
          isEs={isEs}
          variant="context"
          emptyMessage={dayScatterEmptyMessage}
        />
      </ProgramContextChartDetail>

      <ProgramContextGroup title={distributionTitle}>
        <ProgramContextSection
          title={histogramTitle}
          action={
            <ProgramContextChartExpandButton
              isEs={isEs}
              chartTitle={histogramTitle}
              onClick={() => setExpandedChart('histogram')}
            />
          }
        >
          <IntensityHistogram bins={intensityBins} isEs={isEs} variant="compact" metric="tonnage" />
        </ProgramContextSection>

        {comparison.stimulus.some((s) => s.repsPct > 0 || s.volumePct > 0) ? (
          <ProgramContextSection title={isEs ? 'Zonas (día)' : 'Zones (day)'}>
            <ScienceDistributionBar
              slices={comparison.stimulus}
              isEs={isEs}
              compact
              showRepsInLegend
              singleZoneVolumeHint
              animateOnMount
              showTooltips
            />
          </ProgramContextSection>
        ) : null}
      </ProgramContextGroup>

      <ProgramContextChartDetail
        open={expandedChart === 'histogram'}
        title={histogramTitle}
        isEs={isEs}
        onClose={() => setExpandedChart(null)}
      >
        <IntensityHistogram bins={intensityBins} isEs={isEs} variant="full" metric="tonnage" />
      </ProgramContextChartDetail>

      {comparison.exerciseVolumes.length > 0 || comparison.exerciseVolumeRemainder ? (
        <ProgramContextGroup title={detailTitle}>
          <ProgramContextSection
            title={isEs ? 'Top 5 ejercicios (tonnage día)' : 'Top 5 exercises (day tonnage)'}
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
