import React, { useMemo } from 'react';
import type { Athlete, Exercise, ProgramWeek, Session } from '../../models/training';
import {
  estimateSessionMinutes,
  sessionTotalReps,
  sessionTotalSets,
} from './blockMetrics';
import { sessionPurposeBreakdown } from './sessionSummaryMetrics';
import {
  computeSessionExecution,
  type SessionExecutionContext,
} from './programExecutionStats';
import { evaluateDayVerdict } from './programStatsVerdict';
import { formatStatsDuration } from './programStatsShared';
import { buildPctDelta, volumeDeltaPct } from './statsComparison';
import { formatStatsKg, statsBlockTonnage, statsExerciseVolumes, statsSessionTonnage } from './statsTonnage';
import {
  computeSessionScienceSummary,
  computeStimulusDistribution,
  formatShortDate,
} from './programScienceStats';
import { buildDayInsights, pickHeroInsight } from './statsInsights';
import {
  ExerciseRanking,
  InsightCard,
  MetricCard,
  ScienceDistributionBar,
  SectionCard,
  StatusBadge,
  TimelineChart,
} from './stats-ds';

export interface SessionDayStatsPanelProps {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  weekNumber: number;
  dayNumber: number;
  dayLabel?: string;
  /** Optional calendar date ISO when program has startDate */
  dayDateIso?: string | null;
  coachNote?: string | null;
  weekTonnage: number;
  /** Current week — used for vs previous day comparison */
  weekData?: ProgramWeek;
  onSelectDay?: (dayNumber: number) => void;
  executionContext?: SessionExecutionContext;
  /** Scope / athlete controls rendered inside the dashboard shell. */
  toolbar?: React.ReactNode;
}

