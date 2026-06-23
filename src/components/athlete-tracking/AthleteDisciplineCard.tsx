import React from 'react';
import { TrendingUp } from 'lucide-react';

export interface AthleteDisciplineCardProps {
  completed: number;
  total: number;
  isEs: boolean;
  label?: string;
  exercisesDoneLabel?: string;
  compact?: boolean;
  className?: string;
}

export const AthleteDisciplineCard: React.FC<AthleteDisciplineCardProps> = ({
  completed,
  total,
  isEs,
  label,
  exercisesDoneLabel,
  compact = false,
  className,
}) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const disciplineLabel = label ?? (isEs ? 'Disciplina' : 'Discipline');
  const doneLabel = exercisesDoneLabel ?? (isEs ? 'ejercicios hechos' : 'exercises done');
  const rootClass = ['wolf-athlete-discipline', className].filter(Boolean).join(' ');

  if (compact) {
    return (
      <aside
        className={`${rootClass} wolf-athlete-discipline--compact`}
        aria-label={disciplineLabel}
      >
        <div className="wolf-athlete-discipline__strip">
          <div className="wolf-athlete-discipline__strip-meta">
            <TrendingUp size={14} strokeWidth={2} className="wolf-athlete-discipline-icon" aria-hidden />
            <span className="wolf-athlete-discipline-count">
              {completed}/{total}
            </span>
            <span className="wolf-athlete-discipline-sub wolf-athlete-discipline-sub--inline">
              {doneLabel}
            </span>
          </div>
          <span className="wolf-athlete-discipline-pct">{pct}%</span>
        </div>
        <div
          className="wolf-athlete-progress-track"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${disciplineLabel}: ${pct}%`}
        >
          <div className="wolf-athlete-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </aside>
    );
  }

  return (
    <aside className={rootClass} aria-label={disciplineLabel}>
      <div className="wolf-athlete-discipline__head">
        <div className="wolf-athlete-discipline__title-row">
          <TrendingUp size={16} strokeWidth={2} className="wolf-athlete-discipline-icon" aria-hidden />
          <span className="wolf-athlete-discipline-label">{disciplineLabel}</span>
        </div>
        <span className="wolf-athlete-discipline-pct">{pct}%</span>
      </div>

      <p className="wolf-athlete-discipline-sub">
        <strong className="wolf-athlete-discipline-count">
          {completed}/{total}
        </strong>{' '}
        {doneLabel}
      </p>

      <div
        className="wolf-athlete-progress-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${disciplineLabel}: ${pct}%`}
      >
        <div className="wolf-athlete-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </aside>
  );
};
