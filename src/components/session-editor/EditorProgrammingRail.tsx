import React, { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram, ProgramWeek } from '../../models/training';
import { computeWeekAggregateMetrics } from './programWeekStats';
import { formatStatsKg } from './statsTonnage';
import {
  computeSessionScienceSummary,
  computeWeekScience,
  formatShortDate,
} from './programScienceStats';
import './editor-programming-rail.css';

export interface EditorProgrammingRailProps {
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  weekNumber: number;
  selectedDay: number;
  weekData?: ProgramWeek;
  program: GeneratedProgram;
  /** Optional calendar date for the selected day (YYYY-MM-DD) */
  dayDateIso?: string | null;
}

/**
 * Top info bar for programming feedback — week/day plus volume and intensity.
 */
export const EditorProgrammingRail: React.FC<EditorProgrammingRailProps> = ({
  athlete,
  exercises,
  isEs,
  weekNumber,
  selectedDay,
  weekData,
  program,
  dayDateIso = null,
}) => {
  const metrics = useMemo(
    () => computeWeekAggregateMetrics(weekData, athlete, exercises, isEs, 6),
    [weekData, athlete, exercises, isEs],
  );

  const science = useMemo(
    () => computeWeekScience(program, weekNumber, athlete, exercises, null),
    [program, weekNumber, athlete, exercises],
  );

  const dayScience = useMemo(() => {
    const day = weekData?.days.find((d) => d.dayNumber === selectedDay);
    if (!day) return null;
    return computeSessionScienceSummary(day.session, athlete, exercises);
  }, [weekData, selectedDay, athlete, exercises]);

  const volume = science?.summary.tonnage ?? metrics.tonnage;
  const imp = science?.summary.intensityWeighted ?? metrics.avgPct;
  const ramp = science?.fatigue.rampRate;
  const dateLabel = dayDateIso ? formatShortDate(dayDateIso, isEs) : null;

  return (
    <section
      className="wl-prog-bar"
      aria-label={isEs ? 'Resumen de programación' : 'Programming summary'}
    >
      <div className="wl-prog-bar__summary">
        <div className="wl-prog-bar__context">
          <span className="wl-prog-bar__week">
            {isEs ? `Sem ${weekNumber}` : `Wk ${weekNumber}`}
          </span>
          <span className="wl-prog-bar__sep" aria-hidden>
            ·
          </span>
          <span className="wl-prog-bar__day-label">
            {isEs ? `Día ${selectedDay}` : `Day ${selectedDay}`}
          </span>
          {dateLabel ? (
            <>
              <span className="wl-prog-bar__sep" aria-hidden>
                ·
              </span>
              <span className="wl-prog-bar__date">{dateLabel}</span>
            </>
          ) : null}
        </div>

        <div className="wl-prog-bar__kpis">
          <span className="wl-prog-bar__kpi">
            <em>{isEs ? 'Vol' : 'Vol'}</em>
            <strong>{formatStatsKg(volume)}</strong>
            {ramp != null ? (
              <small className={ramp > 0 ? 'is-up' : ramp < 0 ? 'is-down' : undefined}>
                {ramp > 0 ? '+' : ''}
                {ramp}%
              </small>
            ) : null}
          </span>
          <span className="wl-prog-bar__kpi">
            <em>IMP</em>
            <strong>{imp > 0 ? `${imp}%` : '—'}</strong>
            {dayScience && dayScience.intensityWeighted > 0 ? (
              <small>
                {isEs ? 'día' : 'day'} {dayScience.intensityWeighted}%
              </small>
            ) : null}
          </span>
        </div>
      </div>
    </section>
  );
};
