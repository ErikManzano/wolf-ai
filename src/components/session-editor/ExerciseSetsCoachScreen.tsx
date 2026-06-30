import React from 'react';
import { ArrowLeft, MoreVertical, Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import {
  addSetToBlock,
  duplicateSetAt,
  removeSetFromBlock,
  reorderSetsInBlock,
  updateSegmentRepAt,
  updateSetSchemeField,
} from '../../services/sessionMutations';
import { exerciseName } from './blockMetrics';
import { SetsTable } from './SetsTable';
import './exercise-sets-coach-screen.css';

export interface ExerciseSetsCoachScreenProps {
  block: SessionExerciseBlock;
  blockIndex: number;
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  totalBlocks: number;
  onApply: (fn: () => Session) => void;
  onBack: () => void;
  onRemoveBlock?: () => void;
}

export const ExerciseSetsCoachScreen: React.FC<ExerciseSetsCoachScreenProps> = ({
  block,
  blockIndex: bi,
  session,
  athlete,
  exercises,
  isEs,
  totalBlocks,
  onApply,
  onBack,
  onRemoveBlock,
}) => {
  const apply = onApply;
  const title = exerciseName(exercises, block.exerciseId);

  return (
    <div className="wolf-se-exercise-sets-coach">
      <header className="wolf-se-exercise-sets-coach__head">
        <button
          type="button"
          className="wolf-se-back-to-sheet"
          onClick={onBack}
          aria-label={isEs ? 'Volver al resumen' : 'Back to summary'}
        >
          <ArrowLeft size={18} aria-hidden />
        </button>
        <h2 className="wolf-se-exercise-sets-coach__title">{title}</h2>
        <div className="wolf-se-exercise-sets-coach__menu">
          {onRemoveBlock ? (
            <button
              type="button"
              className="wolf-se-toolbar-btn wolf-se-toolbar-btn--danger"
              title={isEs ? 'Quitar ejercicio' : 'Remove exercise'}
              aria-label={isEs ? 'Quitar ejercicio' : 'Remove exercise'}
              disabled={totalBlocks <= 1}
              onClick={onRemoveBlock}
            >
              <Trash2 size={18} aria-hidden />
            </button>
          ) : (
            <span className="wolf-se-exercise-sets-coach__menu-spacer" aria-hidden>
              <MoreVertical size={18} />
            </span>
          )}
        </div>
      </header>

      <div className="wolf-se-exercise-sets-coach__body">
        <SetsTable
          block={block}
          athlete={athlete}
          exercises={exercises}
          isEs={isEs}
          layout="embedded"
          coachMobile
          onPctChange={(si, v) =>
            apply(() => updateSetSchemeField(session, bi, si, 'percentage', v, athlete, exercises))
          }
          onRepsChange={(si, v) =>
            apply(() => updateSetSchemeField(session, bi, si, 'reps', v, athlete, exercises))
          }
          onSetsChange={(si, v) =>
            apply(() => updateSetSchemeField(session, bi, si, 'sets', v, athlete, exercises))
          }
          onRirChange={(si, v) =>
            apply(() => updateSetSchemeField(session, bi, si, 'targetRir', v, athlete, exercises))
          }
          onRestChange={(si, v) =>
            apply(() => updateSetSchemeField(session, bi, si, 'restSec', v, athlete, exercises))
          }
          onSegmentRepChange={(si, segIdx, val) =>
            apply(() => updateSegmentRepAt(session, bi, si, segIdx, val, athlete, exercises))
          }
          onAddSet={() => apply(() => addSetToBlock(session, bi, athlete, exercises))}
          onDuplicateSet={(si) => apply(() => duplicateSetAt(session, bi, si, athlete, exercises))}
          onRemoveSet={(si) => apply(() => removeSetFromBlock(session, bi, si, athlete, exercises))}
          onReorderSets={(from, to) =>
            apply(() => reorderSetsInBlock(session, bi, from, to, athlete, exercises))
          }
        />
      </div>

      <footer className="wolf-se-exercise-sets-coach__footer">
        <button
          type="button"
          className="wolf-se-coach-block-add"
          onClick={() => apply(() => addSetToBlock(session, bi, athlete, exercises))}
        >
          <Plus size={18} aria-hidden />
          {isEs ? 'Agregar bloque' : 'Add block'}
        </button>
      </footer>
    </div>
  );
};