export const SessionDayStatsPanel: React.FC<SessionDayStatsPanelProps> = ({
  session,
  athlete,
  exercises,
  isEs,
  weekNumber,
  dayNumber,
  dayLabel,
  dayDateIso,
  coachNote,
  weekTonnage,
  weekData,
  executionContext,
  toolbar,
}) => {
  const blocks = session.exercises;

  const science = useMemo(
    () => computeSessionScienceSummary(session, athlete, exercises),
    [session, athlete, exercises],
  );

  const stimulus = useMemo(
    () => computeStimulusDistribution(session, athlete, exercises),
    [session, athlete, exercises],
  );

  const dayTonnage = science.tonnage;

  const daySharePct = useMemo(() => {
    if (weekTonnage <= 0 || dayTonnage <= 0) return 0;
    return Math.round((dayTonnage / weekTonnage) * 100);
  }, [weekTonnage, dayTonnage]);

  const prevDayTonnage = useMemo(() => {
    const days = [...(weekData?.days ?? [])].sort((a, b) => a.dayNumber - b.dayNumber);
    const idx = days.findIndex((d) => d.dayNumber === dayNumber);
    if (idx <= 0) return null;
    const prev = days[idx - 1];
    if (!prev) return null;
    return statsSessionTonnage(prev.session, athlete, exercises);
  }, [weekData, dayNumber, athlete, exercises]);

  const volumeDelta = useMemo(() => {
    if (prevDayTonnage == null) return undefined;
    return buildPctDelta(
      volumeDeltaPct(dayTonnage, prevDayTonnage),
      isEs ? 'vs día anterior' : 'vs previous day',
      isEs,
    );
  }, [dayTonnage, prevDayTonnage, isEs]);

  const weekAvgTonnage = useMemo(() => {
    const days = weekData?.days ?? [];
    const active = days
      .map((d) => statsSessionTonnage(d.session, athlete, exercises))
      .filter((t) => t > 0);
    if (active.length < 2) return null;
    return active.reduce((s, n) => s + n, 0) / active.length;
  }, [weekData, athlete, exercises]);

  const vsWeekAvgDelta = useMemo(() => {
    if (weekAvgTonnage == null || volumeDelta) return undefined;
    return buildPctDelta(
      volumeDeltaPct(dayTonnage, weekAvgTonnage),
      isEs ? 'vs media semanal' : 'vs week avg',
      isEs,
    );
  }, [dayTonnage, weekAvgTonnage, volumeDelta, isEs]);

  const purpose = useMemo(() => sessionPurposeBreakdown(blocks), [blocks]);
  const sets = useMemo(() => sessionTotalSets(blocks), [blocks]);
  const reps = useMemo(() => sessionTotalReps(blocks), [blocks]);
  const minutes = science.durationMinutes || estimateSessionMinutes(session);

  const execution = useMemo(
    () =>
      executionContext
        ? computeSessionExecution(session, weekNumber, dayNumber, executionContext)
        : null,
    [executionContext, session, weekNumber, dayNumber],
  );

  const verdict = useMemo(
    () => evaluateDayVerdict(session, athlete, exercises, isEs),
    [session, athlete, exercises, isEs],
  );

  const exerciseRows = useMemo(
    () => statsExerciseVolumes(blocks, athlete, exercises, 6),
    [blocks, athlete, exercises],
  );

  const timelinePoints = useMemo(
    () =>
      blocks
        .map((block, index) => ({
          key: index,
          label: `B${index + 1}`,
          value: statsBlockTonnage(block, athlete, exercises),
        }))
        .filter((point) => point.value > 0),
    [blocks, athlete, exercises],
  );

  const insights = useMemo(
    () =>
      buildDayInsights({
        session,
        athlete,
        exercises,
        isEs,
        purpose,
        exerciseVolumes: exerciseRows,
        avgPct: science.intensityWeighted,
        verdict,
      }),
    [session, athlete, exercises, isEs, purpose, exerciseRows, science.intensityWeighted, verdict],
  );

  const heroInsight = useMemo(() => pickHeroInsight(insights), [insights]);

  const showBlockTimeline = timelinePoints.length >= 3;
  const note = coachNote?.trim() || null;
  const dateLabel = dayDateIso ? formatShortDate(dayDateIso, isEs) : null;

  const seriesRepsSub = execution
    ? isEs
      ? `${execution.completedSets}/${execution.prescribedSets} series · ${execution.completedReps}/${reps} reps · ${execution.completionPct}%`
      : `${execution.completedSets}/${execution.prescribedSets} sets · ${execution.completedReps}/${reps} reps · ${execution.completionPct}%`
    : isEs
      ? `${sets} series · ${reps} reps`
      : `${sets} sets · ${reps} reps`;

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-tab-stats"
      className="wolf-program-day-stats wolf-program-day-stats--day wolf-program-day-stats--ds"
    >
      <div className="wl-stats-ds wl-stats-ds--ios">
        {toolbar ? <div className="wl-stats-ds__toolbar">{toolbar}</div> : null}

        {(dayLabel || dateLabel) && (
          <p className="wl-stats-day-meta">
            {dayLabel ? <span className="wl-stats-day-meta__label">{dayLabel}</span> : null}
            {dateLabel ? <span className="wl-stats-day-meta__date">{dateLabel}</span> : null}
          </p>
        )}

        {heroInsight ? <InsightCard insights={[heroInsight]} isEs={isEs} hero /> : null}

        {note ? (
          <div className="wl-stats-day-note" role="note">
            <span className="wl-stats-day-note__title">
              {isEs ? 'Notas y objetivo' : 'Notes & objective'}
            </span>
            <p className="wl-stats-day-note__body">{note}</p>
          </div>
        ) : null}

        <div className="wl-stats-ds__metrics" aria-label={isEs ? 'Resumen' : 'Summary'}>
          <MetricCard
            label={isEs ? 'Volumen' : 'Volume'}
            value={formatStatsKg(dayTonnage)}
            sub={daySharePct > 0 ? (isEs ? `${daySharePct}% de la semana` : `${daySharePct}% of week`) : undefined}
            delta={volumeDelta ?? vsWeekAvgDelta}
            accent
          />
          <MetricCard
            label="IMP"
            value={science.intensityWeighted > 0 ? `${science.intensityWeighted}%` : '—'}
            sub={
              science.intensityRange.max > 0
                ? isEs
                  ? `Rango ${science.intensityRange.min}–${science.intensityRange.max}%`
                  : `Range ${science.intensityRange.min}–${science.intensityRange.max}%`
                : isEs
                  ? 'Ponderada por volumen'
                  : 'Volume-weighted'
            }
          />
          <MetricCard
            label={isEs ? 'Carga relativa (AU)' : 'Training Load (AU)'}
            value={science.trainingLoad > 0 ? science.trainingLoad : '—'}
            sub={isEs ? 'Carga prescrita' : 'Prescribed load'}
          />
          <MetricCard
            label={isEs ? 'Densidad' : 'Density'}
            value={science.density > 0 ? `${science.density}` : '—'}
            sub={
              science.densityEstimated
                ? `${formatStatsDuration(minutes)} · ${isEs ? 'estimada' : 'estimated'}`
                : formatStatsDuration(minutes)
            }
          />
          <MetricCard
            label={isEs ? 'Estado' : 'Status'}
            value={<StatusBadge label={verdict.title} tone={verdict.tone} />}
            sub={seriesRepsSub}
            subTone={execution ? 'success' : 'muted'}
          />
        </div>

        <div className="wl-stats-ds__grid wl-stats-ds__grid--split">
          <SectionCard title={isEs ? 'Estímulo — Zonas científicas' : 'Stimulus — Science zones'}>
            <ScienceDistributionBar slices={stimulus} isEs={isEs} />
          </SectionCard>

          <SectionCard title={isEs ? 'Carga — Ranking' : 'Load — Ranking'}>
            <ExerciseRanking slices={exerciseRows} isEs={isEs} maxSlices={6} />
          </SectionCard>
        </div>

        {showBlockTimeline ? (
          <SectionCard title={isEs ? 'Carga — Bloques' : 'Load — Blocks'}>
            <TimelineChart points={timelinePoints} isEs={isEs} showValues valueUnit="kg" />
          </SectionCard>
        ) : null}

        {insights.length > 1 ? (
          <SectionCard title={isEs ? 'Insights' : 'Insights'}>
            <InsightCard insights={insights.slice(0, 4)} isEs={isEs} />
          </SectionCard>
        ) : null}
      </div>
    </section>
  );
};
