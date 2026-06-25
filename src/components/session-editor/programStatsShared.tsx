import React, { useId } from 'react';
import { purposeLabel, purposePct, type SessionPurposeBreakdown } from './sessionSummaryMetrics';
import type { SetPurpose } from './spreadsheetPurposeUtils';

const PURPOSE_ORDER: SetPurpose[] = ['technique', 'work', 'intensity'];

export interface ProgramStatsMetric {
  label: string;
  value: React.ReactNode;
}

export interface ProgramStatsChip {
  id: string;
  label: string;
}

export interface ProgramStatsDayBar {
  dayNumber: number;
  label: string;
  tonnage: number;
  isSelected?: boolean;
}

export interface ProgramStatsTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

export interface ProgramStatsTableRow {
  key: string;
  cells: React.ReactNode[];
  selected?: boolean;
}

export interface ProgramStatsHeaderProps {
  eyebrow: string;
  title: string;
  metrics: ProgramStatsMetric[];
}

export const ProgramStatsHeader: React.FC<ProgramStatsHeaderProps> = ({
  eyebrow,
  title,
  metrics,
}) => (
  <header className="wolf-program-day-stats__head">
    <div>
      <p className="wolf-program-day-stats__eyebrow">{eyebrow}</p>
      <h3 className="wolf-program-day-stats__title">{title}</h3>
    </div>
    <dl className="wolf-program-day-stats__week-metrics">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
        </div>
      ))}
    </dl>
  </header>
);

export const ProgramStatsKpiChips: React.FC<{ chips: ProgramStatsChip[] }> = ({ chips }) => {
  if (chips.length === 0) return null;
  return (
    <div className="wolf-program-day-stats__chips" aria-label="KPIs">
      {chips.map((chip) => (
        <span key={chip.id} className="wolf-program-day-stats__chip">
          {chip.label}
        </span>
      ))}
    </div>
  );
};

function IntensityRing({ pct, label }: { pct: number; label: string }) {
  const size = 46;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="wolf-se-day-summary__ring" aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="wolf-se-day-summary__ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="wolf-se-day-summary__ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="wolf-se-day-summary__ring-value">{label}</span>
    </div>
  );
}

export interface ProgramStatsPurposeBlockProps {
  purpose: SessionPurposeBreakdown;
  avgPct: number;
  isEs: boolean;
}

