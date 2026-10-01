import { useMemo, useState } from 'react';
import type { Athlete, Exercise, GeneratedProgram } from '../../../models/training';
import { buildDayComparisonRows } from '../programMetricsService';
import { buildDayScatterSeries } from '../programChartSeries';
import { PROGRAM_CONTEXT_EXERCISE_RANK_LIMIT } from './constants';
import { ExerciseRanking, VolumeIntensityScatter } from '../stats-ds';
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

  const dayLoadTitle = isEs ? 'Carga del día' : 'Day load';

  const scopeLabel = isEs ? `Semana ${weekNumber} · ${head}` : `Week ${weekNumber} · ${head}`;

  const chartItems = useMemo((): ProgramContextChartItem[] => {
    return [
      {
        id: 'scatter',
        title: dayLoadTitle,
        render: (variant) => (
          <VolumeIntensityScatter
            points={scatterPoints}
            isEs={isEs}
            variant={variant}
            emptyMessage={dayScatterEmptyMessage}
          />
        ),
      },
    ];
  }, [dayLoadTitle, scatterPoints, isEs, dayScatterEmptyMessage]);

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
              onClick={() => setGalleryChartId('scatter')}
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
