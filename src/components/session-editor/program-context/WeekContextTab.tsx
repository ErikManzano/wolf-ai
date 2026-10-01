import { useMemo, useState } from 'react';
import type { Athlete, Exercise, GeneratedProgram, ProgramWeek } from '../../../models/training';
import { buildWeekComparisonRows } from '../programMetricsService';
import { buildWeekDailyTrendChartData } from '../programChartSeries';
import { DailyTrendChart, ScienceDistributionBar } from '../stats-ds';
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

  const loadGroupTitle = isEs ? 'Carga' : 'Load';
  const distributionTitle = isEs ? 'Distribución' : 'Distribution';
  const dailyTrendTitle = isEs ? 'Tendencia diaria' : 'Daily trend';
  const zonesTitle = isEs ? 'Zonas (semana)' : 'Zones (week)';

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
    if (comparison.weekStimulus.length > 0) {
      items.push({
        id: 'zones',
        title: zonesTitle,
        render: () => (
          <ScienceDistributionBar
            slices={comparison.weekStimulus}
            isEs={isEs}
            compact={false}
            showRepsInLegend
            singleZoneVolumeHint
            animateOnMount={false}
            showTooltips
          />
        ),
      });
    }
    return items;
  }, [
    dailyTrend,
    dailyTrendTitle,
    isEs,
    prevLabel,
    comparison.weekStimulus,
    zonesTitle,
  ]);

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

      {comparison.weekStimulus.length > 0 ? (
        <ProgramContextGroup title={distributionTitle}>
          <ProgramContextSection
            title={zonesTitle}
            action={
              <ProgramContextChartExpandButton
                isEs={isEs}
                chartTitle={zonesTitle}
                onClick={() => setGalleryChartId('zones')}
              />
            }
          >
            <ScienceDistributionBar
              slices={comparison.weekStimulus}
              isEs={isEs}
              dense
              animateOnMount
              showTooltips
            />
          </ProgramContextSection>
        </ProgramContextGroup>
      ) : null}
    </div>
  );
}
