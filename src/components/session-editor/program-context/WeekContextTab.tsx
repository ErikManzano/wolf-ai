import { useMemo, useState } from 'react';
import type { Athlete, Exercise, GeneratedProgram, ProgramWeek } from '../../../models/training';
import { buildWeekComparisonRows } from '../programMetricsService';
import { buildWeekDailyTrendChartData, buildWeekIntensityBins } from '../programChartSeries';
import { DailyTrendChart, IntensityDistributionDonut } from '../stats-ds';
import { ProgramContextSection } from './ProgramContextSection';
import { ProgramContextGroup } from './ProgramContextGroup';
import { ContextComparisonTable } from './ContextComparisonTable';
import {
  ProgramContextChartGallery,
  type ProgramContextChartItem,
} from './ProgramContextChartGallery';
import { ProgramContextChartExpandButton } from './ProgramContextChartExpandButton';

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

  const intensityBins = useMemo(
    () =>
      buildWeekIntensityBins({
        week: weekData,
        athlete,
        exercises,
      }),
    [weekData, athlete, exercises],
  );

  const loadGroupTitle = isEs ? 'Carga' : 'Load';
  const distributionTitle = isEs ? 'Distribución' : 'Distribution';
  const dailyTrendTitle = isEs ? 'Tendencia diaria' : 'Daily trend';
  const intensityTitle = isEs ? 'Distribución de intensidad' : 'Intensity distribution';

  const scopeLabel = isEs ? `Semana ${weekNumber}` : `Week ${weekNumber}`;

  const chartItems = useMemo((): ProgramContextChartItem[] => {
    const items: ProgramContextChartItem[] = [
      {
        id: 'dailyTrend',
        title: dailyTrendTitle,
        render: (variant) => (
          <DailyTrendChart
            data={dailyTrend}
            isEs={isEs}
            variant={variant}
            prevWeekLabel={prevLabel}
          />
        ),
      },
    ];
    items.push({
      id: 'intensity',
      title: intensityTitle,
      render: (variant) => (
        <IntensityDistributionDonut bins={intensityBins} isEs={isEs} dense={variant === 'context'} />
      ),
    });
    return items;
  }, [dailyTrend, dailyTrendTitle, isEs, prevLabel, intensityBins, intensityTitle]);

  const [galleryChartId, setGalleryChartId] = useState<string | null>(null);

  return (
    <div className="wl-program-context-tab wl-program-context-tab--columns">
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
              onClick={() => setGalleryChartId('dailyTrend')}
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

      <ProgramContextGroup title={distributionTitle}>
        <ProgramContextSection
          title={intensityTitle}
          action={
            <ProgramContextChartExpandButton
              isEs={isEs}
              chartTitle={intensityTitle}
              onClick={() => setGalleryChartId('intensity')}
            />
          }
        >
          <IntensityDistributionDonut bins={intensityBins} isEs={isEs} dense />
        </ProgramContextSection>
      </ProgramContextGroup>
    </div>
  );
}
