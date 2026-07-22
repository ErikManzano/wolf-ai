import React from 'react';
import type { MetricDelta } from '../statsComparison';

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  subTone?: 'muted' | 'success' | 'caution';
  /** Comparative context (↑↓ vs previous day/week) */
  delta?: MetricDelta | null;
  accent?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sub,
  subTone = 'muted',
  delta,
  accent = false,
}) => (
  <article className={`wl-stats-metric${accent ? ' wl-stats-metric--accent' : ''}`}>
    <span className="wl-stats-metric__label">{label}</span>
    <div className="wl-stats-metric__value">{value}</div>
    {sub != null && sub !== '' ? (
      <span className={`wl-stats-metric__sub wl-stats-metric__sub--${subTone}`}>{sub}</span>
    ) : null}
    {delta ? (
      <span className={`wl-stats-metric__delta wl-stats-metric__delta--${delta.tone}`}>
        {delta.label}
      </span>
    ) : null}
  </article>
);
