import React, { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram } from '../../models/training';
import { formatWeekTonnageLabel } from './sessionSheetUtils';
import { computeProgramAggregateMetrics } from './programAggregateStats';
import {
  buildStandardKpiChips,
  ProgramStatsDataTable,
  ProgramStatsHeader,
  ProgramStatsKpiChips,
  ProgramStatsPurposeBlock,
  ProgramStatsWeekVolumeChart,
} from './programStatsShared';

export interface SessionProgramStatsPanelProps {
  program: GeneratedProgram;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  selectedWeek: number;
  onSelectWeek?: (weekNumber: number) => void;
}

export const SessionProgramStatsPanel: React.FC<SessionProgramStatsPanelProps> = ({
  program,
  athlete,
  exercises,
  isEs,
  selectedWeek,
  onSelectWeek,
}) => {
  const metrics = useMemo(
    () => computeProgramAggregateMetrics(program, athlete, exercises, isEs, 16),
    [program, athlete, exercises, isEs],
  );

  const programTitle = program.name?.trim() || (isEs ? 'Programa' : 'Program');

  const weekBars = useMemo(
    () =>
      metrics.weekRows.map((row) => ({
        dayNumber: row.weekNumber,
        label: row.label,
        tonnage: row.tonnage,
        isSelected: row.weekNumber === selectedWeek,
      })),
    [metrics.weekRows, selectedWeek],
  );

  const kpiChips = buildStandardKpiChips(isEs, {
    sets: metrics.sets,
    reps: metrics.reps,
    avgPct: metrics.avgPct,
    minutes: metrics.minutes,
    dayCount: metrics.sessionCount,
  });

  kpiChips.push({
    id: 'weeks',
    label: `${metrics.weekCount} ${isEs ? (metrics.weekCount === 1 ? 'semana' : 'semanas') : metrics.weekCount === 1 ? 'week' : 'weeks'}`,
  });

  return (
    <section
      id="wolf-program-day-panel-stats"
      role="tabpanel"
      aria-labelledby="wolf-program-day-tab-stats"
      className="wolf-program-day-stats wolf-program-day-stats--program wolf-program-day-board__pane"
    >
      <ProgramStatsHeader
        eyebrow={isEs ? 'Resumen del programa' : 'Program summary'}
        title={programTitle}
        metrics={[
          {
            label: isEs ? 'Volumen total' : 'Total volume',
            value: formatWeekTonnageLabel(metrics.tonnage, isEs),
          },
          {
            label: isEs ? 'Semanas' : 'Weeks',
            value: metrics.weekCount,
          },
          {
            label: isEs ? 'Sesiones' : 'Sessions',
            value: metrics.sessionCount,
          },
        ]}
      />

      <ProgramStatsKpiChips chips={kpiChips} />

      <ProgramStatsPurposeBlock purpose={metrics.purpose} avgPct={metrics.avgPct} isEs={isEs} />

      <ProgramStatsWeekVolumeChart
        days={weekBars}
        isEs={isEs}
        title={isEs ? 'Volumen por semana' : 'Volume by week'}
        onSelectDay={onSelectWeek}
      />

      <ProgramStatsDataTable
        title={isEs ? 'Detalle por semana' : 'Breakdown by week'}
        columns={[
          { key: 'week', label: isEs ? 'Semana' : 'Week' },
          { key: 'volume', label: isEs ? 'Volumen' : 'Volume', align: 'right' },
          { key: 'days', label: isEs ? 'Días' : 'Days', align: 'right' },
          { key: 'sets', label: isEs ? 'Series' : 'Sets', align: 'right' },
          { key: 'reps', label: 'Reps', align: 'right' },
          { key: 'pct', label: '% 1RM', align: 'right' },
          { key: 'share', label: isEs ? '% prog.' : '% prog', align: 'right' },
        ]}
        rows={metrics.weekRows.map((row) => ({
          key: String(row.weekNumber),
          selected: row.weekNumber === selectedWeek,
          cells: [
            row.label,
            `${row.tonnage.toLocaleString()} kg`,
            row.dayCount,
            row.sets,
            row.reps,
            `${row.avgPct}%`,
            `${row.sharePct}%`,
          ],
        }))}
      />

      <ProgramStatsDataTable
        title={isEs ? 'Top ejercicios del programa' : 'Top exercises in program'}
        columns={[
          { key: 'exercise', label: isEs ? 'Ejercicio' : 'Exercise' },
          { key: 'volume', label: isEs ? 'Volumen' : 'Volume', align: 'right' },
          { key: 'pct', label: isEs ? '% programa' : '% of program', align: 'right' },
        ]}
        rows={metrics.exerciseVolumes.map((row, index) => ({
          key: `${row.label}-${index}`,
          cells: [row.label, `${row.tonnage.toLocaleString()} kg`, `${row.pct}%`],
        }))}
      />
    </section>
  );
};
