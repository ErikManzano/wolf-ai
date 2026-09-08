import React, { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram } from '../../models/training';
import { computeProgramAggregateMetrics } from './programAggregateStats';
import {
  computeProgramExecution,
  type SessionExecutionContext,
} from './programExecutionStats';
import { formatStatsKg } from './statsTonnage';
import { computeWeekScience } from './programScienceStats';
import { buildProgramInsights, pickHeroInsight } from './statsInsights';
import {
  AthletesAcwrRoster,
  type AthleteAcwrRow,
} from './AthletesAcwrRoster';
import {
  ExerciseRanking,
  InsightCard,
  LineTrendChart,
  MetricCard,
  ScienceDistributionBar,
  SectionCard,
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
  toolbar?: React.ReactNode;
  /** Enrolled athletes for mesocycle ACWR roster */
  rosterAthletes?: AthleteAcwrRow[];
  selectedAthleteId?: string;
  onSelectAthlete?: (athleteProfileId: string) => void;
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
  rosterAthletes = [],
  selectedAthleteId,
  onSelectAthlete,
}) => {
  const metrics = useMemo(
    () => computeProgramAggregateMetrics(program, athlete, exercises, isEs, 8),
    [program, athlete, exercises, isEs],
  );

  const science = useMemo(
    () => computeWeekScience(program, selectedWeek, athlete, exercises, null),
    [program, selectedWeek, athlete, exercises],
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

  const insights = useMemo(
    () =>
      buildProgramInsights({
        isEs,
        weekRows: metrics.weekRows,
        purpose: metrics.purpose,
        exerciseVolumes: metrics.exerciseVolumes,
        avgPct: metrics.avgPct,
      }),
    [isEs, metrics],
  );

  const heroInsight = useMemo(() => pickHeroInsight(insights), [insights]);

  const selectedTrendIndex = useMemo(() => {
    if (!science) return undefined;
    const idx = science.trend.labels.findIndex((l) => l === `Sem ${selectedWeek}`);
    return idx >= 0 ? idx : undefined;
  }, [science, selectedWeek]);

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-tab-stats"
      className="wolf-program-day-stats wolf-program-day-stats--program wolf-program-day-stats--ds"
    >
      <div className="wl-stats-ds wl-stats-ds--ios">
        {toolbar ? <div className="wl-stats-ds__toolbar">{toolbar}</div> : null}

        {heroInsight ? <InsightCard insights={[heroInsight]} isEs={isEs} hero /> : null}

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
            label="IMP"
            value={
              science && science.summary.intensityWeighted > 0
                ? `${science.summary.intensityWeighted}%`
                : metrics.avgPct > 0
                  ? `${metrics.avgPct}%`
                  : '—'
            }
            sub={
              isEs
                ? `Semana ${selectedWeek} · ponderada por volumen`
                : `Week ${selectedWeek} · volume-weighted`
            }
          />
          <MetricCard
            label={isEs ? 'Carga relativa (AU)' : 'Training Load (AU)'}
            value={science?.summary.trainingLoad ?? '—'}
            sub={
              science?.fatigue.rampRate != null
                ? isEs
                  ? `Ramp ${science.fatigue.rampRate > 0 ? '+' : ''}${science.fatigue.rampRate}%`
                  : `Ramp ${science.fatigue.rampRate > 0 ? '+' : ''}${science.fatigue.rampRate}%`
                : isEs
                  ? 'Semana seleccionada'
                  : 'Selected week'
            }
          />
          <MetricCard
            label={isEs ? 'ACWR mesociclo' : 'Mesocycle ACWR'}
            value={
              science?.fatigue.acwr.value != null ? (
                <StatusBadge
                  label={String(science.fatigue.acwr.value)}
                  tone={
                    science.fatigue.acwr.status === 'OPTIMAL'
                      ? 'optimal'
                      : science.fatigue.acwr.status === 'ATENCION'
                        ? 'heavy'
                        : science.fatigue.acwr.status === 'RIESGO'
                          ? 'intense'
                          : 'none'
                  }
                />
              ) : (
                '—'
              )
            }
            sub={isEs ? 'Aguda / crónica prescrita' : 'Prescribed acute / chronic'}
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
                  ? `${metrics.weekCount} sem · ${metrics.sessionCount} días`
                  : `${metrics.weekCount} wk · ${metrics.sessionCount} days`
            }
            subTone={execution ? 'success' : 'muted'}
          />
        </div>

        <SectionCard title={isEs ? 'Estímulo — Zonas científicas' : 'Stimulus — Science zones'}>
          {science ? (
            <ScienceDistributionBar slices={science.stimulusDistribution} isEs={isEs} />
          ) : null}
        </SectionCard>

        {science && science.trend.labels.length > 1 ? (
          <SectionCard
            title={isEs ? 'Tendencia del mesociclo' : 'Mesocycle trend'}
            subtitle={isEs ? 'Tonelaje e IMP' : 'Tonnage and IMP'}
          >
            <LineTrendChart
              labels={science.trend.labels}
              series={[
                {
                  id: 'tonnage',
                  label: isEs ? 'Tonelaje' : 'Tonnage',
                  values: science.trend.tonnageData,
                  unit: 'kg',
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
                onSelectWeek
                  ? (idx) => {
                      const w = [...program.weeks].sort((a, b) => a.weekNumber - b.weekNumber)[idx];
                      if (w) onSelectWeek(w.weekNumber);
                    }
                  : undefined
              }
              referenceValue={science.trend.chronicBaseline}
              referenceLabel={isEs ? 'Baseline crónica' : 'Chronic baseline'}
            />
          </SectionCard>
        ) : null}

        <div className="wl-stats-ds__grid wl-stats-ds__grid--split">
          <SectionCard
            title={isEs ? 'Carga — Semanas' : 'Load — Weeks'}
            subtitle={isEs ? 'Clic para seleccionar' : 'Click to select'}
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
          </SectionCard>

          <SectionCard title={isEs ? 'Atletas — ACWR' : 'Athletes — ACWR'}>
            <AthletesAcwrRoster
              program={program}
              weekNumber={selectedWeek}
              athletes={rosterAthletes}
              isEs={isEs}
              selectedAthleteId={selectedAthleteId}
              onSelectAthlete={onSelectAthlete}
            />
          </SectionCard>
        </div>

        <SectionCard title={isEs ? 'Carga — Ranking global' : 'Load — Global ranking'}>
          <ExerciseRanking slices={metrics.exerciseVolumes} isEs={isEs} maxSlices={8} />
        </SectionCard>

        {insights.length > 1 ? (
          <SectionCard title={isEs ? 'Insights' : 'Insights'}>
            <InsightCard insights={insights.slice(0, 4)} isEs={isEs} />
          </SectionCard>
        ) : null}
      </div>
    </section>
  );
};