export const ProgramStatsPurposeBlock: React.FC<ProgramStatsPurposeBlockProps> = ({
  purpose,
  avgPct,
  isEs,
}) => {
  const purposeBarId = useId();
  const purposeSegments = PURPOSE_ORDER.map((key) => ({
    key,
    label: purposeLabel(key, isEs),
    sets: purpose[key],
    pct: purposePct(purpose, key),
  })).filter((segment) => segment.sets > 0);

  if (purpose.total <= 0) return null;

  return (
    <div className="wolf-program-day-stats__purpose-row">
      <p className="wolf-program-day-stats__section-label">
        {isEs ? 'Distribución por intensidad' : 'Intensity distribution'}
      </p>
      <div className="wolf-program-day-stats__purpose-body">
        <IntensityRing pct={avgPct} label={`${avgPct}%`} />
        <div className="wolf-program-day-stats__purpose-chart">
          <div
            id={purposeBarId}
            className="wolf-se-day-summary__stack"
            role="img"
            aria-label={
              isEs
                ? `Distribución: ${purposeSegments.map((s) => `${s.label} ${s.pct}%`).join(', ')}`
                : `Distribution: ${purposeSegments.map((s) => `${s.label} ${s.pct}%`).join(', ')}`
            }
          >
            {purposeSegments.map((segment) => (
              <span
                key={segment.key}
                className={`wolf-se-day-summary__stack-seg wolf-se-day-summary__stack-seg--${segment.key}`}
                style={{ flexGrow: segment.sets, flexBasis: `${segment.pct}%` }}
                title={`${segment.label}: ${segment.pct}%`}
              />
            ))}
          </div>
          <ul className="wolf-se-day-summary__legend" aria-hidden>
            {purposeSegments.map((segment) => (
              <li key={segment.key}>
                <span
                  className={`wolf-se-day-summary__legend-dot wolf-se-day-summary__legend-dot--${segment.key}`}
                />
                <span>{segment.label}</span>
                <strong>{segment.pct}%</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export interface ProgramStatsWeekVolumeChartProps {
  days: ProgramStatsDayBar[];
  isEs: boolean;
  title: string;
  onSelectDay?: (dayNumber: number) => void;
}

export const ProgramStatsWeekVolumeChart: React.FC<ProgramStatsWeekVolumeChartProps> = ({
  days,
  isEs,
  title,
  onSelectDay,
}) => {
  if (days.length === 0) return null;

  const maxTonnage = Math.max(1, ...days.map((day) => day.tonnage));
  const chartAria = isEs ? 'Volumen de cada día de la semana' : 'Volume for each day of the week';

  return (
    <div className="wolf-program-day-stats__week-chart">
      <p className="wolf-program-day-stats__section-label">{title}</p>
      <ul className="wolf-program-day-stats__week-bars" aria-label={chartAria}>
        {days.map((day) => {
          const barHeight = `${Math.max(8, (day.tonnage / maxTonnage) * 100)}%`;
          const barValue = day.tonnage > 0 ? `${Math.round(day.tonnage / 1000)}k` : '—';
          const selected = Boolean(day.isSelected);

          if (onSelectDay) {
            return (
              <li
                key={day.dayNumber}
                className={`wolf-program-day-stats__week-bar${selected ? ' is-selected' : ''}`}
              >
                <button
                  type="button"
                  className="wolf-program-day-stats__week-bar-btn"
                  onClick={() => onSelectDay(day.dayNumber)}
                  aria-label={`${day.label}: ${day.tonnage.toLocaleString()} kg`}
                >
                  <div className="wolf-program-day-stats__week-bar-track" aria-hidden>
                    <span className="wolf-program-day-stats__week-bar-fill" style={{ height: barHeight }} />
                  </div>
                  <span className="wolf-program-day-stats__week-bar-value">{barValue}</span>
                  <span className="wolf-program-day-stats__week-bar-label">{day.label}</span>
                </button>
              </li>
            );
          }

          return (
            <li
              key={day.dayNumber}
              className={`wolf-program-day-stats__week-bar${selected ? ' is-selected' : ''}`}
            >
              <div className="wolf-program-day-stats__week-bar-track" aria-hidden>
                <span className="wolf-program-day-stats__week-bar-fill" style={{ height: barHeight }} />
              </div>
              <span className="wolf-program-day-stats__week-bar-value">{barValue}</span>
              <span className="wolf-program-day-stats__week-bar-label">{day.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export interface ProgramStatsDataTableProps {
  title: string;
  columns: ProgramStatsTableColumn[];
  rows: ProgramStatsTableRow[];
}

export const ProgramStatsDataTable: React.FC<ProgramStatsDataTableProps> = ({
  title,
  columns,
  rows,
}) => {
  if (rows.length === 0) return null;

  return (
    <div className="wolf-program-day-stats__exercise-table-wrap">
      <p className="wolf-program-day-stats__section-label">{title}</p>
      <table className="wolf-program-day-stats__exercise-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.align === 'right' ? 'wolf-program-day-stats__th--right' : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.selected ? 'is-selected' : undefined}>
              {row.cells.map((cell, index) => (
                <td
                  key={`${row.key}-${columns[index]?.key ?? index}`}
                  className={columns[index]?.align === 'right' ? 'wolf-program-day-stats__td--right' : undefined}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export function buildStandardKpiChips(
  isEs: boolean,
  metrics: {
    sets: number;
    reps: number;
    avgPct: number;
    minutes: number;
    dayCount?: number;
    exerciseCount?: number;
  },
): ProgramStatsChip[] {
  const chips: ProgramStatsChip[] = [
    { id: 'sets', label: `${metrics.sets} ${isEs ? 'series' : 'sets'}` },
    { id: 'reps', label: `${metrics.reps} reps` },
    { id: 'intensity', label: `${metrics.avgPct}% 1RM` },
  ];

  const buffer = metrics.dayCount != null ? metrics.dayCount * 15 : 15;
  chips.push({
    id: 'time',
    label: `${metrics.minutes}–${metrics.minutes + buffer} min`,
  });

  if (metrics.exerciseCount != null) {
    chips.push({
      id: 'exercises',
      label: `${metrics.exerciseCount} ${
        isEs
          ? metrics.exerciseCount === 1
            ? 'ejercicio'
            : 'ejercicios'
          : metrics.exerciseCount === 1
            ? 'exercise'
            : 'exercises'
      }`,
    });
  }

  return chips;
}
