import React, { useMemo } from 'react';
import type { Athlete, Exercise, Session } from '../../models/training';
import {
  estimateSessionMinutes,
  sessionAvgIntensity,
  sessionTotalReps,
  sessionTotalSets,
  sessionTonnage,
} from './blockMetrics';
import {
  sessionExerciseVolumes,
  sessionPurposeBreakdown,
  sessionPurposeTonnageBreakdown,
} from './sessionSummaryMetrics';
import {
  buildDayScopeKpiCards,
  ProgramStatsDashboardLayout,
  ProgramStatsHorizontalBars,
  ProgramStatsKpiGrid,
  ProgramStatsPurposeBlock,
  ProgramStatsStatusCard,
} from './programStatsShared';
import {
  computeSessionExecution,
  type SessionExecutionContext,
} from './programExecutionStats';
import { evaluateDayVerdict, sessionIntensityRange } from './programStatsVerdict';

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
    () => sessionTonnage(session, athlete, exercises),
    [session, athlete, exercises],
  );

  const daySharePct = useMemo(() => {
    if (weekTonnage <= 0 || dayTonnage <= 0) return 0;
    return Math.round((dayTonnage / weekTonnage) * 100);
  }, [weekTonnage, dayTonnage]);

  const sessionMetrics = useMemo(
    () => ({
      sets: sessionTotalSets(blocks),
      reps: sessionTotalReps(blocks),
      avgPct: sessionAvgIntensity(blocks),
      minutes: estimateSessionMinutes(session),
      purpose: sessionPurposeBreakdown(blocks),
      purposeTonnage: sessionPurposeTonnageBreakdown(blocks, athlete, exercises),
      intensityRange: sessionIntensityRange(blocks),
    }),
    [blocks, session, athlete, exercises],
  );

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
    () => sessionExerciseVolumes(blocks, athlete, exercises, 6),
    [blocks, athlete, exercises],
  );

  const kpiCards = buildDayScopeKpiCards(isEs, {
    tonnage: dayTonnage,
    weekSharePct: daySharePct,
    avgPct: sessionMetrics.avgPct,
    intensityMin: sessionMetrics.intensityRange.min,
    intensityMax: sessionMetrics.intensityRange.max,
    sets: sessionMetrics.sets,
    reps: sessionMetrics.reps,
    minutes: sessionMetrics.minutes,
    execution: execution
      ? {
          completedSets: execution.completedSets,
          prescribedSets: execution.prescribedSets,
          completionPct: execution.completionPct,
        }
      : null,
  });

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-tab-stats"
      className={`wolf-program-day-stats wolf-program-day-stats--day wolf-program-day-board__pane${dashboard ? ' wolf-program-day-stats--dashboard' : ''}`}
    >
      <ProgramStatsDashboardLayout
        dashboard={dashboard}
        variant="day"
        kpis={<ProgramStatsKpiGrid cards={kpiCards} />}
        status={
          <ProgramStatsStatusCard
            title={verdict.title}
            message={verdict.message}
            tone={verdict.tone}
            isEs={isEs}
            compact
            executionLabel={
              execution
                ? isEs
                  ? `${execution.completionPct}% completado`
                  : `${execution.completionPct}% completed`
                : undefined
            }
          />
        }
        charts={
          <ProgramStatsPurposeBlock
            purpose={sessionMetrics.purpose}
            purposeTonnage={sessionMetrics.purposeTonnage}
            avgPct={sessionMetrics.avgPct}
            isEs={isEs}
            title={isEs ? 'Distribución por intensidad (hoy)' : 'Intensity distribution (today)'}
          />
        }
        breakdown={
          exerciseRows.length > 0 ? (
            <ProgramStatsHorizontalBars
              title={isEs ? 'Carga por ejercicio' : 'Load by exercise'}
              slices={exerciseRows}
              isEs={isEs}
              maxSlices={6}
            />
          ) : null
        }
      />
    </section>
  );
};
