import { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram } from '../../../models/training';
import { buildDayComparisonRows } from '../programMetricsService';
import { buildSessionIntensityBins } from '../programChartSeries';
import { PROGRAM_CONTEXT_EXERCISE_RANK_LIMIT } from './constants';
import { IntensityHistogram, ScienceDistributionBar, ExerciseRanking } from '../stats-ds';
import { ProgramContextSection } from './ProgramContextSection';
import { ContextComparisonTable } from './ContextComparisonTable';

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

      <ProgramContextSection title={isEs ? 'Distribución %1RM (día)' : 'Intensity % (day)'}>
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

      {comparison.exerciseVolumes.length > 0 || comparison.exerciseVolumeRemainder ? (
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
      ) : null}
    </div>
  );
}
