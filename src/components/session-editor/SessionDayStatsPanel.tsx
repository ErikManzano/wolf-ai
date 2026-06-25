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
import { formatWeekTonnageLabel } from './sessionSheetUtils';
import { sessionExerciseVolumes, sessionPurposeBreakdown } from './sessionSummaryMetrics';
import {
  buildStandardKpiChips,
  ProgramStatsDataTable,
  ProgramStatsHeader,
  ProgramStatsKpiChips,
  ProgramStatsPurposeBlock,
  ProgramStatsWeekVolumeChart,
} from './programStatsShared';

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
}

export const SessionDayStatsPanel: React.FC<SessionDayStatsPanelProps> = ({
  session,
  athlete,
  exercises,
  isEs,
  weekNumber,
  dayNumber,
  dayLabel,
  weekTonnage,
  weekData,
  onSelectDay,
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
      exerciseCount: blocks.length,
    }),
    [blocks, session],
  );

  const weekDays = useMemo(() => {
    if (!weekData?.days.length) return [];
    return weekData.days.map((day) => ({
      dayNumber: day.dayNumber,
      label: day.label?.trim() || (isEs ? `Día ${day.dayNumber}` : `Day ${day.dayNumber}`),
      tonnage: calcularCargaTotal(day.session, athlete, exercises),
      isSelected: day.dayNumber === dayNumber,
    }));
  }, [weekData, athlete, exercises, dayNumber, isEs]);

  const exerciseRows = useMemo(
    () => sessionExerciseVolumes(blocks, athlete, exercises, 24),
    [blocks, athlete, exercises],
  );

  const resolvedDayLabel =
    dayLabel?.trim() || (isEs ? `Día ${dayNumber}` : `Day ${dayNumber}`);
  const weekLabel = isEs ? `Semana ${weekNumber}` : `Week ${weekNumber}`;

  const kpiChips = buildStandardKpiChips(isEs, {
    sets: sessionMetrics.sets,
    reps: sessionMetrics.reps,
    avgPct: sessionMetrics.avgPct,
    minutes: sessionMetrics.minutes,
    exerciseCount: sessionMetrics.exerciseCount,
  });

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-day-tab-stats"
      className="wolf-program-day-stats wolf-program-day-stats--day wolf-program-day-board__pane"
    >
      <ProgramStatsHeader
        eyebrow={weekLabel}
        title={resolvedDayLabel}
        metrics={[
          {
            label: isEs ? 'Volumen semana' : 'Week volume',
            value: formatWeekTonnageLabel(weekTonnage, isEs),
          },
          {
            label: isEs ? 'Este día' : 'This day',
            value: (
              <>
                {dayTonnage > 0 ? `${dayTonnage.toLocaleString()} kg` : '—'}
                {daySharePct > 0 ? (
                  <span className="wolf-program-day-stats__share">({daySharePct}%)</span>
                ) : null}
              </>
            ),
          },
        ]}
      />

      <ProgramStatsKpiChips chips={kpiChips} />

      <ProgramStatsPurposeBlock
        purpose={sessionMetrics.purpose}
        avgPct={sessionMetrics.avgPct}
        isEs={isEs}
      />

      <ProgramStatsWeekVolumeChart
        days={weekDays}
        isEs={isEs}
        title={isEs ? 'Volumen por día de la semana' : 'Volume by day this week'}
        onSelectDay={onSelectDay}
      />

      <ProgramStatsDataTable
        title={isEs ? 'Detalle por ejercicio' : 'Exercise breakdown'}
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
    </section>
  );
};
