import React, { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram } from '../../models/training';
import { computeProgramAggregateMetrics } from './programAggregateStats';
import { sessionIntensityRange } from './programStatsVerdict';
import {
  buildDayKpiCards,
  ProgramStatsDashboardLayout,
  ProgramStatsDataTable,
  ProgramStatsDayCards,
  ProgramStatsDetailSection,
  ProgramStatsDonutChart,
  ProgramStatsKpiGrid,
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

  const kpiCards = buildDayKpiCards(isEs, {
    tonnage: metrics.tonnage,
    weekSharePct: 0,
    avgPct: metrics.avgPct,
    intensityMin: intensityRange.min,
    intensityMax: intensityRange.max,
    sets: metrics.sets,
    reps: metrics.reps,
    exerciseCount: metrics.exerciseVolumes.length,
    execution: execution
      ? {
          completedSets: execution.completedSets,
          prescribedSets: execution.prescribedSets,
          completionPct: execution.completionPct,
        }
      : null,
  });

  kpiCards[3] = {
    ...kpiCards[3]!,
    label: isEs ? 'Semanas' : 'Weeks',
    value: String(metrics.weekCount),
    sub: isEs ? `${metrics.sessionCount} sesiones` : `${metrics.sessionCount} sessions`,
    accent: 'exercises',
  };

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-tab-stats"
      className={`wolf-program-day-stats wolf-program-day-stats--program wolf-program-day-board__pane${dashboard ? ' wolf-program-day-stats--dashboard' : ''}`}
    >
      <ProgramStatsDashboardLayout
        dashboard={dashboard}
        kpis={<ProgramStatsKpiGrid cards={kpiCards} />}
        charts={
          <>
            <ProgramStatsDonutChart
              title={isEs ? 'Volumen por ejercicio (programa)' : 'Volume by exercise (program)'}
              centerLabel={`${metrics.tonnage.toLocaleString()} kg`}
              slices={metrics.exerciseVolumes}
              isEs={isEs}
              maxSlices={dashboard ? 6 : undefined}
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
        timeline={
          <ProgramStatsDayCards
            title={isEs ? 'Volumen por semana' : 'Volume by week'}
            days={weekCards}
            isEs={isEs}
            onSelectDay={onSelectWeek}
          />
        }
        detail={
          metrics.weekRows.length > 0 ? (
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
          ) : null
        }
      />
    </section>
  );
};
