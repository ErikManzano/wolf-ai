import React from 'react';
import { purposePct, type SessionPurposeBreakdown } from '../sessionSummaryMetrics';

export interface DistributionBarProps {
  purpose: SessionPurposeBreakdown;
  isEs: boolean;
}

type SliceKey = 'technique' | 'work' | 'intensity';

const SLICE_COLORS: Record<SliceKey, string> = {
  technique: 'var(--stats-technique)',
  work: 'var(--stats-work)',
  intensity: 'var(--stats-intensity)',
};

export const DistributionBar: React.FC<DistributionBarProps> = ({ purpose, isEs }) => {
  const technique = purposePct(purpose, 'technique');
  const work = purposePct(purpose, 'work');
  const intensity = purposePct(purpose, 'intensity');
  const empty = purpose.total <= 0;

  const slices: Array<{ key: SliceKey; pct: number; label: string }> = [
    { key: 'technique', pct: technique, label: isEs ? 'Técnica' : 'Technique' },
    { key: 'work', pct: work, label: isEs ? 'Trabajo' : 'Work' },
    { key: 'intensity', pct: intensity, label: isEs ? 'Intensidad' : 'Intensity' },
  ];

  const gradientParts: string[] = [];
  let cursor = 0;
  for (const slice of slices) {
    if (slice.pct <= 0) continue;
    const start = cursor;
    const end = cursor + slice.pct;
    gradientParts.push(`${SLICE_COLORS[slice.key]} ${start}% ${end}%`);
    cursor = end;
  }

  const dominant = empty
    ? null
    : slices.reduce((best, slice) => (slice.pct > best.pct ? slice : best), slices[0]!);

  const ariaLabel = isEs
    ? `Técnica ${technique}%, trabajo ${work}%, intensidad ${intensity}%`
    : `Technique ${technique}%, work ${work}%, intensity ${intensity}%`;

  return (
    <div className="wl-stats-dist wl-stats-dist--pie">
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
          {slices.map((slice) => (
            <li key={slice.key} className="wl-stats-dist__legend-item">
              <span
                className={`wl-stats-dist__swatch wl-stats-dist__swatch--${slice.key}`}
                aria-hidden
              />
              <span className="wl-stats-dist__legend-name">{slice.label}</span>
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
