import React from 'react';
import { Check } from 'lucide-react';
import type { RepOutcome } from '../../models/training';
import { cn } from '../../lib/utils';

export interface RepOutcomeRowProps {
  outcomes: RepOutcome[];
  isEs: boolean;
  onToggle: (index: number) => void;
}

export const RepOutcomeRow: React.FC<RepOutcomeRowProps> = ({ outcomes, isEs, onToggle }) => (
  <ul className="wa-rep-outcomes" role="list" aria-label={isEs ? 'Estado de reps' : 'Rep status'}>
    {outcomes.map((outcome, index) => (
      <li key={index} className="wa-rep-outcomes__item">
        <button
          type="button"
          className={cn('wa-rep-outcome', `wa-rep-outcome--${outcome}`)}
          aria-label={
            outcome === 'completed'
              ? isEs
                ? `Rep ${index + 1} completada`
                : `Rep ${index + 1} completed`
              : outcome === 'failed'
                ? isEs
                  ? `Rep ${index + 1} fallida`
                  : `Rep ${index + 1} failed`
                : isEs
                  ? `Rep ${index + 1} pendiente`
                  : `Rep ${index + 1} pending`
          }
          onClick={(event) => {
            event.stopPropagation();
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
            onToggle(index);
          }}
        >
          <span className="wa-rep-outcome__visual" aria-hidden>
            {outcome === 'completed' ? <Check size={20} strokeWidth={3} /> : null}
            {outcome === 'failed' ? <span className="wa-rep-outcome__fail-dot" /> : null}
            {outcome === 'pending' ? <span className="wa-rep-outcome__pending-dot" /> : null}
          </span>
        </button>
      </li>
    ))}
  </ul>
);
