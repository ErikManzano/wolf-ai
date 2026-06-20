import React from 'react';
import { Play, X } from 'lucide-react';
import type { WorkoutQueueItem } from './buildWorkoutQueue';

export interface WorkoutOverviewProps {
  dayLabel: string;
  exerciseCount: number;
  setCount: number;
  completedSets: number;
  preview: WorkoutQueueItem[];
  isEs: boolean;
  onClose: () => void;
  onStart: () => void;
}

export const WorkoutOverview: React.FC<WorkoutOverviewProps> = ({
  dayLabel,
  exerciseCount,
  setCount,
  completedSets,
  preview,
  isEs,
  onClose,
  onStart,
}) => {
  const pct = setCount > 0 ? Math.round((completedSets / setCount) * 100) : 0;

  return (
    <div className="wf-screen">
      <header className="wf-head">
        <button type="button" className="wf-icon-btn" onClick={onClose} aria-label={isEs ? 'Cerrar' : 'Close'}>
          <X size={20} />
        </button>
        <div className="wf-head__text">
          <p className="wf-kicker">{isEs ? 'Entrenamiento' : 'Workout'}</p>
          <h2 className="wf-title">{dayLabel}</h2>
        </div>
      </header>

      <div className="wf-progress-ring-wrap" aria-hidden>
        <svg className="wf-progress-ring" viewBox="0 0 120 120">
          <circle className="wf-progress-ring__track" cx="60" cy="60" r="52" />
          <circle
            className="wf-progress-ring__fill"
            cx="60"
            cy="60"
            r="52"
            strokeDasharray={`${(pct / 100) * 327} 327`}
          />
        </svg>
        <span className="wf-progress-ring__label">{pct}%</span>
      </div>

      <p className="wf-meta">
        {exerciseCount} {isEs ? 'ejercicios' : 'exercises'} · {setCount} {isEs ? 'series' : 'sets'}
      </p>

      <ul className="wf-preview-list">
        {preview.slice(0, 6).map((item) => (
          <li key={`${item.exerciseIndex}-${item.row.schemeIndex}-${item.row.setInstance}`} className="wf-preview-item">
            <span className="wf-preview-item__name">{item.exerciseName}</span>
            <span className="wf-preview-item__rx">
              {item.row.percentage}% · {item.row.prescribedReps} {isEs ? 'reps' : 'reps'}
            </span>
          </li>
        ))}
        {preview.length > 6 ? (
          <li className="wf-preview-item wf-preview-item--more">
            +{preview.length - 6} {isEs ? 'más' : 'more'}
          </li>
        ) : null}
      </ul>

      <footer className="wf-footer">
        <button type="button" className="wf-cta wf-cta--primary" onClick={onStart}>
          <Play size={18} fill="currentColor" aria-hidden />
          {isEs ? 'Iniciar entrenamiento' : 'Start workout'}
        </button>
      </footer>
    </div>
  );
};
