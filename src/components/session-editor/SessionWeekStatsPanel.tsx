import React, { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram, ProgramWeek } from '../../models/training';
import { computeWeekAggregateMetrics } from './programWeekStats';
import {
  computeWeekExecution,
  type SessionExecutionContext,
} from './programExecutionStats';
import { buildPctDelta, buildPtsDelta, intensityDeltaPts, volumeDeltaPct } from './statsComparison';
import { formatStatsKg } from './statsTonnage';
import { computeWeekScience, type AcwrStatus } from './programScienceStats';
import { buildWeekInsights, pickHeroInsight } from './statsInsights';
import {
  ExerciseRanking,
  InsightCard,
  LineTrendChart,
  MetricCard,
  ScienceDistributionBar,
  SectionCard,
  StatusBadge,
  TimelineChart,
  type StatusBadgeTone,
} from './stats-ds';

export interface SessionWeekStatsPanelProps {
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  weekNumber: number;
  weekTonnage: number;
  weekData?: ProgramWeek;
  /** Full program — enables science fatigue + multi-week trend */
  program?: GeneratedProgram;
  /** Previous week in the mesocycle — for N vs N−1 comparisons */
  previousWeekData?: ProgramWeek;
  selectedDay: number;
  onSelectDay?: (dayNumber: number) => void;
  onSelectWeek?: (weekNumber: number) => void;
  executionContext?: SessionExecutionContext;
  /** Scope / athlete controls rendered inside the dashboard shell. */
  toolbar?: React.ReactNode;
  /** Compact column for editor split layout */
  compact?: boolean;
}

function acwrTone(status: AcwrStatus | null | undefined): StatusBadgeTone {
  if (status === 'OPTIMAL') return 'optimal';
  if (status === 'ATENCION') return 'heavy';
  if (status === 'RIESGO') return 'intense';
  return 'none';
}

