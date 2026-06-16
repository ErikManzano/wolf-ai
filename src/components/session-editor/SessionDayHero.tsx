import React from 'react';
import type { Session } from '../../models/training';

interface SessionDayHeroProps {
  session: Session;
  isEs: boolean;
}

export const SessionDayHero: React.FC<SessionDayHeroProps> = ({ session, isEs }) => {
  const metrics = [
    { value: session.totalReps, label: isEs ? 'reps' : 'reps' },
    { value: session.load, label: 'kg' },
    { value: session.kValue.toFixed(1), label: 'K' },
    { value: session.avgRelativeIntensity.toFixed(0), label: '%∅' },
  ];

  return (
    <aside
      className="wolf-se-day-hero wolf-se-day-hero--compact"
      aria-label={isEs ? 'Resumen del día' : 'Day summary'}
    >
      <span className="wolf-se-day-hero-label">{isEs ? 'Resumen' : 'Summary'}</span>
      <div className="wolf-se-day-hero-stats" role="group" aria-label={isEs ? 'Métricas del día' : 'Day metrics'}>
        {metrics.map(({ value, label }, index) => (
          <span key={label} className="wolf-se-hero-stat">
            <span className="wolf-se-hero-stat-val">{value}</span>
            <span className="wolf-se-hero-stat-lbl">{label}</span>
            {index < metrics.length - 1 ? (
              <span className="wolf-se-hero-stat-sep" aria-hidden>
                ·
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </aside>
  );
};
