import React, { useMemo, useState } from 'react';
import { formatStatsKg } from '../statsTonnage';
import {
  histogramMetricValue,
  type IntensityHistogramBin,
  type IntensityHistogramMetric,
} from '../programChartSeries';

export interface IntensityHistogramProps {
  bins: IntensityHistogramBin[];
  isEs: boolean;
  variant?: 'full' | 'compact';
  /** Compact mode locks metric (default tonnage). */
  metric?: IntensityHistogramMetric;
}

export const IntensityHistogram: React.FC<IntensityHistogramProps> = ({
  bins,
  isEs,
  variant = 'full',
  metric: metricProp,
}) => {
  const compact = variant === 'compact';
  const [metricState, setMetricState] = useState<IntensityHistogramMetric>('tonnage');
  const metric = compact ? (metricProp ?? 'tonnage') : metricState;

  const values = useMemo(() => bins.map((b) => histogramMetricValue(b, metric)), [bins, metric]);
  const maxVal = Math.max(...values, 1);
  const total = values.reduce((s, v) => s + v, 0);

  if (total <= 0) {
    return (
      <p className="wl-stats-rank__empty">
        {isEs ? 'Sin series prescritas.' : 'No prescribed sets.'}
      </p>
    );
  }

  const metricLabels: Record<IntensityHistogramMetric, string> = isEs
    ? { series: 'Series', reps: 'Reps', tonnage: 'Tonelaje' }
    : { series: 'Sets', reps: 'Reps', tonnage: 'Tonelaje' };

  const formatVal = (v: number) => {
    if (metric === 'tonnage') return formatStatsKg(v);
    return String(v);
  };

  return (
    <div className={`wl-stats-hist${compact ? ' wl-stats-hist--compact' : ''}`}>
      {!compact ? (
        <div className="wl-stats-hist__toggle" role="tablist" aria-label={isEs ? 'Métrica' : 'Metric'}>
          {(['tonnage', 'reps', 'series'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={metric === m}
              className={`wl-stats-hist__toggle-btn${metric === m ? ' is-active' : ''}`}
              onClick={() => setMetricState(m)}
            >
              {metricLabels[m]}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="wl-stats-hist__bars" aria-label={isEs ? 'Distribución de intensidad' : 'Intensity distribution'}>
        {bins.map((bin, i) => {
          const val = values[i] ?? 0;
          const pct = total > 0 ? Math.round((val / total) * 100) : 0;
          const h = maxVal > 0 ? Math.max(val > 0 ? 8 : 2, (val / maxVal) * (compact ? 72 : 100)) : 2;
          return (
            <li key={bin.id} className="wl-stats-hist__bar-wrap">
              <div
                className="wl-stats-hist__bar"
                style={{ height: `${h}px` }}
                title={`${bin.label}: ${formatVal(val)} (${pct}%)`}
                role="img"
                aria-label={`${bin.label} ${formatVal(val)}`}
              />
              <span className="wl-stats-hist__bar-label">{bin.label}</span>
              {!compact && val > 0 ? (
                <span className="wl-stats-hist__bar-val">{pct}%</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
