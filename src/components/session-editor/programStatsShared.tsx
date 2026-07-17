import React, { useId } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { purposeLabel, purposePct, type SessionPurposeBreakdown } from './sessionSummaryMetrics';
import type { SetPurpose } from './spreadsheetPurposeUtils';
import type { DayVerdictTone } from './programStatsVerdict';

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

/** @deprecated Unused after stats-ds redesign — prefer MetricCard / SectionCard. */
export interface ProgramStatsHeaderProps {
  eyebrow: string;
  title: string;
  metrics: ProgramStatsMetric[];
}

/** @deprecated Unused after stats-ds redesign — prefer MetricCard / SectionCard. */
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

/** @deprecated Unused after stats-ds redesign — prefer MetricCard. */
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

function IntensityRing({ pct, label, size = 46 }: { pct: number; label: string; size?: number }) {
  const stroke = size <= 40 ? 3 : 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={`wolf-se-day-summary__ring${size <= 40 ? ' wolf-se-day-summary__ring--sm' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
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

function KpiCardVisual({
  accent,
  intensityPct,
}: {
  accent: ProgramStatsKpiCard['accent'];
  intensityPct?: number;
}) {
  if (accent === 'intensity' && intensityPct != null) {
    return <IntensityRing pct={intensityPct} label={`${intensityPct}%`} size={38} />;
  }

  return null;
}

export interface ProgramStatsPurposeBlockProps {
  purpose: SessionPurposeBreakdown;
  purposeTonnage?: Record<SetPurpose, number>;
  avgPct: number;
  isEs: boolean;
  title?: string;
}

export const ProgramStatsPurposeBlock: React.FC<ProgramStatsPurposeBlockProps> = ({
  purpose,
  purposeTonnage,
  isEs,
  title,
}) => {
  const purposeBarId = useId();
  const purposeSegments = PURPOSE_ORDER.map((key) => ({
    key,
    label: purposeLabel(key, isEs),
    sets: purpose[key],
    pct: purposePct(purpose, key),
    tonnage: purposeTonnage?.[key] ?? 0,
  })).filter((segment) => segment.sets > 0);

  if (purpose.total <= 0) return null;

  const resolvedTitle =
    title ?? (isEs ? 'Distribución por intensidad (hoy)' : 'Intensity distribution (today)');

  return (
    <div className="wolf-program-day-stats__purpose-row wolf-program-day-stats__purpose-row--dashboard">
      <p className="wolf-program-day-stats__section-label">{resolvedTitle}</p>
      <div
        id={purposeBarId}
        className="wolf-program-day-stats__purpose-stack"
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
            className={`wolf-program-day-stats__purpose-stack-seg wolf-program-day-stats__purpose-stack-seg--${segment.key}`}
            style={{ flexGrow: segment.sets, flexBasis: `${segment.pct}%` }}
            title={`${segment.label}: ${segment.pct}%`}
          />
        ))}
      </div>
      <div className="wolf-program-day-stats__purpose-cols">
        {purposeSegments.map((segment) => (
          <div
            key={segment.key}
            className={`wolf-program-day-stats__purpose-col wolf-program-day-stats__purpose-col--${segment.key}`}
          >
            <span className="wolf-program-day-stats__purpose-col-label">{segment.label}</span>
            <strong className="wolf-program-day-stats__purpose-col-pct">{segment.pct}%</strong>
            <span className="wolf-program-day-stats__purpose-col-kg">
              {segment.tonnage > 0 ? `${segment.tonnage.toLocaleString()} kg` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** @deprecated Unused after stats-ds redesign — prefer TimelineChart. */
export interface ProgramStatsWeekVolumeChartProps {
  days: ProgramStatsDayBar[];
  isEs: boolean;
  title: string;
  onSelectDay?: (dayNumber: number) => void;
}

/** @deprecated Unused after stats-ds redesign — prefer TimelineChart. */
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
      {title ? <p className="wolf-program-day-stats__section-label">{title}</p> : null}
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

/** @deprecated Unused after stats-ds redesign — prefer MetricCard. */
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

export interface ProgramStatsKpiCard {
  id: string;
  label: string;
  value: string;
  sub?: string;
  subAccent?: 'volume' | 'success' | 'muted';
  visualValue?: number;
  accent?: 'volume' | 'intensity' | 'sets' | 'duration' | 'sessions' | 'exercises' | 'default';
}

export interface ProgramStatsBarSlice {
  label: string;
  tonnage: number;
  pct: number;
}

function truncateBarLabel(label: string, max = 28): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

export const ProgramStatsHorizontalBars: React.FC<{
  title: string;
  slices: ProgramStatsBarSlice[];
  isEs: boolean;
  maxSlices?: number;
  labelMaxLen?: number;
}> = ({ title, slices, isEs, maxSlices = 6, labelMaxLen = 28 }) => {
  const visible = maxSlices > 0 ? slices.slice(0, maxSlices) : slices;
  if (visible.length === 0) return null;

  return (
    <div className="wolf-program-day-stats__h-bars">
      {title ? <p className="wolf-program-day-stats__section-label">{title}</p> : null}
      <ul
        className="wolf-program-day-stats__h-bars-list"
        aria-label={isEs ? 'Distribución de volumen' : 'Volume distribution'}
      >
        {visible.map((slice) => (
          <li key={slice.label} className="wolf-program-day-stats__h-bar-row">
            <span className="wolf-program-day-stats__h-bar-label" title={slice.label}>
              {truncateBarLabel(slice.label, labelMaxLen)}
            </span>
            <div className="wolf-program-day-stats__h-bar-track" aria-hidden>
              <span
                className="wolf-program-day-stats__h-bar-fill"
                style={{ width: `${Math.max(slice.pct, 4)}%` }}
              />
            </div>
            <span className="wolf-program-day-stats__h-bar-value">
              {slice.tonnage > 0 ? `${slice.tonnage.toLocaleString()} kg` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export interface ProgramStatsLinePoint {
  key: string | number;
  label: string;
  value: number;
}

export const ProgramStatsMiniLineChart: React.FC<{
  title: string;
  points: ProgramStatsLinePoint[];
  isEs: boolean;
  unit?: string;
}> = ({ title, points, isEs, unit = '%' }) => {
  if (points.length < 2) return null;

  const width = 280;
  const height = 88;
  const padX = 8;
  const padY = 12;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = Math.max(1, maxVal - minVal);
  const yPad = range * 0.12;

  const coords = points.map((point, index) => {
    const x = padX + (index / Math.max(1, points.length - 1)) * chartW;
    const normalized = (point.value - (minVal - yPad)) / (range + yPad * 2);
    const y = padY + chartH - normalized * chartH;
    return { x, y, point };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const pointLabels = points.map((p) => `${p.label} ${p.value}${unit}`).join(', ');
  const ariaLabel = isEs
    ? `Evolución de intensidad: ${pointLabels}`
    : `Intensity trend: ${pointLabels}`;

  return (
    <div className="wolf-program-day-stats__line-chart">
      <p className="wolf-program-day-stats__section-label">{title}</p>
      <div className="wolf-program-day-stats__line-chart-body">
        <svg
          className="wolf-program-day-stats__line-chart-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={ariaLabel}
        >
          <polyline
            className="wolf-program-day-stats__line-chart-path"
            fill="none"
            points={polyline}
          />
          {coords.map((c) => (
            <circle
              key={c.point.key}
              className="wolf-program-day-stats__line-chart-dot"
              cx={c.x}
              cy={c.y}
              r={3.5}
            />
          ))}
        </svg>
        <ul className="wolf-program-day-stats__line-chart-labels" aria-hidden>
          {points.map((point) => (
            <li key={point.key}>{point.label}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const ProgramStatsKpiGrid: React.FC<{ cards: ProgramStatsKpiCard[] }> = ({ cards }) => {
  if (cards.length === 0) return null;
  return (
    <div className="wolf-program-day-stats__kpi-grid" aria-label="KPIs">
      {cards.map((card) => (
        <article
          key={card.id}
          className={`wolf-program-day-stats__kpi-card wolf-program-day-stats__kpi-card--${card.accent ?? 'default'}`}
        >
          <div className="wolf-program-day-stats__kpi-top">
            <p className="wolf-program-day-stats__kpi-label">{card.label}</p>
            <KpiCardVisual accent={card.accent} intensityPct={card.visualValue} />
          </div>
          <p className="wolf-program-day-stats__kpi-value">{card.value}</p>
          {card.sub ? (
            <p
              className={`wolf-program-day-stats__kpi-sub${
                card.subAccent ? ` wolf-program-day-stats__kpi-sub--${card.subAccent}` : ''
              }`}
            >
              {card.sub}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
};

/** @deprecated Unused after stats-ds redesign. */
const DONUT_COLORS = ['#ff6b1a', '#8b5cf6', '#22d3ee', '#3b82f6', '#f59e0b', '#10b981'];

/** @deprecated Unused after stats-ds redesign — prefer DistributionBar / ExerciseRanking. */
export interface ProgramStatsDonutSlice {
  label: string;
  tonnage: number;
  pct: number;
}

/** @deprecated Unused after stats-ds redesign. */
export function limitDonutSlices(
  slices: ProgramStatsDonutSlice[],
  maxSlices: number,
  otherLabel: string,
): ProgramStatsDonutSlice[] {
  if (slices.length <= maxSlices) return slices;

  const sorted = [...slices].sort((a, b) => b.tonnage - a.tonnage);
  const head = sorted.slice(0, maxSlices - 1);
  const rest = sorted.slice(maxSlices - 1);
  const restTonnage = rest.reduce((sum, slice) => sum + slice.tonnage, 0);
  const totalTonnage = slices.reduce((sum, slice) => sum + slice.tonnage, 0);
  const headTonnage = head.reduce((sum, slice) => sum + slice.tonnage, 0);
  const headPct = totalTonnage > 0 ? Math.round((headTonnage / totalTonnage) * 100) : 0;
  const restPct = Math.max(0, 100 - headPct);

  return [
    ...head.map((slice) => ({
      ...slice,
      pct: totalTonnage > 0 ? Math.round((slice.tonnage / totalTonnage) * 100) : slice.pct,
    })),
    {
      label: otherLabel,
      tonnage: restTonnage,
      pct: restPct,
    },
  ];
}

/** @deprecated Unused after stats-ds redesign — prefer DistributionBar / ExerciseRanking. */
export const ProgramStatsDonutChart: React.FC<{
  title: string;
  centerLabel: string;
  centerSub?: string;
  slices: ProgramStatsDonutSlice[];
  isEs: boolean;
  maxSlices?: number;
}> = ({ title, centerLabel, centerSub, slices, isEs, maxSlices }) => {
  const visibleSlices =
    maxSlices != null && maxSlices > 0
      ? limitDonutSlices(slices, maxSlices, isEs ? 'Otros' : 'Other')
      : slices;

  if (visibleSlices.length === 0) return null;

  const gradientParts = visibleSlices.map((slice, index) => {
    const start = visibleSlices.slice(0, index).reduce((sum, item) => sum + item.pct, 0);
    const end = start + slice.pct;
    const color = DONUT_COLORS[index % DONUT_COLORS.length]!;
    return `${color} ${start}% ${end}%`;
  });

  return (
    <div className="wolf-program-day-stats__donut-card">
      <p className="wolf-program-day-stats__section-label">{title}</p>
      <div className="wolf-program-day-stats__donut-body">
        <div
          className="wolf-program-day-stats__donut"
          style={{ background: `conic-gradient(${gradientParts.join(', ')})` }}
          role="img"
          aria-label={
            isEs
              ? visibleSlices.map((s) => `${s.label} ${s.pct}%`).join(', ')
              : visibleSlices.map((s) => `${s.label} ${s.pct}%`).join(', ')
          }
        >
          <div className="wolf-program-day-stats__donut-hole">
            <strong>{centerLabel}</strong>
            {centerSub ? <span>{centerSub}</span> : null}
          </div>
        </div>
        <ul className="wolf-program-day-stats__donut-legend">
          {visibleSlices.map((slice, index) => (
            <li key={slice.label}>
              <span
                className="wolf-program-day-stats__donut-dot"
                style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }}
                aria-hidden
              />
              <span className="wolf-program-day-stats__donut-name">{slice.label}</span>
              <span className="wolf-program-day-stats__donut-meta">
                {slice.tonnage.toLocaleString()} kg · {slice.pct}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export interface ProgramStatsDayCard {
  dayNumber: number;
  label: string;
  tonnage: number;
  exerciseCount: number;
  isSelected?: boolean;
  executionStatus?: 'none' | 'pending' | 'in_progress' | 'completed';
}

export const ProgramStatsDayCards: React.FC<{
  title: string;
  days: ProgramStatsDayCard[];
  isEs: boolean;
  onSelectDay?: (dayNumber: number) => void;
}> = ({ title, days, isEs, onSelectDay }) => {
  if (days.length === 0) return null;

  const maxTonnage = Math.max(1, ...days.map((day) => day.tonnage));

  return (
    <div className="wolf-program-day-stats__day-cards">
      <p className="wolf-program-day-stats__section-label">{title}</p>
      <ul className="wolf-program-day-stats__day-cards-list">
        {days.map((day) => {
          const statusClass =
            day.executionStatus && day.executionStatus !== 'none'
              ? ` wolf-program-day-stats__day-card--${day.executionStatus}`
              : '';
          const barWidth = day.tonnage > 0 ? `${Math.max(12, (day.tonnage / maxTonnage) * 100)}%` : '0%';
          const content = (
            <>
              <span className="wolf-program-day-stats__day-card-label">{day.label}</span>
              <strong className="wolf-program-day-stats__day-card-volume">
                {day.tonnage > 0 ? `${day.tonnage.toLocaleString()} kg` : '—'}
              </strong>
              <span className="wolf-program-day-stats__day-card-meta">
                {day.exerciseCount}{' '}
                {isEs
                  ? day.exerciseCount === 1
                    ? 'ejercicio'
                    : 'ejercicios'
                  : day.exerciseCount === 1
                    ? 'exercise'
                    : 'exercises'}
              </span>
              <div className="wolf-program-day-stats__day-card-bar" aria-hidden>
                <span
                  className="wolf-program-day-stats__day-card-bar-fill"
                  style={{ width: barWidth }}
                />
              </div>
            </>
          );

          return (
            <li
              key={day.dayNumber}
              className={`wolf-program-day-stats__day-card${day.isSelected ? ' is-selected' : ''}${statusClass}`}
            >
              {onSelectDay ? (
                <button
                  type="button"
                  className="wolf-program-day-stats__day-card-btn"
                  onClick={() => onSelectDay(day.dayNumber)}
                  aria-label={`${day.label}: ${day.tonnage.toLocaleString()} kg`}
                >
                  {content}
                </button>
              ) : (
                <div className="wolf-program-day-stats__day-card-inner">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const ProgramStatsStatusCard: React.FC<{
  title: string;
  message: string;
  tone: DayVerdictTone;
  isEs: boolean;
  executionLabel?: string;
  compact?: boolean;
}> = ({ title, message, tone, isEs, executionLabel, compact = false }) => {
  const Icon =
    tone === 'optimal' || tone === 'light'
      ? CheckCircle2
      : tone === 'empty'
        ? Info
        : AlertCircle;

  return (
    <div
      className={`wolf-program-day-stats__status wolf-program-day-stats__status--${tone}${
        compact ? ' wolf-program-day-stats__status--compact' : ''
      }`}
    >
      <div className="wolf-program-day-stats__status-icon" aria-hidden>
        <Icon size={compact ? 18 : 22} strokeWidth={2.25} />
      </div>
      <div className="wolf-program-day-stats__status-copy">
        <p className="wolf-program-day-stats__status-eyebrow">
          {isEs ? 'Estado del día' : 'Day status'}
        </p>
        <p className="wolf-program-day-stats__status-title">{title}</p>
        <p className="wolf-program-day-stats__status-message">{message}</p>
      </div>
      {executionLabel && !compact ? (
        <span className="wolf-program-day-stats__status-badge">{executionLabel}</span>
      ) : null}
    </div>
  );
};

/** @deprecated Unused after stats-ds redesign. */
export const ProgramStatsFooterRow: React.FC<{
  summary: React.ReactNode;
  status: React.ReactNode;
}> = ({ summary, status }) => (
  <div className="wolf-program-day-stats__footer-row">
    <div className="wolf-program-day-stats__footer-summary">{summary}</div>
    <div className="wolf-program-day-stats__footer-status">{status}</div>
  </div>
);

export type ProgramStatsDashboardVariant = 'day' | 'week' | 'program';

export const ProgramStatsDashboardLayout: React.FC<{
  kpis: React.ReactNode;
  /** Main chart row — day/week cards for week/program scopes. */
  primary?: React.ReactNode;
  /** Coaching verdict or status (day scope). */
  status?: React.ReactNode;
  charts?: React.ReactNode;
  /** Exercise volume bars or similar breakdown. */
  breakdown?: React.ReactNode;
  footer?: React.ReactNode;
  detail?: React.ReactNode;
  /** Fit all widgets in the visible panel (GA-style grid, no page scroll). */
  dashboard?: boolean;
  variant?: ProgramStatsDashboardVariant;
  /** @deprecated Use primary/breakdown slots instead. */
  timeline?: React.ReactNode;
}> = ({
  kpis,
  primary,
  status,
  charts,
  breakdown,
  footer,
  detail,
  dashboard = false,
  variant = 'day',
  timeline,
}) => (
  <div
    className={`wolf-program-day-stats__dashboard wolf-program-day-stats__dashboard--${variant}${
      dashboard ? ' wolf-program-day-stats__dashboard--viewport' : ''
    }`}
  >
    <div className="wolf-program-day-stats__row wolf-program-day-stats__row--kpis">{kpis}</div>
    {status ? (
      <div className="wolf-program-day-stats__row wolf-program-day-stats__row--status">{status}</div>
    ) : null}
    {primary ? (
      <div className="wolf-program-day-stats__row wolf-program-day-stats__row--primary">{primary}</div>
    ) : null}
    {timeline ? (
      <div className="wolf-program-day-stats__row wolf-program-day-stats__row--timeline">{timeline}</div>
    ) : null}
    {charts ? (
      <div className="wolf-program-day-stats__row wolf-program-day-stats__row--charts">{charts}</div>
    ) : null}
    {breakdown ? (
      <div className="wolf-program-day-stats__row wolf-program-day-stats__row--breakdown">{breakdown}</div>
    ) : null}
    {footer ? (
      <div className="wolf-program-day-stats__row wolf-program-day-stats__row--footer">{footer}</div>
    ) : null}
    {detail ? (
      <div className="wolf-program-day-stats__row wolf-program-day-stats__row--detail">{detail}</div>
    ) : null}
  </div>
);

export const ProgramStatsDetailSection: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = false }) => (
  <details className="wolf-program-day-stats__detail" open={defaultOpen || undefined}>
    <summary className="wolf-program-day-stats__detail-toggle">{title}</summary>
    <div className="wolf-program-day-stats__detail-body">{children}</div>
  </details>
);

export function formatStatsDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${minutes} min`;
}

/** @deprecated Unused after stats-ds redesign — prefer MetricCard summary row. */
export function buildWeekSummaryItems(
  isEs: boolean,
  params: {
    tonnage: number;
    avgPct: number;
    sets: number;
    reps: number;
    minutes: number;
    dayCount: number;
    durationBuffer?: number;
  },
): ProgramStatsMetric[] {
  const estimatedMinutes = params.minutes + (params.durationBuffer ?? params.dayCount * 15);
  return [
    {
      label: isEs ? 'Volumen total' : 'Total volume',
      value: params.tonnage > 0 ? `${params.tonnage.toLocaleString()} kg` : '—',
    },
    {
      label: isEs ? 'Intensidad promedio' : 'Average intensity',
      value: `${params.avgPct}%`,
    },
    {
      label: isEs ? 'Total series' : 'Total sets',
      value: params.sets,
    },
    {
      label: isEs ? 'Total reps' : 'Total reps',
      value: params.reps,
    },
    {
      label: isEs ? 'Duración estimada' : 'Estimated duration',
      value: formatStatsDuration(estimatedMinutes),
    },
    {
      label: isEs ? 'Días programados' : 'Scheduled days',
      value: params.dayCount,
    },
  ];
}

/** @deprecated Unused after stats-ds redesign — prefer MetricCard summary row. */
export const ProgramStatsSummaryStrip: React.FC<{
  title: string;
  items: ProgramStatsMetric[];
}> = ({ title, items }) => {
  if (items.length === 0) return null;
  return (
    <div className="wolf-program-day-stats__summary-strip">
      <p className="wolf-program-day-stats__section-label">{title}</p>
      <dl className="wolf-program-day-stats__summary-grid">
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

function intensityRangeSub(
  isEs: boolean,
  intensityMin: number,
  intensityMax: number,
): string | undefined {
  if (intensityMin > 0 && intensityMax > intensityMin) {
    const range = `${intensityMin}% – ${intensityMax}%`;
    return isEs ? `Rango: ${range}` : `Range: ${range}`;
  }
  return undefined;
}

function executionSetsSub(
  isEs: boolean,
  execution: { completedSets: number; completionPct: number } | null | undefined,
  reps: number,
): { sub: string; subAccent?: ProgramStatsKpiCard['subAccent'] } {
  if (execution) {
    return {
      sub: isEs
        ? `Completadas: ${execution.completedSets} (${execution.completionPct}%)`
        : `Completed: ${execution.completedSets} (${execution.completionPct}%)`,
      subAccent: 'success',
    };
  }
  return {
    sub: isEs ? `${reps} reps totales` : `${reps} total reps`,
    subAccent: 'muted',
  };
}

/** Day scope — volume, intensity, sets, estimated duration. */
export function buildDayScopeKpiCards(
  isEs: boolean,
  params: {
    tonnage: number;
    weekSharePct: number;
    avgPct: number;
    intensityMin: number;
    intensityMax: number;
    sets: number;
    reps: number;
    minutes: number;
    execution?: { completedSets: number; prescribedSets: number; completionPct: number } | null;
  },
): ProgramStatsKpiCard[] {
  const setsMeta = executionSetsSub(isEs, params.execution, params.reps);
  const durationSub = isEs ? 'Tiempo estimado' : 'Estimated time';
  const durationBuffer = 15;

  return [
    {
      id: 'volume',
      label: isEs ? 'Volumen total' : 'Total volume',
      value: params.tonnage > 0 ? `${params.tonnage.toLocaleString()} kg` : '—',
      sub:
        params.weekSharePct > 0 && params.weekSharePct < 100
          ? isEs
            ? `${params.weekSharePct}% del volumen semanal`
            : `${params.weekSharePct}% of weekly volume`
          : undefined,
      subAccent: params.weekSharePct > 0 ? 'volume' : 'muted',
      accent: 'volume',
    },
    {
      id: 'intensity',
      label: isEs ? 'Intensidad promedio' : 'Average intensity',
      value: `${params.avgPct}% 1RM`,
      sub: intensityRangeSub(isEs, params.intensityMin, params.intensityMax),
      subAccent: 'muted',
      visualValue: params.avgPct,
      accent: 'intensity',
    },
    {
      id: 'sets',
      label: isEs ? 'Series totales' : 'Total sets',
      value: String(params.sets),
      sub: setsMeta.sub,
      subAccent: setsMeta.subAccent,
      accent: 'sets',
    },
    {
      id: 'duration',
      label: isEs ? 'Duración' : 'Duration',
      value:
        params.minutes > 0
          ? `${params.minutes}–${params.minutes + durationBuffer} min`
          : '—',
      sub: durationSub,
      subAccent: 'muted',
      accent: 'duration',
    },
  ];
}

/** Week scope — volume, intensity, sessions, duration. */
export function buildWeekScopeKpiCards(
  isEs: boolean,
  params: {
    tonnage: number;
    avgPct: number;
    intensityMin: number;
    intensityMax: number;
    sets: number;
    reps: number;
    dayCount: number;
    minutes: number;
    execution?: { completedSets: number; prescribedSets: number; completionPct: number } | null;
  },
): ProgramStatsKpiCard[] {
  const setsMeta = executionSetsSub(isEs, params.execution, params.reps);
  const estimatedMinutes = params.minutes + params.dayCount * 15;

  return [
    {
      id: 'volume',
      label: isEs ? 'Volumen semanal' : 'Weekly volume',
      value: params.tonnage > 0 ? `${params.tonnage.toLocaleString()} kg` : '—',
      accent: 'volume',
    },
    {
      id: 'intensity',
      label: isEs ? 'Intensidad promedio' : 'Average intensity',
      value: `${params.avgPct}% 1RM`,
      sub: intensityRangeSub(isEs, params.intensityMin, params.intensityMax),
      subAccent: 'muted',
      visualValue: params.avgPct,
      accent: 'intensity',
    },
    {
      id: 'sessions',
      label: isEs ? 'Sesiones' : 'Sessions',
      value: String(params.dayCount),
      sub: isEs
        ? `${params.dayCount === 1 ? 'día programado' : 'días programados'}`
        : `${params.dayCount === 1 ? 'scheduled day' : 'scheduled days'}`,
      subAccent: 'muted',
      accent: 'sessions',
    },
    {
      id: 'duration',
      label: isEs ? 'Duración' : 'Duration',
      value: formatStatsDuration(estimatedMinutes),
      sub: setsMeta.sub,
      subAccent: setsMeta.subAccent,
      accent: 'duration',
    },
  ];
}

/** Program scope — total volume, intensity, weeks/sessions, duration. */
export function buildProgramScopeKpiCards(
  isEs: boolean,
  params: {
    tonnage: number;
    avgPct: number;
    intensityMin: number;
    intensityMax: number;
    weekCount: number;
    sessionCount: number;
    minutes: number;
    execution?: { completedSets: number; prescribedSets: number; completionPct: number } | null;
  },
): ProgramStatsKpiCard[] {
  const estimatedMinutes = params.minutes + params.sessionCount * 15;

  return [
    {
      id: 'volume',
      label: isEs ? 'Volumen total' : 'Total volume',
      value: params.tonnage > 0 ? `${params.tonnage.toLocaleString()} kg` : '—',
      accent: 'volume',
    },
    {
      id: 'intensity',
      label: isEs ? 'Intensidad promedio' : 'Average intensity',
      value: `${params.avgPct}% 1RM`,
      sub: intensityRangeSub(isEs, params.intensityMin, params.intensityMax),
      subAccent: 'muted',
      visualValue: params.avgPct,
      accent: 'intensity',
    },
    {
      id: 'weeks',
      label: isEs ? 'Semanas' : 'Weeks',
      value: String(params.weekCount),
      sub: isEs ? `${params.sessionCount} sesiones` : `${params.sessionCount} sessions`,
      subAccent: 'muted',
      accent: 'sessions',
    },
    {
      id: 'duration',
      label: isEs ? 'Duración' : 'Duration',
      value: formatStatsDuration(estimatedMinutes),
      sub: params.execution
        ? isEs
          ? `Completadas: ${params.execution.completionPct}%`
          : `Completed: ${params.execution.completionPct}%`
        : undefined,
      subAccent: params.execution ? 'success' : 'muted',
      accent: 'duration',
    },
  ];
}

/** @deprecated Use buildDayScopeKpiCards */
export function buildDayKpiCards(
  isEs: boolean,
  params: {
    tonnage: number;
    weekSharePct: number;
    avgPct: number;
    intensityMin: number;
    intensityMax: number;
    sets: number;
    reps: number;
    exerciseCount: number;
    workExerciseCount?: number;
    minutes?: number;
    execution?: { completedSets: number; prescribedSets: number; completionPct: number } | null;
  },
): ProgramStatsKpiCard[] {
  return buildDayScopeKpiCards(isEs, {
    tonnage: params.tonnage,
    weekSharePct: params.weekSharePct,
    avgPct: params.avgPct,
    intensityMin: params.intensityMin,
    intensityMax: params.intensityMax,
    sets: params.sets,
    reps: params.reps,
    minutes: params.minutes ?? 0,
    execution: params.execution,
  });
}
