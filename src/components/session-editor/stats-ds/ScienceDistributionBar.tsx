import React from 'react';
import {
  scienceZoneLabel,
  type ScienceZoneId,
  type ScienceZoneSlice,
} from '../programScienceStats';

export interface ScienceDistributionBarProps {
  slices: ScienceZoneSlice[];
  isEs: boolean;
  /** Show volume % (default) or reps % */
  mode?: 'volume' | 'reps';
}

const ZONE_COLORS: Record<ScienceZoneId, string> = {
  Tecnica_Velocidad: 'var(--stats-blue)',
  Acumulacion_Tension: 'var(--stats-green)',
  Potencia_Neural: 'var(--stats-orange)',
};

/** Donut for DeepSeek science zones (<70 / 70–85 / >85) — stats module only. */
export const ScienceDistributionBar: React.FC<ScienceDistributionBarProps> = ({
  slices,
  isEs,
  mode = 'volume',
}) => {
  const empty = slices.every((s) => (mode === 'volume' ? s.volumePct : s.repsPct) <= 0);

  const view = slices.map((s) => ({
    zone: s.zone,
    pct: mode === 'volume' ? s.volumePct : s.repsPct,
    label: scienceZoneLabel(s.zone, isEs),
    range: s.range,
  }));

  const gradientParts: string[] = [];
  let cursor = 0;
  for (const slice of view) {
    if (slice.pct <= 0) continue;
    const start = cursor;
    const end = cursor + slice.pct;
    gradientParts.push(`${ZONE_COLORS[slice.zone]} ${start}% ${end}%`);
    cursor = end;
  }

  const dominant = empty
    ? null
    : view.reduce((best, slice) => (slice.pct > best.pct ? slice : best), view[0]!);

  const ariaLabel = view.map((s) => `${s.label} ${s.pct}%`).join(', ');

  return (
    <div className="wl-stats-dist wl-stats-dist--pie wl-stats-dist--science">
      <p className="wl-stats-dist__hint">
        {isEs
          ? 'Zonas científicas (<70 / 70–85 / >85). Distintas del editor.'
          : 'Science zones (<70 / 70–85 / >85). Separate from editor purpose.'}
      </p>
      <div className="wl-stats-dist__pie-layout">
        <div
          className={`wl-stats-dist__pie${empty ? ' wl-stats-dist__pie--empty' : ''}`}
          style={
            empty
              ? undefined
              : {
                  background: `conic-gradient(from -90deg, ${gradientParts.join(', ')})`,
                }
          }
          role="img"
          aria-label={ariaLabel}
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
            <li key={slice.zone} className="wl-stats-dist__legend-item">
              <span
                className="wl-stats-dist__swatch"
                style={{ background: ZONE_COLORS[slice.zone] }}
                aria-hidden
              />
              <span className="wl-stats-dist__legend-name">
                {slice.label}
                <span className="wl-stats-dist__legend-range"> {slice.range}</span>
              </span>
              <span className="wl-stats-dist__legend-value">
                {empty ? '—' : `${slice.pct}%`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
