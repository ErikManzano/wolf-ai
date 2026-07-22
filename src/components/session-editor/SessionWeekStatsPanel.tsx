import React, { useMemo } from 'react';
import type { Athlete, Exercise, ProgramWeek } from '../../models/training';
import { computeWeekAggregateMetrics } from './programWeekStats';
import {
  computeWeekExecution,
  type SessionExecutionContext,
} from './programExecutionStats';
import { buildPctDelta, buildPtsDelta, intensityDeltaPts, volumeDeltaPct } from './statsComparison';
import { formatStatsKg } from './statsTonnage';
import {
  DistributionBar,
  ExerciseRanking,
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
  /** Previous week in the mesocycle — for N vs N−1 comparisons */
  previousWeekData?: ProgramWeek;
  selectedDay: number;
  onSelectDay?: (dayNumber: number) => void;
  executionContext?: SessionExecutionContext;
  /** Scope / athlete controls rendered inside the dashboard shell. */
  toolbar?: React.ReactNode;
}

export const SessionWeekStatsPanel: React.FC<SessionWeekStatsPanelProps> = ({
  athlete,
  exercises,
  isEs,
  weekNumber,
  weekTonnage: _weekTonnage,
  weekData,
  previousWeekData,
  selectedDay,
  onSelectDay,
  executionContext,
  toolbar,
}) => {
  const metrics = useMemo(
    () => computeWeekAggregateMetrics(weekData, athlete, exercises, isEs, 6),
    [weekData, athlete, exercises, isEs],
  );

  const prevMetrics = useMemo(
    () =>
      previousWeekData
        ? computeWeekAggregateMetrics(previousWeekData, athlete, exercises, isEs, 1)
        : null,
    [previousWeekData, athlete, exercises, isEs],
  );

  const volumeDelta = useMemo(
    () =>
      prevMetrics && prevMetrics.tonnage > 0
        ? buildPctDelta(
            volumeDeltaPct(metrics.tonnage, prevMetrics.tonnage),
            isEs ? 'vs semana anterior' : 'vs previous week',
            isEs,
          )
        : undefined,
    [metrics.tonnage, prevMetrics, isEs],
  );

  const intensityDelta = useMemo(
    () =>
      prevMetrics && prevMetrics.avgPct > 0
        ? buildPtsDelta(
            intensityDeltaPts(metrics.avgPct, prevMetrics.avgPct),
            isEs ? 'vs semana anterior' : 'vs previous week',
            isEs,
          )
        : undefined,
    [metrics.avgPct, prevMetrics, isEs],
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

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-tab-stats"
      className="wolf-program-day-stats wolf-program-day-stats--week wolf-program-day-stats--ds"
    >
      <div className="wl-stats-ds">
        {toolbar ? <div className="wl-stats-ds__toolbar">{toolbar}</div> : null}
        <div className="wl-stats-ds__metrics" aria-label={isEs ? 'Resumen' : 'Summary'}>
          <MetricCard
            label={isEs ? 'Volumen semanal' : 'Weekly volume'}
            value={formatStatsKg(metrics.tonnage)}
            sub={isEs ? `${metrics.dayCount} días` : `${metrics.dayCount} days`}
            delta={volumeDelta}
            accent
          />
          <MetricCard
            label={isEs ? 'Intensidad' : 'Intensity'}
            value={metrics.avgPct > 0 ? `${metrics.avgPct}%` : '—'}
            sub={isEs ? 'Media % 1RM' : 'Avg % 1RM'}
            delta={intensityDelta}
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
                  ? `${execution.completedSets}/${execution.prescribedSets} series · ${execution.completedReps}/${metrics.reps} reps`
                  : `${execution.completedSets}/${execution.prescribedSets} sets · ${execution.completedReps}/${metrics.reps} reps`
                : isEs
                  ? `${metrics.sets} series · ${metrics.reps} reps`
                  : `${metrics.sets} sets · ${metrics.reps} reps`
            }
            subTone={execution ? 'success' : 'muted'}
          />
        </div>

        <SectionCard title={isEs ? 'Estímulo — Distribución' : 'Stimulus — Distribution'}>
          <DistributionBar purpose={metrics.purpose} isEs={isEs} />
        </SectionCard>

        <div className="wl-stats-ds__grid wl-stats-ds__grid--split">
          <SectionCard
            title={isEs ? 'Carga — Días' : 'Load — Days'}
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

          <SectionCard title={isEs ? 'Carga — Ranking semanal' : 'Load — Weekly ranking'}>
            <ExerciseRanking slices={metrics.exerciseVolumes} isEs={isEs} maxSlices={6} />
          </SectionCard>
        </div>
      </div>
    </section>
  );
};
