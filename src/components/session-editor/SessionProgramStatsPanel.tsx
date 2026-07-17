import React, { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram } from '../../models/training';
import { computeProgramAggregateMetrics } from './programAggregateStats';
import {
  computeProgramExecution,
  type SessionExecutionContext,
} from './programExecutionStats';
import { buildProgramInsights, purposeIntentLine } from './statsInsights';
import { formatStatsKg } from './statsTonnage';
import {
  DistributionBar,
  ExerciseRanking,
  InsightCard,
  MetricCard,
  SectionCard,
  StatRow,
  StatusBadge,
  TimelineChart,
} from './stats-ds';

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
    () => computeProgramAggregateMetrics(program, athlete, exercises, isEs, 8),
    [program, athlete, exercises, isEs],
  );

  const execution = useMemo(
    () => (executionContext ? computeProgramExecution(program, executionContext) : null),
    [executionContext, program],
  );

  const peakWeekKey = useMemo(() => {
    const active = metrics.weekRows.filter((w) => w.tonnage > 0);
    if (active.length === 0) return undefined;
    return active.reduce((best, row) => (row.tonnage > best.tonnage ? row : best), active[0]!).weekNumber;
  }, [metrics.weekRows]);

  const timelinePoints = useMemo(
    () =>
      metrics.weekRows.map((row) => ({
        key: row.weekNumber,
        label: isEs ? `S${row.weekNumber}` : `W${row.weekNumber}`,
        value: row.tonnage,
      })),
    [metrics.weekRows, isEs],
  );

  const intensityRows = useMemo(
    () =>
      metrics.weekRows
        .filter((row) => row.avgPct > 0)
        .map((row) => ({
          label: row.label,
          value: `${row.avgPct}%`,
        })),
    [metrics.weekRows],
  );

  const insights = useMemo(
    () =>
      buildProgramInsights({
        isEs,
        weekRows: metrics.weekRows,
        purpose: metrics.purpose,
        exerciseVolumes: metrics.exerciseVolumes,
        avgPct: metrics.avgPct,
      }),
    [isEs, metrics.weekRows, metrics.purpose, metrics.exerciseVolumes, metrics.avgPct],
  );

  const intentLine = purposeIntentLine(metrics.purpose, isEs);

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-tab-stats"
      className={`wolf-program-day-stats wolf-program-day-stats--program wolf-program-day-stats--ds wolf-program-day-board__pane${dashboard ? ' wolf-program-day-stats--dashboard' : ''}`}
    >
      <div className="wl-stats-ds">
        <div className="wl-stats-ds__metrics" aria-label={isEs ? 'Resumen' : 'Summary'}>
          <MetricCard
            label={isEs ? 'Volumen total' : 'Total volume'}
            value={formatStatsKg(metrics.tonnage)}
            sub={isEs ? 'Programa' : 'Program'}
            accent
          />
          <MetricCard
            label={isEs ? 'Intensidad' : 'Intensity'}
            value={metrics.avgPct > 0 ? `${metrics.avgPct}%` : '—'}
            sub={isEs ? 'Media % 1RM' : 'Avg % 1RM'}
          />
          <MetricCard
            label={isEs ? 'Semanas' : 'Weeks'}
            value={metrics.weekCount > 0 ? metrics.weekCount : '—'}
            sub={isEs ? 'Del bloque' : 'In block'}
          />
          <MetricCard
            label={isEs ? 'Sesiones' : 'Sessions'}
            value={metrics.sessionCount > 0 ? metrics.sessionCount : '—'}
            sub={isEs ? 'Días programados' : 'Scheduled days'}
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
        </div>

        <div className="wl-stats-ds__grid wl-stats-ds__grid--split">
          <SectionCard
            title={isEs ? 'Timeline — Semanas' : 'Timeline — Weeks'}
            subtitle={isEs ? 'Volumen por semana · clic para seleccionar' : 'Volume by week · click to select'}
          >
            <TimelineChart
              points={timelinePoints}
              isEs={isEs}
              selectedKey={selectedWeek}
              peakKey={peakWeekKey}
              onSelect={onSelectWeek ? (key) => onSelectWeek(Number(key)) : undefined}
              showValues
              valueUnit="kg"
            />
            {intensityRows.length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <StatRow rows={intensityRows.slice(0, 6)} />
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title={isEs ? 'Distribución' : 'Distribution'}>
            <DistributionBar purpose={metrics.purpose} isEs={isEs} insight={intentLine} />
          </SectionCard>
        </div>

        <SectionCard title={isEs ? 'Carga — Ranking global' : 'Load — Global ranking'}>
          <ExerciseRanking slices={metrics.exerciseVolumes} isEs={isEs} maxSlices={8} />
        </SectionCard>

        <SectionCard title={isEs ? 'Insights Wolf' : 'Wolf Insights'}>
          <InsightCard insights={insights} isEs={isEs} />
        </SectionCard>
      </div>
    </section>
  );
};
