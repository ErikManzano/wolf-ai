import React, { useMemo } from 'react';
import type { Athlete, Exercise, ProgramWeek } from '../../models/training';
import { computeWeekAggregateMetrics } from './programWeekStats';
import {
  computeWeekExecution,
  type SessionExecutionContext,
} from './programExecutionStats';
import { buildWeekInsights, purposeIntentLine } from './statsInsights';
import { formatStatsKg } from './statsTonnage';
import {
  DistributionBar,
  ExerciseRanking,
  InsightCard,
  MetricCard,
  SectionCard,
  StatusBadge,
  TimelineChart,
} from './stats-ds';

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

  const peakDayKey = useMemo(() => {
    const active = metrics.dayRows.filter((d) => d.tonnage > 0);
    if (active.length === 0) return undefined;
    return active.reduce((best, row) => (row.tonnage > best.tonnage ? row : best), active[0]!).dayNumber;
  }, [metrics.dayRows]);

  const timelinePoints = useMemo(
    () =>
      metrics.dayRows.map((row) => ({
        key: row.dayNumber,
        label: row.label.replace(/^(Día|Day)\s*/i, 'D'),
        value: row.tonnage,
      })),
    [metrics.dayRows],
  );

  const insights = useMemo(
    () =>
      buildWeekInsights({
        isEs,
        dayRows: metrics.dayRows,
        purpose: metrics.purpose,
        avgPct: metrics.avgPct,
      }),
    [isEs, metrics.dayRows, metrics.purpose, metrics.avgPct],
  );

  const intentLine = purposeIntentLine(metrics.purpose, isEs);

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-tab-stats"
      className={`wolf-program-day-stats wolf-program-day-stats--week wolf-program-day-stats--ds wolf-program-day-board__pane${dashboard ? ' wolf-program-day-stats--dashboard' : ''}`}
    >
      <div className="wl-stats-ds">
        <div className="wl-stats-ds__metrics" aria-label={isEs ? 'Resumen' : 'Summary'}>
          <MetricCard
            label={isEs ? 'Volumen semanal' : 'Weekly volume'}
            value={formatStatsKg(metrics.tonnage)}
            sub={isEs ? `${metrics.dayCount} días` : `${metrics.dayCount} days`}
            accent
          />
          <MetricCard
            label={isEs ? 'Intensidad' : 'Intensity'}
            value={metrics.avgPct > 0 ? `${metrics.avgPct}%` : '—'}
            sub={isEs ? 'Media % 1RM' : 'Avg % 1RM'}
          />
          <MetricCard
            label={isEs ? 'Días' : 'Days'}
            value={
              execution
                ? `${execution.completedDays}/${execution.totalDays}`
                : metrics.dayCount > 0
                  ? metrics.dayCount
                  : '—'
            }
            sub={
              execution
                ? isEs
                  ? 'Completados / programados'
                  : 'Done / scheduled'
                : isEs
                  ? 'Programados'
                  : 'Scheduled'
            }
            subTone={execution ? 'success' : 'muted'}
          />
          <MetricCard
            label={isEs ? 'Completado' : 'Completed'}
            value={
              execution ? (
                <StatusBadge
                  label={`${execution.completionPct}%`}
                  tone={
                    execution.status === 'completed'
                      ? 'completed'
                      : execution.status === 'in_progress'
                        ? 'in_progress'
                        : 'pending'
                  }
                />
              ) : (
                '—'
              )
            }
            sub={
              execution
                ? isEs
                  ? `${execution.completedSets}/${execution.prescribedSets} series`
                  : `${execution.completedSets}/${execution.prescribedSets} sets`
                : isEs
                  ? 'Sin atleta asignado'
                  : 'No assigned athlete'
            }
            subTone={execution ? 'success' : 'muted'}
          />
          <MetricCard
            label={isEs ? 'Series · Reps' : 'Sets · Reps'}
            value={
              execution
                ? `${execution.completedSets}/${execution.prescribedSets}`
                : metrics.sets > 0
                  ? metrics.sets
                  : '—'
            }
            sub={
              execution
                ? isEs
                  ? `${execution.completedReps}/${metrics.reps} reps`
                  : `${execution.completedReps}/${metrics.reps} reps`
                : isEs
                  ? `${metrics.reps} reps prescritas`
                  : `${metrics.reps} prescribed reps`
            }
            subTone={execution ? 'success' : 'muted'}
          />
        </div>

        <div className="wl-stats-ds__grid wl-stats-ds__grid--split">
          <SectionCard title={isEs ? 'Distribución' : 'Distribution'}>
            <DistributionBar purpose={metrics.purpose} isEs={isEs} insight={intentLine} />
          </SectionCard>

          <SectionCard
            title={isEs ? 'Timeline — Días' : 'Timeline — Days'}
            subtitle={isEs ? 'Clic para abrir el día' : 'Click to open a day'}
          >
            <TimelineChart
              points={timelinePoints}
              isEs={isEs}
              selectedKey={selectedDay}
              peakKey={peakDayKey}
              onSelect={onSelectDay ? (key) => onSelectDay(Number(key)) : undefined}
              showValues
              valueUnit="kg"
            />
          </SectionCard>
        </div>

        <SectionCard title={isEs ? 'Carga — Ranking semanal' : 'Load — Weekly ranking'}>
          <ExerciseRanking slices={metrics.exerciseVolumes} isEs={isEs} maxSlices={6} />
        </SectionCard>

        <SectionCard title={isEs ? 'Insights Wolf' : 'Wolf Insights'}>
          <InsightCard insights={insights} isEs={isEs} />
        </SectionCard>
      </div>
    </section>
  );
};
