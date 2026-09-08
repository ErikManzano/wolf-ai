import React, { useId, useMemo } from 'react';
import { formatStatsKg } from '../statsTonnage';

export interface TrendSeries {
  id: string;
  label: string;
  values: number[];
  color?: string;
  unit?: 'kg' | 'pct' | 'au' | 'none';
}

export interface LineTrendChartProps {
  labels: string[];
  series: TrendSeries[];
  isEs: boolean;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  /** Optional horizontal reference (e.g. chronic baseline AU). */
  referenceValue?: number;
  referenceLabel?: string;
  height?: number;
}

function formatPoint(value: number, unit: TrendSeries['unit']): string {
  if (unit === 'kg') return formatStatsKg(value);
  if (unit === 'pct') return `${Math.round(value * 10) / 10}%`;
  if (unit === 'au') return `${Math.round(value * 10) / 10}`;
  return String(Math.round(value * 10) / 10);
}

/** Multi-series SVG line chart for week tonnage / intensity / TL trends. */
export const LineTrendChart: React.FC<LineTrendChartProps> = ({
  labels,
  series,
  isEs,
  selectedIndex,
  onSelectIndex,
  referenceValue,
  referenceLabel,
  height = 160,
}) => {
  const gid = useId().replace(/:/g, '');
  const width = 320;
  const padX = 12;
  const padY = 16;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const maxY = useMemo(() => {
    const vals = series.flatMap((s) => s.values);
    if (referenceValue != null && Number.isFinite(referenceValue)) vals.push(referenceValue);
    return Math.max(...vals, 1);
  }, [series, referenceValue]);

  const xAt = (i: number, n: number) => {
    if (n <= 1) return padX + plotW / 2;
    return padX + (i / (n - 1)) * plotW;
  };
  const yAt = (v: number) => padY + plotH - (v / maxY) * plotH;

  if (labels.length === 0 || series.every((s) => s.values.length === 0)) {
    return (
      <p className="wl-stats-rank__empty">
        {isEs ? 'Sin datos de tendencia.' : 'No trend data.'}
      </p>
    );
  }

  const n = labels.length;

  return (
    <div className="wl-stats-line">
      <svg
        className="wl-stats-line__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={isEs ? 'Tendencia semanal' : 'Weekly trend'}
      >
        {referenceValue != null && Number.isFinite(referenceValue) && referenceValue > 0 ? (
          <line
            x1={padX}
            x2={padX + plotW}
            y1={yAt(referenceValue)}
            y2={yAt(referenceValue)}
            className="wl-stats-line__ref"
          />
        ) : null}
        {series.map((s, si) => {
          const color = s.color ?? (si === 0 ? 'var(--stats-orange)' : 'var(--stats-blue)');
          const pts = s.values
            .map((v, i) => `${xAt(i, n).toFixed(1)},${yAt(v).toFixed(1)}`)
            .join(' ');
          const areaId = `fill-${gid}-${s.id}`;
          const first = s.values[0] ?? 0;
          const last = s.values[s.values.length - 1] ?? 0;
          return (
            <g key={s.id}>
              <defs>
                <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              {si === 0 && s.values.length > 1 ? (
                <polygon
                  fill={`url(#${areaId})`}
                  points={`${xAt(0, n).toFixed(1)},${yAt(0).toFixed(1)} ${pts} ${xAt(n - 1, n).toFixed(1)},${yAt(0).toFixed(1)}`}
                />
              ) : null}
              <polyline
                fill="none"
                stroke={color}
                strokeWidth={2.25}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={pts}
              />
              {s.values.map((v, i) => (
                <circle
                  key={`${s.id}-${i}`}
                  cx={xAt(i, n)}
                  cy={yAt(v)}
                  r={selectedIndex === i ? 4.5 : 3}
                  fill={color}
                  className={selectedIndex === i ? 'is-selected' : undefined}
                />
              ))}
              {/* keep endpoints readable for a11y title */}
              <title>
                {s.label}: {formatPoint(first, s.unit)} → {formatPoint(last, s.unit)}
              </title>
            </g>
          );
        })}
        {onSelectIndex
          ? labels.map((_, i) => (
              <rect
                key={`hit-${i}`}
                x={xAt(i, n) - plotW / Math.max(n, 1) / 2}
                y={0}
                width={Math.max(12, plotW / Math.max(n, 1))}
                height={height}
                fill="transparent"
                className="wl-stats-line__hit"
                onClick={() => onSelectIndex(i)}
              />
            ))
          : null}
      </svg>

      <div className="wl-stats-line__labels" aria-hidden>
        {labels.map((label, i) => (
          <button
            key={`${label}-${i}`}
            type="button"
            className={`wl-stats-line__label${selectedIndex === i ? ' is-selected' : ''}`}
            onClick={onSelectIndex ? () => onSelectIndex(i) : undefined}
            disabled={!onSelectIndex}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="wl-stats-line__legend">
        {series.map((s, si) => (
          <li key={s.id} className="wl-stats-line__legend-item">
            <span
              className="wl-stats-line__swatch"
              style={{ background: s.color ?? (si === 0 ? 'var(--stats-orange)' : 'var(--stats-blue)') }}
              aria-hidden
            />
            <span>{s.label}</span>
          </li>
        ))}
        {referenceLabel ? (
          <li className="wl-stats-line__legend-item wl-stats-line__legend-item--ref">
            <span className="wl-stats-line__swatch wl-stats-line__swatch--ref" aria-hidden />
            <span>{referenceLabel}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
};
