import React, { useMemo } from 'react';
import type { Athlete, Exercise, ProgramWeek } from '../../models/training';
import { computeWeekAggregateMetrics } from './programWeekStats';
import {
  buildWeekScopeKpiCards,
  ProgramStatsDashboardLayout,
  ProgramStatsDataTable,
  ProgramStatsDayCards,
  ProgramStatsDetailSection,
  ProgramStatsHorizontalBars,
  ProgramStatsKpiGrid,
  ProgramStatsMiniLineChart,
  ProgramStatsPurposeBlock,
} from './programStatsShared';
import {
  computeSessionExecution,
  computeWeekExecution,
  type SessionExecutionContext,
} from './programExecutionStats';
import { sessionIntensityRange } from './programStatsVerdict';
import { sessionPurposeTonnageBreakdown } from './sessionSummaryMetrics';

export interface SessionWeekStatsPanelProps {
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  weekNumber: number;
  weekTonnage: number;
  weekData?: ProgramWeek;
  selectedDay: number;
  onSelectDay?: (dayNumber: number) => void;
  executionContext?: SessionExecutionContext;
  /** GA-style viewport grid — all widgets visible without page scroll. */
  dashboard?: boolean;
}

export const SessionWeekStatsPanel: React.FC<SessionWeekStatsPanelProps> = ({
  athlete,
  exercises,
  isEs,
  weekNumber,
  weekTonnage: _weekTonnage,
  weekData,
  selectedDay,
  onSelectDay,
  executionContext,
  dashboard = false,
}) => {
  const metrics = useMemo(
    () => computeWeekAggregateMetrics(weekData, athlete, exercises, isEs, 6),
    [weekData, athlete, exercises, isEs],
  );

  const execution = useMemo(
    () => (executionContext ? computeWeekExecution(weekData, weekNumber, executionContext) : null),
    [executionContext, weekData, weekNumber],
  );

  const weekLabel = isEs ? `Semana ${weekNumber}` : `Week ${weekNumber}`;

  const weekDays = useMemo(
    () =>
      metrics.dayRows.map((day) => {
        const dayData = weekData?.days.find((d) => d.dayNumber === day.dayNumber);
        const dayExecution =
          executionContext?.assignmentId && dayData
            ? computeSessionExecution(dayData.session, weekNumber, day.dayNumber, executionContext)
            : null;
        return {
          dayNumber: day.dayNumber,
          label: day.label,
          tonnage: day.tonnage,
          exerciseCount: dayData?.session.exercises.length ?? 0,
          isSelected: day.dayNumber === selectedDay,
          executionStatus: dayExecution?.status ?? 'none',
        };
      }),
    [metrics.dayRows, weekData, selectedDay, executionContext, weekNumber],
  );

  const intensityRange = useMemo(() => {
    const blocks = weekData?.days.flatMap((d) => d.session.exercises) ?? [];
    return sessionIntensityRange(blocks);
  }, [weekData]);

  const purposeTonnage = useMemo(() => {
    const blocks = weekData?.days.flatMap((d) => d.session.exercises) ?? [];
    return sessionPurposeTonnageBreakdown(blocks, athlete, exercises);
  }, [weekData, athlete, exercises]);

  const intensityLinePoints = useMemo(
    () =>
      metrics.dayRows.map((row) => ({
        key: row.dayNumber,
        label: row.label,
        value: row.avgPct,
      })),
    [metrics.dayRows],
  );

  const kpiCards = buildWeekScopeKpiCards(isEs, {
    tonnage: metrics.tonnage,
    avgPct: metrics.avgPct,
    intensityMin: intensityRange.min,
    intensityMax: intensityRange.max,
    sets: metrics.sets,
    reps: metrics.reps,
    dayCount: metrics.dayCount,
    minutes: metrics.minutes,
    execution: execution
      ? {
          completedSets: execution.completedSets,
          prescribedSets: execution.prescribedSets,
          completionPct: execution.completionPct,
        }
      : null,
  });

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-tab-stats"
      className={`wolf-program-day-stats wolf-program-day-stats--week wolf-program-day-board__pane${dashboard ? ' wolf-program-day-stats--dashboard' : ''}`}
    >
      <ProgramStatsDashboardLayout
        dashboard={dashboard}
        variant="week"
        kpis={<ProgramStatsKpiGrid cards={kpiCards} />}
        primary={
          <ProgramStatsDayCards
            title={isEs ? `Volumen por día (${weekLabel})` : `Volume by day (${weekLabel})`}
            days={weekDays}
            isEs={isEs}
            onSelectDay={onSelectDay}
          />
        }
        charts={
          <>
            <ProgramStatsMiniLineChart
              title={isEs ? 'Intensidad por día' : 'Intensity by day'}
              points={intensityLinePoints}
              isEs={isEs}
            />
            <ProgramStatsPurposeBlock
              purpose={metrics.purpose}
              purposeTonnage={purposeTonnage}
              avgPct={metrics.avgPct}
              isEs={isEs}
              title={isEs ? 'Balance técnica / trabajo / intensidad' : 'Technique / work / intensity balance'}
            />
          </>
        }
        breakdown={
          metrics.exerciseVolumes.length > 0 ? (
            <ProgramStatsHorizontalBars
              title={isEs ? 'Top ejercicios de la semana' : 'Top exercises this week'}
              slices={metrics.exerciseVolumes}
              isEs={isEs}
              maxSlices={6}
            />
          ) : null
        }
        detail={
          metrics.dayRows.length > 0 ? (
            <ProgramStatsDetailSection title={isEs ? 'Detalle por día' : 'Breakdown by day'}>
              <ProgramStatsDataTable
                title=""
                columns={[
                  { key: 'day', label: isEs ? 'Día' : 'Day' },
                  { key: 'volume', label: isEs ? 'Volumen' : 'Volume', align: 'right' },
                  { key: 'sets', label: isEs ? 'Series' : 'Sets', align: 'right' },
                  { key: 'reps', label: 'Reps', align: 'right' },
                  { key: 'pct', label: '% 1RM', align: 'right' },
                  { key: 'share', label: isEs ? '% sem.' : '% wk', align: 'right' },
                ]}
                rows={metrics.dayRows.map((row) => ({
                  key: String(row.dayNumber),
                  selected: row.dayNumber === selectedDay,
                  cells: [
                    row.label,
                    `${row.tonnage.toLocaleString()} kg`,
                    row.sets,
                    row.reps,
                    `${row.avgPct}%`,
                    `${row.sharePct}%`,
                  ],
                }))}
              />
            </ProgramStatsDetailSection>
          ) : null
        }
      />
    </section>
  );
};
