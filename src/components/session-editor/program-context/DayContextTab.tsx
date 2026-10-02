import { useMemo, useState } from 'react';
import type { Athlete, Exercise, GeneratedProgram } from '../../../models/training';
import { buildDayComparisonRows } from '../programMetricsService';
import { buildDayAcrossWeeksTrend } from '../programChartSeries';
import { PROGRAM_CONTEXT_EXERCISE_RANK_LIMIT } from './constants';
import { DailyTrendChart, ExerciseRanking } from '../stats-ds';
import { ProgramContextSection } from './ProgramContextSection';
import { ProgramContextGroup } from './ProgramContextGroup';
import { ContextComparisonTable } from './ContextComparisonTable';
import {
  ProgramContextChartGallery,
  type ProgramContextChartItem,
} from './ProgramContextChartGallery';
import { ProgramContextChartExpandButton } from './ProgramContextChartExpandButton';

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

  const dayTrend = useMemo(
    () =>
      buildDayAcrossWeeksTrend({
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

  const dayTrendIndex = Math.max(
    0,
    dayTrend.labels.findIndex((label) => label === (isEs ? `S${weekNumber}` : `W${weekNumber}`)),
  );

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
  const detailTitle = isEs ? 'Detalle' : 'Detail';

  const dayLoadTitle = isEs ? 'Este día por semana' : 'This day by week';

  const scopeLabel = isEs ? `Semana ${weekNumber} · ${head}` : `Week ${weekNumber} · ${head}`;

  const chartItems = useMemo((): ProgramContextChartItem[] => {
    return [
      {
        id: 'dayTrend',
        title: dayLoadTitle,
        render: (variant) => (
          <DailyTrendChart
            data={dayTrend}
            isEs={isEs}
            variant={variant}
            activeIndex={dayTrendIndex}
            prevWeekLabel={prevLabel}
            messages={{
              empty: isEs ? 'Sin sesiones en este día.' : 'No sessions on this day.',
              sparse: isEs
                ? 'Programa el mismo día en más semanas para ver cómo evoluciona la carga.'
                : 'Program this day on more weeks to see how the load evolves.',
              aria: isEs
                ? 'Volumen e intensidad de este día en cada semana'
                : 'Volume and intensity of this day across weeks',
            }}
          />
        ),
      },
    ];
  }, [dayLoadTitle, dayTrend, dayTrendIndex, isEs, prevLabel]);

  const [galleryChartId, setGalleryChartId] = useState<string | null>(null);

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
    <div className="wl-program-context-tab wl-program-context-tab--columns">
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
              onClick={() => setGalleryChartId('dayTrend')}
            />
          }
        >
          <DailyTrendChart
            data={dayTrend}
            isEs={isEs}
            variant="context"
            activeIndex={dayTrendIndex}
            prevWeekLabel={prevLabel}
          />
        </ProgramContextSection>
      </ProgramContextGroup>

      <ProgramContextChartGallery
        open={galleryChartId != null}
        items={chartItems}
        activeId={galleryChartId}
        onActiveIdChange={setGalleryChartId}
        onClose={() => setGalleryChartId(null)}
        isEs={isEs}
        scopeLabel={scopeLabel}
        programName={program.name}
      />

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
