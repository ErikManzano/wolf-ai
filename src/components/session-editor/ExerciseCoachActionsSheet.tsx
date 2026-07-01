import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUp, Copy, Pencil, Trash2 } from 'lucide-react';
import { COACH_MOBILE_SPRING_SOFT } from './coachMobileMotion';
import { useBottomSheet } from '../mobile-wl/hooks/useBottomSheet';
import './exercise-coach-actions-sheet.css';

export interface ExerciseCoachActionsSheetProps {
  open: boolean;
  onClose: () => void;
  isEs: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEditExercise?: () => void;
  onDuplicateExercise?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDeleteExercise?: () => void;
}

export const ExerciseCoachActionsSheet: React.FC<ExerciseCoachActionsSheetProps> = ({
  open,
  onClose,
  isEs,
  canDelete,
  canDuplicate,
  canMoveUp,
  canMoveDown,
  onEditExercise,
  onDuplicateExercise,
  onMoveUp,
  onMoveDown,
  onDeleteExercise,
}) => {
  const reduceMotion = useReducedMotion();
  const { panelRef, onBackdropClick } = useBottomSheet(open, onClose);
  const [moveOpen, setMoveOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) setMoveOpen(false);
  }, [open]);

  const run = (fn?: () => void) => {
    if (!fn) return;
    onClose();
    fn();
  };

  const showMove = Boolean(onMoveUp || onMoveDown);

  return (
    <AnimatePresence>
      {open ? (
        <div className="mwl-sheet-root wolf-se-coach-actions-root" aria-hidden={!open}>
          <motion.button
            type="button"
            className="mwl-sheet-backdrop"
            aria-label={isEs ? 'Cerrar' : 'Close'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0.01 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={onBackdropClick}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={isEs ? 'Acciones del ejercicio' : 'Exercise actions'}
            tabIndex={-1}
            className="mwl-sheet-panel wolf-se-coach-actions-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reduceMotion ? { duration: 0.01 } : COACH_MOBILE_SPRING_SOFT}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 400) onClose();
            }}
          >
            <div className="mwl-sheet-handle" aria-hidden />
            {moveOpen ? (
              <div className="wolf-se-coach-actions-sheet__panel">
                <p className="wolf-se-coach-actions-sheet__subtitle">
                  {isEs ? 'Mover ejercicio' : 'Move exercise'}
                </p>
                <ul className="wolf-se-coach-actions-sheet__list">
                  <li>
                    <button
                      type="button"
                      className="wolf-se-coach-actions-sheet__item"
                      disabled={!canMoveUp}
                      onClick={() => run(onMoveUp)}
                    >
                      <ArrowUp size={18} aria-hidden />
                      <span>{isEs ? 'Mover arriba' : 'Move up'}</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="wolf-se-coach-actions-sheet__item"
                      disabled={!canMoveDown}
                      onClick={() => run(onMoveDown)}
                    >
                      <ArrowDown size={18} aria-hidden />
                      <span>{isEs ? 'Mover abajo' : 'Move down'}</span>
                    </button>
                  </li>
                </ul>
                <button
                  type="button"
                  className="wolf-se-coach-actions-sheet__cancel"
                  onClick={() => setMoveOpen(false)}
                >
                  {isEs ? 'Volver' : 'Back'}
                </button>
              </div>
            ) : (
              <div className="wolf-se-coach-actions-sheet__panel">
                <ul className="wolf-se-coach-actions-sheet__list">
                  {onEditExercise ? (
                    <li>
                      <button
                        type="button"
                        className="wolf-se-coach-actions-sheet__item"
                        onClick={() => run(onEditExercise)}
                      >
                        <Pencil size={18} aria-hidden />
                        <span>{isEs ? 'Editar ejercicio' : 'Edit exercise'}</span>
                      </button>
                    </li>
                  ) : null}
                  {onDuplicateExercise ? (
                    <li>
                      <button
                        type="button"
                        className="wolf-se-coach-actions-sheet__item"
                        disabled={!canDuplicate}
                        onClick={() => run(onDuplicateExercise)}
                      >
                        <Copy size={18} aria-hidden />
                        <span>{isEs ? 'Duplicar ejercicio' : 'Duplicate exercise'}</span>
                      </button>
                    </li>
                  ) : null}
                  {showMove ? (
                    <li>
                      <button
                        type="button"
                        className="wolf-se-coach-actions-sheet__item"
                        disabled={!canMoveUp && !canMoveDown}
                        onClick={() => setMoveOpen(true)}
                      >
                        <ArrowUp size={18} aria-hidden />
                        <span>{isEs ? 'Mover ejercicio' : 'Move exercise'}</span>
                      </button>
                    </li>
                  ) : null}
                  {onDeleteExercise ? (
                    <li>
                      <button
                        type="button"
                        className="wolf-se-coach-actions-sheet__item wolf-se-coach-actions-sheet__item--danger"
                        disabled={!canDelete}
                        onClick={() => run(onDeleteExercise)}
                      >
                        <Trash2 size={18} aria-hidden />
                        <span>{isEs ? 'Eliminar ejercicio' : 'Delete exercise'}</span>
                      </button>
                    </li>
                  ) : null}
                </ul>
                <button type="button" className="wolf-se-coach-actions-sheet__cancel" onClick={onClose}>
                  {isEs ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
};