export const SessionWeekStatsPanel: React.FC<SessionWeekStatsPanelProps> = ({
  athlete,
  exercises,
  isEs,
  weekNumber,
  weekTonnage: _weekTonnage,
  weekData,
  program,
  previousWeekData,
  selectedDay,
  onSelectDay,
  onSelectWeek,
  executionContext,
  toolbar,
  compact = false,
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

  const science = useMemo(
    () =>
      program
        ? computeWeekScience(program, weekNumber, athlete, exercises, null)
        : null,
    [program, weekNumber, athlete, exercises],
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
      science && prevMetrics && prevMetrics.avgPct > 0
        ? buildPtsDelta(
            intensityDeltaPts(science.summary.intensityWeighted, prevMetrics.avgPct),
            isEs ? 'vs semana anterior' : 'vs previous week',
            isEs,
          )
        : prevMetrics && prevMetrics.avgPct > 0
          ? buildPtsDelta(
              intensityDeltaPts(metrics.avgPct, prevMetrics.avgPct),
              isEs ? 'vs semana anterior' : 'vs previous week',
              isEs,
            )
          : undefined,
    [science, metrics.avgPct, prevMetrics, isEs],
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
        avgPct: science?.summary.intensityWeighted ?? metrics.avgPct,
        prevWeekTonnage: prevMetrics?.tonnage,
        prevWeekAvgPct: prevMetrics?.avgPct,
        weekTonnage: science?.summary.tonnage ?? metrics.tonnage,
      }),
    [isEs, metrics, science, prevMetrics],
  );

  const heroInsight = useMemo(() => pickHeroInsight(insights), [insights]);

  const imp = science?.summary.intensityWeighted ?? metrics.avgPct;
  const tl = science?.summary.trainingLoad;
  const range = science?.summary.intensityRange;
  const density = science?.summary.density;
  const monotony = science?.fatigue.monotony;
  const strain = science?.fatigue.strain;
  const acwr = science?.fatigue.acwr;
  const ramp = science?.fatigue.rampRate;

  const selectedTrendIndex = useMemo(() => {
    if (!science) return undefined;
    const idx = science.trend.labels.findIndex((_, i) => {
      const week = program?.weeks.find((w) => w.weekNumber === weekNumber);
      return week != null && science.trend.labels[i] === `Sem ${weekNumber}`;
    });
    return idx >= 0 ? idx : undefined;
  }, [science, program, weekNumber]);

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-tab-stats"
      className={`wolf-program-day-stats wolf-program-day-stats--week wolf-program-day-stats--ds${compact ? ' wolf-program-day-stats--compact' : ''}`}
    >
      <div className="wl-stats-ds wl-stats-ds--ios">
        {toolbar ? <div className="wl-stats-ds__toolbar">{toolbar}</div> : null}

        {heroInsight ? (
          <InsightCard insights={[heroInsight]} isEs={isEs} hero />
        ) : null}

        <div className="wl-stats-ds__metrics" aria-label={isEs ? 'Resumen' : 'Summary'}>
          <MetricCard
            label={isEs ? 'Volumen semanal' : 'Weekly volume'}
            value={formatStatsKg(science?.summary.tonnage ?? metrics.tonnage)}
            sub={isEs ? `${metrics.dayCount} días · carga prescrita` : `${metrics.dayCount} days · prescribed`}
            delta={volumeDelta}
            accent
          />
          <MetricCard
            label={isEs ? 'IMP' : 'IMP'}
            value={imp > 0 ? `${imp}%` : '—'}
            sub={
              range && range.max > 0
                ? isEs
                  ? `Rango ${range.min}–${range.max}% · ponderada por volumen`
                  : `Range ${range.min}–${range.max}% · volume-weighted`
                : isEs
                  ? 'Media ponderada por volumen'
                  : 'Volume-weighted mean'
            }
            delta={intensityDelta}
          />
          <MetricCard
            label={isEs ? 'Carga relativa (AU)' : 'Training Load (AU)'}
            value={tl != null ? tl : '—'}
            sub={isEs ? 'Σ series×reps×(%/100)' : 'Σ sets×reps×(%/100)'}
          />
          {!compact ? (
            <MetricCard
              label={isEs ? 'Densidad' : 'Density'}
              value={density != null && density > 0 ? `${density}` : '—'}
              sub={
                science?.summary.densityEstimated
                  ? isEs
                    ? 'kg/min · estimada'
                    : 'kg/min · estimated'
                  : 'kg/min'
              }
            />
          ) : null}
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

        {science ? (
          <div className="wl-stats-ds__metrics wl-stats-ds__metrics--fatigue" aria-label={isEs ? 'Fatiga (mesociclo)' : 'Fatigue (mesocycle)'}>
            <MetricCard
              label={isEs ? 'Monotonía' : 'Monotony'}
              value={monotony != null ? monotony : '—'}
              sub={isEs ? 'Sobre días del microciclo' : 'Over microcycle days'}
            />
            <MetricCard
              label="Strain"
              value={strain != null ? strain : '—'}
              sub={isEs ? 'TL × monotonía' : 'TL × monotony'}
            />
            <MetricCard
              label={isEs ? 'ACWR mesociclo' : 'Mesocycle ACWR'}
              value={
                acwr?.value != null ? (
                  <StatusBadge
                    label={String(acwr.value)}
                    tone={acwrTone(acwr.status)}
                  />
                ) : (
                  '—'
                )
              }
              sub={
                acwr?.status
                  ? isEs
                    ? `${acwr.status} · aguda/crónica prescrita`
                    : `${acwr.status} · prescribed acute/chronic`
                  : isEs
                    ? 'No “últimos 28 días” calendario'
                    : 'Not calendar rolling 28d'
              }
            />
            <MetricCard
              label={isEs ? 'Ramp rate' : 'Ramp rate'}
              value={ramp != null ? `${ramp > 0 ? '+' : ''}${ramp}%` : '—'}
              sub={isEs ? 'TL vs semana anterior' : 'TL vs previous week'}
            />
          </div>
        ) : null}

        <SectionCard
          title={isEs ? 'Estímulo — Zonas científicas' : 'Stimulus — Science zones'}
          subtitle={isEs ? 'Buckets DeepSeek (solo Estadísticas)' : 'DeepSeek buckets (Stats only)'}
        >
          {science ? (
            <ScienceDistributionBar slices={science.stimulusDistribution} isEs={isEs} />
          ) : (
            <p className="wl-stats-rank__empty">
              {isEs ? 'Pasa el programa completo para zonas científicas.' : 'Pass full program for science zones.'}
            </p>
          )}
        </SectionCard>

        {science && science.trend.labels.length > 1 && !compact ? (
          <SectionCard
            title={isEs ? 'Tendencia del mesociclo' : 'Mesocycle trend'}
            subtitle={isEs ? 'Tonelaje e IMP por semana' : 'Tonnage and IMP by week'}
          >
            <LineTrendChart
              labels={science.trend.labels}
              series={[
                {
                  id: 'tonnage',
                  label: isEs ? 'Tonelaje' : 'Tonnage',
                  values: science.trend.tonnageData,
                  unit: 'kg',
                  color: 'var(--stats-orange)',
                },
                {
                  id: 'imp',
                  label: 'IMP',
                  values: science.trend.intensityData,
                  unit: 'pct',
                  color: 'var(--stats-blue)',
                },
              ]}
              isEs={isEs}
              selectedIndex={selectedTrendIndex}
              onSelectIndex={
                onSelectWeek && program
                  ? (idx) => {
                      const w = [...program.weeks].sort((a, b) => a.weekNumber - b.weekNumber)[idx];
                      if (w) onSelectWeek(w.weekNumber);
                    }
                  : undefined
              }
              referenceValue={science.trend.chronicBaseline}
              referenceLabel={isEs ? 'Baseline crónica (AU/sem)' : 'Chronic baseline (AU/wk)'}
            />
          </SectionCard>
        ) : null}

        {!compact ? (
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
        ) : null}

        {!compact && insights.length > 1 ? (
          <SectionCard title={isEs ? 'Insights' : 'Insights'}>
            <InsightCard insights={insights.slice(0, 4)} isEs={isEs} />
          </SectionCard>
        ) : null}
      </div>
    </section>
  );
};
