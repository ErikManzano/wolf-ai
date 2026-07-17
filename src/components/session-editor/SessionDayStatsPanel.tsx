import React, { useMemo } from 'react';
import type { Athlete, Exercise, Session } from '../../models/training';
import {
  estimateSessionMinutes,
  sessionAvgIntensity,
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
import { buildDayInsights, purposeIntentLine } from './statsInsights';
import { formatStatsKg, statsBlockTonnage, statsExerciseVolumes, statsSessionTonnage } from './statsTonnage';
import {
  DistributionBar,
  ExerciseRanking,
  InsightCard,
  MetricCard,
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
  weekTonnage: number;
  onSelectDay?: (dayNumber: number) => void;
  executionContext?: SessionExecutionContext;
  /** GA-style viewport grid — all widgets visible without page scroll. */
  dashboard?: boolean;
}

export const SessionDayStatsPanel: React.FC<SessionDayStatsPanelProps> = ({
  session,
  athlete,
  exercises,
  isEs,
  weekNumber,
  dayNumber,
  weekTonnage,
  executionContext,
  dashboard = false,
}) => {
  const blocks = session.exercises;

  const dayTonnage = useMemo(
    () => statsSessionTonnage(session, athlete, exercises),
    [session, athlete, exercises],
  );

  const daySharePct = useMemo(() => {
    if (weekTonnage <= 0 || dayTonnage <= 0) return 0;
    return Math.round((dayTonnage / weekTonnage) * 100);
  }, [weekTonnage, dayTonnage]);

  const purpose = useMemo(() => sessionPurposeBreakdown(blocks), [blocks]);
  const avgPct = useMemo(() => sessionAvgIntensity(blocks), [blocks]);
  const sets = useMemo(() => sessionTotalSets(blocks), [blocks]);
  const reps = useMemo(() => sessionTotalReps(blocks), [blocks]);
  const minutes = useMemo(() => estimateSessionMinutes(session), [session]);

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

  const insights = useMemo(
    () =>
      buildDayInsights({
        session,
        athlete,
        exercises,
        isEs,
        purpose,
        exerciseVolumes: exerciseRows,
        avgPct,
        verdict,
      }),
    [session, athlete, exercises, isEs, purpose, exerciseRows, avgPct, verdict],
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

  const intentLine = purposeIntentLine(purpose, isEs);

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-tab-stats"
      className={`wolf-program-day-stats wolf-program-day-stats--day wolf-program-day-stats--ds wolf-program-day-board__pane${dashboard ? ' wolf-program-day-stats--dashboard' : ''}`}
    >
      <div className="wl-stats-ds">
        <div className="wl-stats-ds__metrics" aria-label={isEs ? 'Resumen' : 'Summary'}>
          <MetricCard
            label={isEs ? 'Volumen' : 'Volume'}
            value={formatStatsKg(dayTonnage)}
            sub={daySharePct > 0 ? (isEs ? `${daySharePct}% de la semana` : `${daySharePct}% of week`) : undefined}
            accent
          />
          <MetricCard
            label={isEs ? 'Intensidad' : 'Intensity'}
            value={avgPct > 0 ? `${avgPct}%` : '—'}
            sub={isEs ? 'Media % 1RM' : 'Avg % 1RM'}
          />
          <MetricCard
            label={isEs ? 'Series · Reps' : 'Sets · Reps'}
            value={
              execution
                ? `${execution.completedSets}/${execution.prescribedSets}`
                : sets > 0
                  ? sets
                  : '—'
            }
            sub={
              execution
                ? isEs
                  ? `${execution.completedReps}/${reps} reps · ${execution.completionPct}%`
                  : `${execution.completedReps}/${reps} reps · ${execution.completionPct}%`
                : isEs
                  ? `${reps} reps prescritas`
                  : `${reps} prescribed reps`
            }
            subTone={execution ? 'success' : 'muted'}
          />
          <MetricCard
            label={isEs ? 'Duración' : 'Duration'}
            value={formatStatsDuration(minutes)}
            sub={isEs ? 'Estimada' : 'Estimated'}
          />
          <MetricCard
            label={isEs ? 'Estado' : 'Status'}
            value={<StatusBadge label={verdict.title} tone={verdict.tone} />}
            sub={
              execution
                ? isEs
                  ? `${execution.completedSets}/${execution.prescribedSets} series · ${execution.completedReps}/${reps} reps`
                  : `${execution.completedSets}/${execution.prescribedSets} sets · ${execution.completedReps}/${reps} reps`
                : isEs
                  ? `${sets} series · ${reps} reps`
                  : `${sets} sets · ${reps} reps`
            }
            subTone={execution ? 'success' : 'muted'}
          />
        </div>

        <div className="wl-stats-ds__grid wl-stats-ds__grid--split">
          <SectionCard title={isEs ? 'Distribución — Intención' : 'Distribution — Intent'}>
            <DistributionBar purpose={purpose} isEs={isEs} insight={intentLine} />
          </SectionCard>

          <SectionCard title={isEs ? 'Timeline — Bloques' : 'Timeline — Blocks'}>
            <TimelineChart
              points={timelinePoints}
              isEs={isEs}
              showValues
              valueUnit="kg"
            />
          </SectionCard>
        </div>

        <SectionCard title={isEs ? 'Carga — Ranking' : 'Load — Ranking'}>
          <ExerciseRanking slices={exerciseRows} isEs={isEs} maxSlices={6} />
        </SectionCard>

        <SectionCard title={isEs ? 'Insights Wolf' : 'Wolf Insights'}>
          <InsightCard insights={insights} isEs={isEs} />
        </SectionCard>
      </div>
    </section>
  );
};
