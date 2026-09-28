import React, { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram } from '../../models/training';
import { computeProgramAggregateMetrics } from './programAggregateStats';
import {
  computeProgramExecution,
  type SessionExecutionContext,
} from './programExecutionStats';
import { buildProgramIntensityBins, buildProgramScatterSeries } from './programChartSeries';
import { formatStatsKg } from './statsTonnage';
import { computeWeekScience } from './programScienceStats';
import type { AthleteAcwrRow } from './AthletesAcwrRoster';
import {
  ExerciseRanking,
  IntensityHistogram,
  LineTrendChart,
  MetricCard,
  ScienceDistributionBar,
  SectionCard,
  StatusBadge,
  TimelineChart,
  VolumeIntensityScatter,
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
  /** @deprecated Roster ACWR retirado del dashboard compacto */
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

  const selectedTrendIndex = useMemo(() => {
    if (!science) return undefined;
    const idx = science.trend.labels.findIndex((l) => l === `Sem ${selectedWeek}`);
    return idx >= 0 ? idx : undefined;
  }, [science, selectedWeek]);

  const programScatter = useMemo(
    () =>
      buildProgramScatterSeries({
        program,
        athlete,
        exercises,
        isEs,
      }),
    [program, athlete, exercises, isEs],
  );

  const programIntensityBins = useMemo(
    () =>
      buildProgramIntensityBins({
        program,
        athlete,
        exercises,
      }),
    [program, athlete, exercises],
  );

  const showTrend = Boolean(science && science.trend.labels.length > 1);
  const showScatter = programScatter.length > 0;

  const boardClass = [
    'wl-stats-ds__program-board',
    !showTrend ? 'wl-stats-ds__program-board--no-trend' : '',
    !showScatter ? 'wl-stats-ds__program-board--no-scatter' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-tab-stats"
      className="wolf-program-day-stats wolf-program-day-stats--program wolf-program-day-stats--ds"
    >
      <div className="wl-stats-ds wl-stats-ds--ios wl-stats-ds--program-compact">
        {toolbar ? <div className="wl-stats-ds__toolbar">{toolbar}</div> : null}

        <div
          className="wl-stats-ds__metrics wl-stats-ds__metrics--program"
          aria-label={isEs ? 'Resumen' : 'Summary'}
        >
          <MetricCard
            label={isEs ? 'Volumen total' : 'Total volume'}
            value={formatStatsKg(metrics.tonnage)}
            sub={
              selectedWeekRow && selectedWeekRow.sharePct > 0
                ? isEs
                  ? `S${selectedWeek}: ${selectedWeekRow.sharePct}%`
                  : `W${selectedWeek}: ${selectedWeekRow.sharePct}%`
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
            sub={isEs ? `Sem. ${selectedWeek}` : `Wk ${selectedWeek}`}
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

        <div className="wl-stats-ds__program-layout">
          <div className={`${boardClass} wl-stats-ds__program-board--quad`}>
            {showTrend ? (
              <SectionCard
                className="wl-stats-ds__program-cell wl-stats-ds__program-cell--trend"
                title={isEs ? 'Tendencia' : 'Trend'}
              >
                <LineTrendChart
                  labels={science!.trend.labels}
                  series={[
                    {
                      id: 'tonnage',
                      label: isEs ? 'Tonelaje' : 'Tonnage',
                      values: science!.trend.tonnageData,
                      unit: 'kg',
                    },
                    {
                      id: 'imp',
                      label: 'IMP',
                      values: science!.trend.intensityData,
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
                  referenceValue={science!.trend.chronicBaseline}
                  referenceLabel={isEs ? 'Baseline' : 'Baseline'}
                />
              </SectionCard>
            ) : null}

            {showScatter ? (
              <SectionCard
                className="wl-stats-ds__program-cell wl-stats-ds__program-cell--scatter"
                title={isEs ? 'Volumen × intensidad' : 'Volume × intensity'}
              >
                <VolumeIntensityScatter points={programScatter} isEs={isEs} variant="compact" />
              </SectionCard>
            ) : null}

            <SectionCard
              className="wl-stats-ds__program-cell wl-stats-ds__program-cell--weeks"
              title={isEs ? 'Semanas' : 'Weeks'}
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

            <SectionCard
              className="wl-stats-ds__program-cell wl-stats-ds__program-cell--hist"
              title={isEs ? '%1RM' : '%1RM'}
            >
              <IntensityHistogram bins={programIntensityBins} isEs={isEs} variant="compact" />
            </SectionCard>
          </div>

          <div className="wl-stats-ds__program-board wl-stats-ds__program-board--pair">
            <SectionCard
              className="wl-stats-ds__program-cell wl-stats-ds__program-cell--zones"
              title={isEs ? 'Zonas' : 'Zones'}
            >
              {science ? (
                <ScienceDistributionBar slices={science.stimulusDistribution} isEs={isEs} compact />
              ) : null}
            </SectionCard>

            <SectionCard
              className="wl-stats-ds__program-cell wl-stats-ds__program-cell--rank"
              title={isEs ? 'Ejercicios' : 'Exercises'}
            >
              <ExerciseRanking slices={metrics.exerciseVolumes} isEs={isEs} maxSlices={6} />
            </SectionCard>
          </div>
        </div>
      </div>
    </section>
  );
};
