import React from 'react';
import type { ExerciseVolumeSlice } from '../sessionSummaryMetrics';
import { formatStatsKg } from '../statsTonnage';

export interface ExerciseRankingProps {
  slices: ExerciseVolumeSlice[];
  isEs: boolean;
  maxSlices?: number;
}

export const ExerciseRanking: React.FC<ExerciseRankingProps> = ({
  slices,
  isEs,
  maxSlices = 6,
}) => {
  const rows = slices.slice(0, maxSlices);
  if (rows.length === 0) {
    return (
      <p className="wl-stats-rank__empty">
        {isEs ? 'Sin volumen de ejercicios para mostrar.' : 'No exercise volume to show.'}
      </p>
    );
  }

  const maxPct = Math.max(...rows.map((r) => r.pct), 1);

  return (
    <ol className="wl-stats-rank">
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
            <span className="wl-stats-rank__label" title={row.label}>
              {row.label}
            </span>
            <span className="wl-stats-rank__track" aria-hidden>
              <span
                className="wl-stats-rank__fill"
                style={{ width: `${Math.max(4, (row.pct / maxPct) * 100)}%` }}
              />
            </span>
            <span className="wl-stats-rank__meta">
              <strong>{formatStatsKg(row.tonnage)}</strong>
              <span>{row.pct}%</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};
