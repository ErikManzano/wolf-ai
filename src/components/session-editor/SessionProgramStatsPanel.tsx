import React, { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram } from '../../models/training';
import { computeProgramAggregateMetrics } from './programAggregateStats';
import { sessionIntensityRange } from './programStatsVerdict';
import {
  buildProgramScopeKpiCards,
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
  computeProgramExecution,
  type SessionExecutionContext,
} from './programExecutionStats';
import { sessionPurposeTonnageBreakdown } from './sessionSummaryMetrics';

export interface SessionProgramStatsPanelProps {
  program: GeneratedProgram;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  selectedWeek: number;
  onSelectWeek?: (weekNumber: number) => void;
  executionContext?: SessionExecutionContext;
  /** GA-style viewport grid — all widgets visible without page scroll. */
  dashboard?: boolean;
}

export const SessionProgramStatsPanel: React.FC<SessionProgramStatsPanelProps> = ({
  program,
  athlete,
  exercises,
  isEs,
  selectedWeek,
  onSelectWeek,
  executionContext,
  dashboard = false,
}) => {
  const metrics = useMemo(
    () => computeProgramAggregateMetrics(program, athlete, exercises, isEs, 6),
    [program, athlete, exercises, isEs],
  );

  const execution = useMemo(
    () => (executionContext ? computeProgramExecution(program, executionContext) : null),
    [executionContext, program],
  );

  const weekCards = useMemo(
    () =>
      metrics.weekRows.map((row) => ({
        dayNumber: row.weekNumber,
        label: row.label,
        tonnage: row.tonnage,
        exerciseCount: row.dayCount,
        isSelected: row.weekNumber === selectedWeek,
        executionStatus: 'none' as const,
      })),
    [metrics.weekRows, selectedWeek],
  );

  const intensityRange = useMemo(() => {
    const blocks = program.weeks.flatMap((w) => w.days.flatMap((d) => d.session.exercises));
    return sessionIntensityRange(blocks);
  }, [program]);

  const purposeTonnage = useMemo(() => {
    const blocks = program.weeks.flatMap((w) => w.days.flatMap((d) => d.session.exercises));
    return sessionPurposeTonnageBreakdown(blocks, athlete, exercises);
  }, [program, athlete, exercises]);

  const intensityLinePoints = useMemo(
    () =>
      metrics.weekRows.map((row) => ({
        key: row.weekNumber,
        label: row.label,
        value: row.avgPct,
      })),
    [metrics.weekRows],
  );

  const kpiCards = buildProgramScopeKpiCards(isEs, {
    tonnage: metrics.tonnage,
    avgPct: metrics.avgPct,
    intensityMin: intensityRange.min,
    intensityMax: intensityRange.max,
    weekCount: metrics.weekCount,
    sessionCount: metrics.sessionCount,
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
      className={`wolf-program-day-stats wolf-program-day-stats--program wolf-program-day-board__pane${dashboard ? ' wolf-program-day-stats--dashboard' : ''}`}
    >
      <ProgramStatsDashboardLayout
        dashboard={dashboard}
        variant="program"
        kpis={<ProgramStatsKpiGrid cards={kpiCards} />}
        primary={
          <ProgramStatsDayCards
            title={isEs ? 'Volumen por semana' : 'Volume by week'}
            days={weekCards}
            isEs={isEs}
            onSelectDay={onSelectWeek}
          />
        }
        charts={
          <>
            <ProgramStatsMiniLineChart
              title={isEs ? 'Intensidad por semana' : 'Intensity by week'}
              points={intensityLinePoints}
              isEs={isEs}
            />
            <ProgramStatsPurposeBlock
              purpose={metrics.purpose}
              purposeTonnage={purposeTonnage}
              avgPct={metrics.avgPct}
              isEs={isEs}
              title={
                isEs ? 'Distribución por intensidad (programa)' : 'Intensity distribution (program)'
              }
            />
          </>
        }
        detail={
          <>
            {metrics.exerciseVolumes.length > 0 ? (
              <ProgramStatsDetailSection
                title={isEs ? 'Top ejercicios del programa' : 'Top program exercises'}
              >
                <ProgramStatsHorizontalBars
                  title=""
                  slices={metrics.exerciseVolumes}
                  isEs={isEs}
                  maxSlices={8}
                  labelMaxLen={32}
                />
              </ProgramStatsDetailSection>
            ) : null}
            {metrics.weekRows.length > 0 ? (
              <ProgramStatsDetailSection title={isEs ? 'Detalle por semana' : 'Breakdown by week'}>
                <ProgramStatsDataTable
                  title=""
                  columns={[
                    { key: 'week', label: isEs ? 'Semana' : 'Week' },
                    { key: 'volume', label: isEs ? 'Volumen' : 'Volume', align: 'right' },
                    { key: 'days', label: isEs ? 'Días' : 'Days', align: 'right' },
                    { key: 'sets', label: isEs ? 'Series' : 'Sets', align: 'right' },
                    { key: 'reps', label: 'Reps', align: 'right' },
                    { key: 'pct', label: '% 1RM', align: 'right' },
                    { key: 'share', label: isEs ? '% prog.' : '% prog', align: 'right' },
                  ]}
                  rows={metrics.weekRows.map((row) => ({
                    key: String(row.weekNumber),
                    selected: row.weekNumber === selectedWeek,
                    cells: [
                      row.label,
                      `${row.tonnage.toLocaleString()} kg`,
                      row.dayCount,
                      row.sets,
                      row.reps,
                      `${row.avgPct}%`,
                      `${row.sharePct}%`,
                    ],
                  }))}
                />
              </ProgramStatsDetailSection>
            ) : null}
          </>
        }
      />
    </section>
  );
};
