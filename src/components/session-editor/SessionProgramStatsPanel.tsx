import React, { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram } from '../../models/training';
import { computeProgramAggregateMetrics } from './programAggregateStats';
import {
  computeProgramExecution,
  type SessionExecutionContext,
} from './programExecutionStats';
import { formatStatsKg } from './statsTonnage';
import {
  DistributionBar,
  ExerciseRanking,
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
  /** Scope / athlete controls rendered inside the dashboard shell. */
  toolbar?: React.ReactNode;
}

export const SessionProgramStatsPanel: React.FC<SessionProgramStatsPanelProps> = ({
  program,
  athlete,
  exercises,
  isEs,
  selectedWeek,
  onSelectWeek,
  executionContext,
  toolbar,
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

  const selectedWeekRow = useMemo(
    () => metrics.weekRows.find((w) => w.weekNumber === selectedWeek),
    [metrics.weekRows, selectedWeek],
  );
  const prevSelectedWeekRow = useMemo(() => {
    const sorted = [...metrics.weekRows].sort((a, b) => a.weekNumber - b.weekNumber);
    const idx = sorted.findIndex((w) => w.weekNumber === selectedWeek);
    if (idx <= 0) return null;
    return sorted[idx - 1] ?? null;
  }, [metrics.weekRows, selectedWeek]);

  const selectedWeekVolumeDelta = useMemo(() => {
    if (!selectedWeekRow || !prevSelectedWeekRow || prevSelectedWeekRow.tonnage <= 0) return undefined;
    const pct = Math.round(
      ((selectedWeekRow.tonnage - prevSelectedWeekRow.tonnage) / prevSelectedWeekRow.tonnage) * 100,
    );
    if (!Number.isFinite(pct) || pct === 0) return undefined;
    const abs = Math.abs(pct);
    const arrow = pct > 0 ? '↑' : '↓';
    return {
      pct,
      label: isEs
        ? `${arrow} ${abs}% S${selectedWeek} vs S${prevSelectedWeekRow.weekNumber}`
        : `${arrow} ${abs}% W${selectedWeek} vs W${prevSelectedWeekRow.weekNumber}`,
      tone: (pct > 0 ? 'up' : 'down') as 'up' | 'down',
    };
  }, [selectedWeekRow, prevSelectedWeekRow, selectedWeek, isEs]);

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-tab-stats"
      className="wolf-program-day-stats wolf-program-day-stats--program wolf-program-day-stats--ds"
    >
      <div className="wl-stats-ds">
        {toolbar ? <div className="wl-stats-ds__toolbar">{toolbar}</div> : null}
        <div className="wl-stats-ds__metrics" aria-label={isEs ? 'Resumen' : 'Summary'}>
          <MetricCard
            label={isEs ? 'Volumen total' : 'Total volume'}
            value={formatStatsKg(metrics.tonnage)}
            sub={
              selectedWeekRow && selectedWeekRow.sharePct > 0
                ? isEs
                  ? `S${selectedWeek}: ${selectedWeekRow.sharePct}% del total`
                  : `W${selectedWeek}: ${selectedWeekRow.sharePct}% of total`
                : isEs
                  ? 'Programa'
                  : 'Program'
            }
            delta={selectedWeekVolumeDelta}
            accent
          />
          <MetricCard
            label={isEs ? 'Intensidad' : 'Intensity'}
            value={metrics.avgPct > 0 ? `${metrics.avgPct}%` : '—'}
            sub={
              prevSelectedWeekRow && selectedWeekRow && selectedWeekRow.avgPct > 0
                ? isEs
                  ? `Semana actual ${selectedWeekRow.avgPct}% · ant. ${prevSelectedWeekRow.avgPct}%`
                  : `Current week ${selectedWeekRow.avgPct}% · prev ${prevSelectedWeekRow.avgPct}%`
                : isEs
                  ? 'Media % 1RM'
                  : 'Avg % 1RM'
            }
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
            title={isEs ? 'Carga — Semanas' : 'Load — Weeks'}
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

          <SectionCard title={isEs ? 'Carga — Ranking global' : 'Load — Global ranking'}>
            <ExerciseRanking slices={metrics.exerciseVolumes} isEs={isEs} maxSlices={8} />
          </SectionCard>
        </div>
      </div>
    </section>
  );
};
