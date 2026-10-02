import React, { useMemo, useState } from 'react';
import {
  histogramMetricValue,
  type IntensityHistogramBin,
  type IntensityHistogramMetric,
} from '../programChartSeries';
import { formatStatsKg } from '../statsTonnage';

const BIN_COLORS: Record<string, string> = {
  lt70: '#3b82f6',
  '70-80': '#14b8a6',
  '80-90': '#eab308',
  '90-95': '#f97316',
  gt95: '#dc2626',
};

const METRICS: IntensityHistogramMetric[] = ['series', 'reps', 'tonnage'];

function sharePercents(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((value) => (value / total) * 100);
  const floors = exact.map((value) => Math.floor(value));
  let leftover = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || b.index - a.index);
  for (const item of order) {
    if (leftover <= 0) break;
    floors[item.index] = (floors[item.index] ?? 0) + 1;
    leftover -= 1;
  }
  return floors;
}

export interface IntensityDistributionDonutProps {
  bins: IntensityHistogramBin[];
  isEs: boolean;
  /** Dock: donut compacto junto a la leyenda de rangos. */
  dense?: boolean;
}

/** Donut de intensidad en cinco rangos, conmutable entre series, reps y tonelaje. */
export const IntensityDistributionDonut: React.FC<IntensityDistributionDonutProps> = ({
  bins,
  isEs,
  dense = false,
}) => {
  const [metric, setMetric] = useState<IntensityHistogramMetric>('tonnage');
  const values = useMemo(() => bins.map((bin) => histogramMetricValue(bin, metric)), [bins, metric]);
  const percents = useMemo(() => sharePercents(values), [values]);
  const total = values.reduce((sum, value) => sum + value, 0);
  const empty = total <= 0;

  const metricLabels: Record<IntensityHistogramMetric, string> = isEs
    ? { series: 'Series', reps: 'Reps', tonnage: 'Tonelaje' }
    : { series: 'Sets', reps: 'Reps', tonnage: 'Tonelaje' };

  const view = bins.map((bin, index) => ({
    id: bin.id,
    label: bin.label,
    value: values[index] ?? 0,
    pct: percents[index] ?? 0,
    color: BIN_COLORS[bin.id] ?? '#78716c',
  }));

  const gradientParts: string[] = [];
  let cursor = 0;
  for (const slice of view) {
    if (slice.pct <= 0) continue;
    const end = cursor + slice.pct;
    gradientParts.push(`${slice.color} ${cursor}% ${end}%`);
    cursor = end;
  }

  const dominant = empty
    ? null
    : view.reduce((best, slice) => (slice.pct > best.pct ? slice : best), view[0]!);

  const formatValue = (value: number) => {
    if (metric === 'tonnage') return formatStatsKg(value, { alwaysKg: true });
    return String(Math.round(value));
  };

  const ariaLabel = view.map((slice) => `${slice.label} ${slice.pct}%`).join(', ');

  return (
    <div className={`wl-stats-intensity${dense ? ' wl-stats-intensity--dense' : ''}`}>
      <div
        className="wl-stats-hist__toggle wl-stats-intensity__toggle"
        role="tablist"
        aria-label={isEs ? 'Métrica de la distribución' : 'Distribution metric'}
      >
        {METRICS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={metric === item}
            className={`wl-stats-hist__toggle-btn${metric === item ? ' is-active' : ''}`}
            onClick={() => setMetric(item)}
          >
            {metricLabels[item]}
          </button>
        ))}
      </div>

      <div
        className={`wl-stats-dist wl-stats-dist--pie wl-stats-dist--dense wl-stats-dist--intensity${empty ? ' is-empty' : ''}`}
      >
        <div className="wl-stats-dist__pie-layout">
          <div
            className={`wl-stats-dist__pie${empty ? ' wl-stats-dist__pie--empty' : ''}`}
            style={empty ? undefined : { background: `conic-gradient(from -90deg, ${gradientParts.join(', ')})` }}
            role="img"
            aria-label={`${isEs ? 'Distribución de intensidad' : 'Intensity distribution'}, ${metricLabels[metric]}: ${ariaLabel}`}
          >
            <div className="wl-stats-dist__pie-hole">
              {dominant && !empty ? (
                <>
                  <strong className="wl-stats-dist__pie-value">{dominant.pct}%</strong>
                  <span className="wl-stats-dist__pie-label">{dominant.label}</span>
                </>
              ) : (
                <span className="wl-stats-dist__pie-label">{isEs ? 'Sin datos' : 'No data'}</span>
              )}
            </div>
          </div>

          <ul className="wl-stats-dist__legend wl-stats-dist__legend--stacked">
            {view.map((slice) => (
              <li
                key={slice.id}
                className={`wl-stats-dist__legend-item${slice.pct <= 0 ? ' is-zero' : ''}`}
                title={`${slice.label}: ${formatValue(slice.value)} (${slice.pct}%)`}
              >
                <span className="wl-stats-dist__swatch" style={{ background: slice.color }} aria-hidden />
                <span className="wl-stats-dist__legend-name">{slice.label}</span>
                <span className="wl-stats-dist__legend-value">{empty ? '—' : `${slice.pct}%`}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
