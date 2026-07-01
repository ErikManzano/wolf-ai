import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { coachModalMotion } from './coachMobileMotion';
import './exercise-delete-confirm-modal.css';

export interface ExerciseDeleteConfirmModalProps {
  open: boolean;
  exerciseName: string;
  isEs: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ExerciseDeleteConfirmModal: React.FC<ExerciseDeleteConfirmModalProps> = ({
  open,
  exerciseName,
  isEs,
  onConfirm,
  onCancel,
}) => {
  const reduceMotion = useReducedMotion();
  const modalMotion = coachModalMotion(reduceMotion);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  const label = exerciseName.trim() || (isEs ? 'este ejercicio' : 'this exercise');

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="wolf-se-delete-exercise-overlay"
          role="presentation"
          onClick={onCancel}
          initial={modalMotion.overlay.initial}
          animate={modalMotion.overlay.animate}
          exit={modalMotion.overlay.exit}
          transition={modalMotion.overlay.transition}
        >
          <motion.div
            className="wolf-se-delete-exercise-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wolf-se-delete-exercise-title"
            onClick={(e) => e.stopPropagation()}
            initial={modalMotion.card.initial}
            animate={modalMotion.card.animate}
            exit={modalMotion.card.exit}
            transition={modalMotion.card.transition}
          >
            <span className="wolf-se-delete-exercise-icon" aria-hidden>
              <AlertTriangle size={28} strokeWidth={1.75} />
            </span>
            <h3 id="wolf-se-delete-exercise-title" className="wolf-se-delete-exercise-title">
              {isEs ? 'Eliminar ejercicio' : 'Delete exercise'}
            </h3>
            <p className="wolf-se-delete-exercise-message">
              <AlertTriangle size={14} aria-hidden className="wolf-se-delete-exercise-message-icon" />
              <span>
                {isEs
                  ? `Se eliminará ${label} y todos sus bloques de este día.`
                  : `${label} and all its blocks will be removed from this day.`}
              </span>
            </p>
            <button type="button" className="wolf-se-delete-exercise-confirm" onClick={onConfirm}>
              {isEs ? 'Eliminar' : 'Delete'}
            </button>
            <button type="button" className="wolf-se-delete-exercise-cancel" onClick={onCancel}>
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
