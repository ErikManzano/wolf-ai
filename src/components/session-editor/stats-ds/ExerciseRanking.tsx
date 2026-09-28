import React from 'react';
import type { ExerciseVolumeSlice } from '../sessionSummaryMetrics';
import type { ExerciseVolumeRemainder } from '../programWeekStats';
import { formatStatsKg } from '../statsTonnage';

export interface ExerciseRankingProps {
  slices: ExerciseVolumeSlice[];
  isEs: boolean;
  maxSlices?: number;
  remainder?: ExerciseVolumeRemainder | null;
  /** Bar grow animation on mount / data change */
  animateOnMount?: boolean;
}

export const ExerciseRanking: React.FC<ExerciseRankingProps> = ({
  slices,
  isEs,
  maxSlices = 6,
  remainder = null,
  animateOnMount = false,
}) => {
  const rows = slices.slice(0, maxSlices);
  if (rows.length === 0 && !remainder) {
    return (
      <p className="wl-stats-rank__empty">
        {isEs ? 'Sin volumen de ejercicios para mostrar.' : 'No exercise volume to show.'}
      </p>
    );
  }

  const maxPct = Math.max(...rows.map((r) => r.pct), remainder?.pct ?? 0, 1);

  return (
    <ol className={`wl-stats-rank${animateOnMount ? ' wl-stats-rank--animate' : ''}`}>
      {rows.map((row) => {
        const initials = row.label
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? '')
          .join('');
        return (
          <li key={row.label} className="wl-stats-rank__row">
            <span className="wl-stats-rank__thumb" aria-hidden title={row.label}>
              {initials || '?'}
            </span>
            <span className="wl-stats-rank__label wl-stats-rank__label--clamp" title={row.label}>
              {row.label}
            </span>
            <span className="wl-stats-rank__track" aria-hidden>
              <span
                className="wl-stats-rank__fill"
                style={{ width: `${Math.max(4, (row.pct / maxPct) * 100)}%` }}
              />
            </span>
            <span className="wl-stats-rank__meta">
              <strong>{formatStatsKg(row.tonnage, { alwaysKg: true })}</strong>
              <span>{row.pct}%</span>
            </span>
          </li>
        );
      })}
      {remainder && remainder.exerciseCount > 0 ? (
        <li key="__remainder" className="wl-stats-rank__row wl-stats-rank__row--remainder">
          <span className="wl-stats-rank__thumb wl-stats-rank__thumb--remainder" aria-hidden>
            …
          </span>
          <span className="wl-stats-rank__label">
            {isEs
              ? `Resto (${remainder.exerciseCount} ejercicios)`
              : `Rest (${remainder.exerciseCount} exercises)`}
          </span>
          <span className="wl-stats-rank__track" aria-hidden>
            <span
              className="wl-stats-rank__fill wl-stats-rank__fill--remainder"
              style={{ width: `${Math.max(4, (remainder.pct / maxPct) * 100)}%` }}
            />
          </span>
          <span className="wl-stats-rank__meta">
            <strong>{formatStatsKg(remainder.tonnage, { alwaysKg: true })}</strong>
            <span>{remainder.pct}%</span>
          </span>
        </li>
      ) : null}
    </ol>
  );
};
