import React, { useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { RepStepper } from '../primitives/RepStepper';
import type { WorkoutQueueItem } from './buildWorkoutQueue';

const RPE_VALUES = [6, 7, 8, 9, 10] as const;

export interface WorkoutActiveSetProps {
  item: WorkoutQueueItem;
  setIndex: number;
  totalSets: number;
  isEs: boolean;
  initialKg: number;
  initialReps: number;
  initialRpe?: number;
  onClose: () => void;
  onBack: () => void;
  onComplete: (actualKg: number, actualReps: number, actualRpe: number) => void;
}

export const WorkoutActiveSet: React.FC<WorkoutActiveSetProps> = ({
  item,
  setIndex,
  totalSets,
  isEs,
  initialKg,
  initialReps,
  initialRpe,
  onClose,
  onBack,
  onComplete,
}) => {
  const [actualReps, setActualReps] = useState(initialReps);
  const [rpe, setRpe] = useState(initialRpe ?? 7);

  const { row, exerciseName, isComplex } = item;

  if (isComplex) {
    return (
      <div className="wf-screen">
        <header className="wf-head">
          <button type="button" className="wf-icon-btn" onClick={onBack} aria-label={isEs ? 'Atrás' : 'Back'}>
            <ChevronLeft size={20} />
          </button>
          <div className="wf-head__text">
            <p className="wf-kicker">{exerciseName}</p>
            <h2 className="wf-title">{isEs ? 'Complejo' : 'Complex'}</h2>
          </div>
          <button type="button" className="wf-icon-btn" onClick={onClose} aria-label={isEs ? 'Cerrar' : 'Close'}>
            <X size={20} />
          </button>
        </header>
        <p className="wf-complex-hint">
          {isEs
            ? 'Los complejos se registran desde la lista del día por ahora. Pulsa continuar para saltar.'
            : 'Complexes are logged from the day list for now. Tap continue to skip.'}
        </p>
        <footer className="wf-footer">
          <button type="button" className="wf-cta wf-cta--primary" onClick={() => onComplete(initialKg, initialReps, rpe)}>
            {isEs ? 'Continuar' : 'Continue'}
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="wf-screen">
      <header className="wf-head">
        <button type="button" className="wf-icon-btn" onClick={onBack} aria-label={isEs ? 'Atrás' : 'Back'}>
          <ChevronLeft size={20} />
        </button>
        <div className="wf-head__text">
          <p className="wf-kicker">
            {isEs ? 'Serie' : 'Set'} {setIndex + 1} {isEs ? 'de' : 'of'} {totalSets}
          </p>
          <h2 className="wf-title">{exerciseName}</h2>
        </div>
        <button type="button" className="wf-icon-btn" onClick={onClose} aria-label={isEs ? 'Cerrar' : 'Close'}>
          <X size={20} />
        </button>
      </header>

      <div className="wf-target-card">
        <div className="wf-target-stat">
          <span className="wf-target-label">% 1RM</span>
          <strong>{row.percentage}%</strong>
        </div>
        <div className="wf-target-stat wf-target-stat--accent">
          <span className="wf-target-label">{isEs ? 'Carga' : 'Load'}</span>
          <strong>{initialKg} kg</strong>
        </div>
        <div className="wf-target-stat">
          <span className="wf-target-label">{isEs ? 'Reps obj.' : 'Target reps'}</span>
          <strong>{row.prescribedReps}</strong>
        </div>
      </div>

      <section className="wf-reps-panel" aria-label={isEs ? 'Reps realizadas' : 'Reps completed'}>
        <p className="wf-panel-label">{isEs ? 'Reps realizadas' : 'Reps completed'}</p>
        <RepStepper value={actualReps} onChange={setActualReps} />
      </section>

      <section className="wf-rpe-panel" aria-label="RPE">
        <p className="wf-panel-label">RPE</p>
        <div className="wf-rpe-grid" role="group" aria-label={isEs ? 'Escala RPE' : 'RPE scale'}>
          {RPE_VALUES.map((n) => (
            <button
              key={n}
              type="button"
              className={`wf-rpe-btn${rpe === n ? ' is-active' : ''}`}
              onClick={() => setRpe(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <footer className="wf-footer">
        <button
          type="button"
          className="wf-cta wf-cta--accent"
          onClick={() => onComplete(initialKg, actualReps, rpe)}
        >
          {isEs ? 'Completar serie' : 'Complete set'}
        </button>
      </footer>
    </div>
  );
};
