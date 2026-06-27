import React, { useMemo } from 'react';
import type { Athlete, Exercise, ProgramWeek, Session } from '../../models/training';
import { calcularCargaTotal } from '../../services/trainingEngine';
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
  sessionWorkExerciseCount,
} from './sessionSummaryMetrics';
import {
  buildDayKpiCards,
  ProgramStatsDashboardLayout,
  ProgramStatsDataTable,
  ProgramStatsDayCards,
  ProgramStatsDetailSection,
  ProgramStatsDonutChart,
  ProgramStatsKpiGrid,
  ProgramStatsPurposeBlock,
} from './programStatsShared';
import {
  computeSessionExecution,
  type SessionExecutionContext,
} from './programExecutionStats';
import { sessionIntensityRange } from './programStatsVerdict';

export interface SessionDayStatsPanelProps {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  weekNumber: number;
  dayNumber: number;
  dayLabel?: string;
  weekTonnage: number;
  weekData?: ProgramWeek;
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
  weekData,
  onSelectDay,
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
      exerciseCount: blocks.length,
      workExerciseCount: sessionWorkExerciseCount(blocks),
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

  const weekDays = useMemo(() => {
    if (!weekData?.days.length) return [];
    return weekData.days.map((day) => {
      const dayExecution = executionContext?.assignmentId
        ? computeSessionExecution(day.session, weekNumber, day.dayNumber, executionContext)
        : null;
      return {
        dayNumber: day.dayNumber,
        label: day.label?.trim() || (isEs ? `Día ${day.dayNumber}` : `Day ${day.dayNumber}`),
        tonnage: calcularCargaTotal(day.session, athlete, exercises),
        exerciseCount: day.session.exercises.length,
        isSelected: day.dayNumber === dayNumber,
        executionStatus: dayExecution?.status ?? 'none',
      };
    });
  }, [weekData, athlete, exercises, dayNumber, weekNumber, isEs, executionContext]);

  const exerciseRows = useMemo(
    () => sessionExerciseVolumes(blocks, athlete, exercises, 6),
    [blocks, athlete, exercises],
  );

  const weekLabel = isEs ? `Semana ${weekNumber}` : `Week ${weekNumber}`;

  const kpiCards = buildDayKpiCards(isEs, {
    tonnage: dayTonnage,
    weekSharePct: daySharePct,
    avgPct: sessionMetrics.avgPct,
    intensityMin: sessionMetrics.intensityRange.min,
    intensityMax: sessionMetrics.intensityRange.max,
    sets: sessionMetrics.sets,
    reps: sessionMetrics.reps,
    exerciseCount: sessionMetrics.exerciseCount,
    workExerciseCount: sessionMetrics.workExerciseCount,
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
        kpis={<ProgramStatsKpiGrid cards={kpiCards} />}
        charts={
          <>
            <ProgramStatsDonutChart
              title={isEs ? 'Volumen por ejercicio (hoy)' : 'Volume by exercise (today)'}
              centerLabel={dayTonnage > 0 ? `${dayTonnage.toLocaleString()} kg` : '—'}
              slices={exerciseRows}
              isEs={isEs}
              maxSlices={dashboard ? 6 : undefined}
            />
            <ProgramStatsPurposeBlock
              purpose={sessionMetrics.purpose}
              purposeTonnage={sessionMetrics.purposeTonnage}
              avgPct={sessionMetrics.avgPct}
              isEs={isEs}
              title={isEs ? 'Distribución por intensidad (hoy)' : 'Intensity distribution (today)'}
            />
          </>
        }
        timeline={
          <ProgramStatsDayCards
            title={
              isEs
                ? `Volumen por día de la semana (${weekLabel})`
                : `Volume by day of the week (${weekLabel})`
            }
            days={weekDays}
            isEs={isEs}
            onSelectDay={onSelectDay}
          />
        }
        detail={
          exerciseRows.length > 0 ? (
            <ProgramStatsDetailSection
              title={isEs ? 'Detalle por ejercicio' : 'Exercise breakdown'}
            >
              <ProgramStatsDataTable
                title=""
                columns={[
                  { key: 'exercise', label: isEs ? 'Ejercicio' : 'Exercise' },
                  { key: 'volume', label: isEs ? 'Volumen' : 'Volume', align: 'right' },
                  { key: 'pct', label: isEs ? '% del día' : '% of day', align: 'right' },
                ]}
                rows={exerciseRows.map((row, index) => ({
                  key: `${row.label}-${index}`,
                  cells: [row.label, `${row.tonnage.toLocaleString()} kg`, `${row.pct}%`],
                }))}
              />
            </ProgramStatsDetailSection>
          ) : null
        }
      />
    </section>
  );
};
