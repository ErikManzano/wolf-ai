import React from 'react';
import { purposePct, type SessionPurposeBreakdown } from '../sessionSummaryMetrics';

export interface DistributionBarProps {
  purpose: SessionPurposeBreakdown;
  isEs: boolean;
  insight?: string;
}

export const DistributionBar: React.FC<DistributionBarProps> = ({ purpose, isEs, insight }) => {
  const technique = purposePct(purpose, 'technique');
  const work = purposePct(purpose, 'work');
  const intensity = purposePct(purpose, 'intensity');
  const empty = purpose.total <= 0;

  return (
    <div className="wl-stats-dist">
      <div
        className="wl-stats-dist__track"
        role="img"
        aria-label={
          isEs
            ? `Técnica ${technique}%, trabajo ${work}%, intensidad ${intensity}%`
            : `Technique ${technique}%, work ${work}%, intensity ${intensity}%`
        }
      >
        {!empty ? (
          <>
            <span className="wl-stats-dist__seg wl-stats-dist__seg--technique" style={{ flex: technique }} />
            <span className="wl-stats-dist__seg wl-stats-dist__seg--work" style={{ flex: work }} />
            <span className="wl-stats-dist__seg wl-stats-dist__seg--intensity" style={{ flex: intensity }} />
          </>
        ) : null}
      </div>
      <ul className="wl-stats-dist__legend">
        <li className="wl-stats-dist__legend-item">
          <span className="wl-stats-dist__swatch wl-stats-dist__swatch--technique" aria-hidden />
          <span>{isEs ? 'Técnica' : 'Technique'}</span>
          <span className="wl-stats-dist__legend-value">{empty ? '—' : `${technique}%`}</span>
        </li>
        <li className="wl-stats-dist__legend-item">
          <span className="wl-stats-dist__swatch wl-stats-dist__swatch--work" aria-hidden />
          <span>{isEs ? 'Trabajo' : 'Work'}</span>
          <span className="wl-stats-dist__legend-value">{empty ? '—' : `${work}%`}</span>
        </li>
        <li className="wl-stats-dist__legend-item">
          <span className="wl-stats-dist__swatch wl-stats-dist__swatch--intensity" aria-hidden />
          <span>{isEs ? 'Intensidad' : 'Intensity'}</span>
          <span className="wl-stats-dist__legend-value">{empty ? '—' : `${intensity}%`}</span>
        </li>
      </ul>
      {insight ? <p className="wl-stats-dist__insight">{insight}</p> : null}
    </div>
  );
};
