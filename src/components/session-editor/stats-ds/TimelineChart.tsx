import React from 'react';
import { formatStatsKg } from '../statsTonnage';

export interface TimelinePoint {
  key: string | number;
  label: string;
  value: number;
  secondaryValue?: number;
  secondaryLabel?: string;
}

export interface TimelineChartProps {
  points: TimelinePoint[];
  isEs: boolean;
  selectedKey?: string | number;
  peakKey?: string | number;
  onSelect?: (key: string | number) => void;
  showValues?: boolean;
  valueUnit?: 'kg' | 'pct' | 'none';
}

export const TimelineChart: React.FC<TimelineChartProps> = ({
  points,
  isEs,
  selectedKey,
  peakKey,
  onSelect,
  showValues = true,
  valueUnit = 'kg',
}) => {
  if (points.length === 0) {
    return (
      <p className="wl-stats-rank__empty">
        {isEs ? 'Sin datos de timeline.' : 'No timeline data.'}
      </p>
    );
  }

  const max = Math.max(...points.map((p) => p.value), 1);
  const interactive = Boolean(onSelect);

  return (
    <div className="wl-stats-timeline">
      <div className="wl-stats-timeline__bars" role="list">
        {points.map((point) => {
          const heightPct = Math.max(3, Math.round((point.value / max) * 100));
          const isSelected = selectedKey != null && point.key === selectedKey;
          const isPeak = peakKey != null && point.key === peakKey;
          const className = [
            'wl-stats-timeline__item',
            interactive ? 'wl-stats-timeline__item--interactive' : '',
            isSelected ? 'is-selected' : '',
            isPeak && !isSelected ? 'is-peak' : '',
          ]
            .filter(Boolean)
            .join(' ');

          const valueText =
            valueUnit === 'kg'
              ? formatStatsKg(point.value)
              : valueUnit === 'pct'
                ? `${Math.round(point.value)}%`
                : String(point.value);

          const content = (
            <>
              <span className="wl-stats-timeline__bar-wrap" aria-hidden>
                <span className="wl-stats-timeline__fill" style={{ height: `${heightPct}%` }} />
              </span>
              <span className="wl-stats-timeline__label">{point.label}</span>
              {showValues ? <span className="wl-stats-timeline__value">{valueText}</span> : null}
            </>
          );

          if (interactive) {
            return (
              <button
                key={String(point.key)}
                type="button"
                className={className}
                role="listitem"
                aria-pressed={isSelected}
                onClick={() => onSelect?.(point.key)}
              >
                {content}
              </button>
            );
          }

          return (
            <div key={String(point.key)} className={className} role="listitem">
              {content}
            </div>
          );
        })}
      </div>
      {points.some((p) => p.secondaryValue != null) ? (
        <ul className="wl-stats-timeline__secondary">
          {points
            .filter((p) => p.secondaryValue != null)
            .map((p) => (
              <li key={`sec-${String(p.key)}`} className="wl-stats-row">
                <span className="wl-stats-row__label">{p.secondaryLabel ?? p.label}</span>
                <span className="wl-stats-row__value">{Math.round(p.secondaryValue!)}%</span>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
};
