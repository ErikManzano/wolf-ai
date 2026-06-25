import React, { useMemo } from 'react';
import type { Athlete, Exercise, ProgramWeek } from '../../models/training';
import { formatWeekTonnageLabel } from './sessionSheetUtils';
import { computeWeekAggregateMetrics } from './programWeekStats';
import {
  buildStandardKpiChips,
  ProgramStatsDataTable,
  ProgramStatsHeader,
  ProgramStatsKpiChips,
  ProgramStatsPurposeBlock,
  ProgramStatsWeekVolumeChart,
} from './programStatsShared';

export interface SessionWeekStatsPanelProps {
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  weekNumber: number;
  weekTonnage: number;
  weekData?: ProgramWeek;
  selectedDay: number;
  onSelectDay?: (dayNumber: number) => void;
}

export const SessionWeekStatsPanel: React.FC<SessionWeekStatsPanelProps> = ({
  athlete,
  exercises,
  isEs,
  weekNumber,
  weekTonnage,
  weekData,
  selectedDay,
  onSelectDay,
}) => {
  const metrics = useMemo(
    () => computeWeekAggregateMetrics(weekData, athlete, exercises, isEs, 16),
    [weekData, athlete, exercises, isEs],
  );

  const weekLabel = isEs ? `Semana ${weekNumber}` : `Week ${weekNumber}`;

  const weekDays = useMemo(
    () =>
      metrics.dayRows.map((day) => ({
        dayNumber: day.dayNumber,
        label: day.label,
        tonnage: day.tonnage,
        isSelected: day.dayNumber === selectedDay,
      })),
    [metrics.dayRows, selectedDay],
  );

  const kpiChips = buildStandardKpiChips(isEs, {
    sets: metrics.sets,
    reps: metrics.reps,
    avgPct: metrics.avgPct,
    minutes: metrics.minutes,
    dayCount: metrics.dayCount,
  });

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-day-tab-stats"
      className="wolf-program-day-stats wolf-program-day-stats--week wolf-program-day-board__pane"
    >
      <ProgramStatsHeader
        eyebrow={isEs ? 'Resumen semanal' : 'Weekly summary'}
        title={weekLabel}
        metrics={[
          {
            label: isEs ? 'Volumen total' : 'Total volume',
            value: formatWeekTonnageLabel(weekTonnage || metrics.tonnage, isEs),
          },
          {
            label: isEs ? 'Días' : 'Days',
            value: metrics.dayCount,
          },
          {
            label: isEs ? 'Promedio' : 'Average',
            value: `${metrics.avgPct}% 1RM`,
          },
        ]}
      />

      <ProgramStatsKpiChips chips={kpiChips} />

      <ProgramStatsPurposeBlock purpose={metrics.purpose} avgPct={metrics.avgPct} isEs={isEs} />

      <ProgramStatsWeekVolumeChart
        days={weekDays}
        isEs={isEs}
        title={isEs ? 'Volumen por día' : 'Volume by day'}
        onSelectDay={onSelectDay}
      />

      <ProgramStatsDataTable
        title={isEs ? 'Detalle por día' : 'Breakdown by day'}
        columns={[
          { key: 'day', label: isEs ? 'Día' : 'Day' },
          { key: 'volume', label: isEs ? 'Volumen' : 'Volume', align: 'right' },
          { key: 'sets', label: isEs ? 'Series' : 'Sets', align: 'right' },
          { key: 'reps', label: 'Reps', align: 'right' },
          { key: 'pct', label: '% 1RM', align: 'right' },
          { key: 'share', label: isEs ? '% sem.' : '% wk', align: 'right' },
        ]}
        rows={metrics.dayRows.map((row) => ({
          key: String(row.dayNumber),
          selected: row.dayNumber === selectedDay,
          cells: [
            row.label,
            `${row.tonnage.toLocaleString()} kg`,
            row.sets,
            row.reps,
            `${row.avgPct}%`,
            `${row.sharePct}%`,
          ],
        }))}
      />

      <ProgramStatsDataTable
        title={isEs ? 'Top ejercicios de la semana' : 'Top exercises this week'}
        columns={[
          { key: 'exercise', label: isEs ? 'Ejercicio' : 'Exercise' },
          { key: 'volume', label: isEs ? 'Volumen' : 'Volume', align: 'right' },
          { key: 'pct', label: isEs ? '% semana' : '% of week', align: 'right' },
        ]}
        rows={metrics.exerciseVolumes.map((row, index) => ({
          key: `${row.label}-${index}`,
          cells: [row.label, `${row.tonnage.toLocaleString()} kg`, `${row.pct}%`],
        }))}
      />
    </section>
  );
};
