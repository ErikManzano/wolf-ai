import React from 'react';
import { Plus } from 'lucide-react';
import './session-coach-day-cards.css';

interface CoachDayAddExerciseButtonProps {
  isEs: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

/** Full-width dashed add CTA — same visual on mobile and desktop. */
export const CoachDayAddExerciseButton: React.FC<CoachDayAddExerciseButtonProps> = ({
  isEs,
  disabled,
  onClick,
  className = '',
}) => (
  <button
    type="button"
    className={`wolf-se-coach-day-add${className ? ` ${className}` : ''}`}
    disabled={disabled}
    onClick={onClick}
  >
    <span className="wolf-se-coach-day-add__icon" aria-hidden>
      <Plus size={20} strokeWidth={2.25} />
    </span>
    {isEs ? 'Añadir ejercicio' : 'Add exercise'}
  </button>
);
