import { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram } from '../../../models/training';
import { buildDayComparisonRows, computeDaySessionMetrics } from '../programMetricsService';
import { formatStatsKg } from '../statsTonnage';
import { PROGRAM_CONTEXT_EXERCISE_RANK_LIMIT } from './constants';
import { ScienceDistributionBar } from '../stats-ds/ScienceDistributionBar';
import { ExerciseRanking } from '../stats-ds/ExerciseRanking';
import { ProgramContextSection } from './ProgramContextSection';

export function DayHistoryContextTab({
  program,
  weekNumber,
  dayNumber,
  dayLabel,
  athlete,
  exercises,
  isEs,
  templateMetrics = false,
}: {
  program: GeneratedProgram;
  weekNumber: number;
  dayNumber: number;
  dayLabel?: string;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  templateMetrics?: boolean;
}) {
  const rows = useMemo(() => {
    const metrics = computeDaySessionMetrics({
      program,
      weekNumber,
      dayNumber,
      athlete,
      exercises,
      templateMetrics,
    });
    return [...metrics.weeklySeries].sort((a, b) => a.weekNumber - b.weekNumber);
  }, [program, weekNumber, dayNumber, athlete, exercises, templateMetrics]);

  const historyTotals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          tonnage: acc.tonnage + row.tonnage,
          sets: acc.sets + row.sets,
          reps: acc.reps + row.reps,
        }),
        { tonnage: 0, sets: 0, reps: 0 },
      ),
    [rows],
  );

  const dayDetail = useMemo(
    () =>
      buildDayComparisonRows({
        program,
        weekNumber,
        dayNumber,
        athlete,
        exercises,
        isEs,
        templateMetrics,
      }),
    [program, weekNumber, dayNumber, athlete, exercises, isEs, templateMetrics],
  );

  const head = dayLabel?.trim() || (isEs ? `Día ${dayNumber}` : `Day ${dayNumber}`);
  const editingSubtitle = isEs
    ? `Sem ${weekNumber} (editando)`
    : `Wk ${weekNumber} (editing)`;

  if (rows.length === 0) {
    return (
      <div className="wl-program-context-tab">
        <ProgramContextSection title={isEs ? 'Histórico' : 'History'} subtitle={head.toUpperCase()}>
          <p className="wl-program-context-empty">
            {isEs
              ? `Sin sesiones previas para ${head} en el plan.`
              : `No sessions for ${head} in this program yet.`}
          </p>
        </ProgramContextSection>
      </div>
    );
  }

  const showZones = dayDetail.stimulus.some((s) => s.repsPct > 0 || s.volumePct > 0);
  const showRanking =
    dayDetail.exerciseVolumes.length > 0 || Boolean(dayDetail.exerciseVolumeRemainder);

  return (
    <div className="wl-program-context-tab">
      <ProgramContextSection
        title={isEs ? 'Histórico' : 'History'}
        subtitle={head.toUpperCase()}
      >
        <table className="wl-program-context-table wl-day-history-table">
          <thead>
            <tr>
              <th>{isEs ? 'Sem' : 'Wk'}</th>
              <th>{isEs ? 'Tonnage' : 'Tonnage'}</th>
              <th>IMP</th>
              <th>Sets</th>
              <th>Reps</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isCurrent = row.weekNumber === weekNumber;
              const isPrev = row.weekNumber === weekNumber - 1;
              return (
                <tr
                  key={row.weekNumber}
                  className={
                    isCurrent ? 'is-current' : isPrev ? 'is-prev-week' : undefined
                  }
                >
                  <td>
                    {row.weekNumber}
                    {isCurrent ? (isEs ? ' (editando)' : ' (editing)') : ''}
                  </td>
                  <td>{row.tonnage > 0 ? formatStatsKg(row.tonnage, { alwaysKg: true }) : '—'}</td>
                  <td>{row.imp > 0 ? `${row.imp}%` : '—'}</td>
                  <td>{row.sets}</td>
                  <td>{row.reps}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="wl-day-history-table__totals">
              <th scope="row">{isEs ? 'Total' : 'Total'}</th>
              <td>
                {historyTotals.tonnage > 0
                  ? formatStatsKg(historyTotals.tonnage, { alwaysKg: true })
                  : '—'}
              </td>
              <td>—</td>
              <td>{historyTotals.sets}</td>
              <td>{historyTotals.reps}</td>
            </tr>
          </tfoot>
        </table>
      </ProgramContextSection>

      {!dayDetail.empty && showZones ? (
        <ProgramContextSection
          title={isEs ? 'Zonas (día)' : 'Zones (day)'}
          subtitle={editingSubtitle}
        >
          <ScienceDistributionBar
            slices={dayDetail.stimulus}
            isEs={isEs}
            compact
            showRepsInLegend
            singleZoneVolumeHint
            animateOnMount
            showTooltips
          />
        </ProgramContextSection>
      ) : null}

      {!dayDetail.empty && showRanking ? (
        <ProgramContextSection
          title={isEs ? 'Top 5 ejercicios (tonnage día)' : 'Top 5 exercises (day tonnage)'}
          subtitle={editingSubtitle}
        >
          <ExerciseRanking
            slices={dayDetail.exerciseVolumes}
            isEs={isEs}
            maxSlices={PROGRAM_CONTEXT_EXERCISE_RANK_LIMIT}
            remainder={dayDetail.exerciseVolumeRemainder}
            animateOnMount
          />
        </ProgramContextSection>
      ) : null}
    </div>
  );
}
