import React, { useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock } from '../../../models/training';
import { WL_PCT_MAX, WL_PCT_MIN } from '../../../services/trainingEngine';
import { WL_SESSION_LIMITS } from '../../../services/sessionMutations';
import { kgForExercise } from '../../session-editor/blockMetrics';
import { SetEditorSheet } from '../sheets/SetEditorSheet';
import '../mobile-wl.css';

interface MobileSetCardProps {
  setIndex: number;
  row: SessionExerciseBlock['sets'][number];
  exercise?: Exercise;
  athlete: Athlete;
  exerciseName: string;
  isEs: boolean;
  canDuplicate: boolean;
  canRemove: boolean;
  onPctChange: (pct: number) => void;
  onRepsChange: (reps: number) => void;
  onSetsChange: (sets: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export const MobileSetCard: React.FC<MobileSetCardProps> = ({
  setIndex,
  row,
  exercise,
  athlete,
  exerciseName,
  isEs,
  canDuplicate,
  canRemove,
  onPctChange,
  onRepsChange,
  onSetsChange,
  onDuplicate,
  onRemove,
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const kg = exercise ? kgForExercise(athlete, exercise, row.percentage) : '—';
  const showActions = canDuplicate || canRemove;

  return (
    <>
      <div className="mwl-set-card-wrap">
        <button type="button" className="mwl-set-card" onClick={() => setSheetOpen(true)}>
          <span className="mwl-set-card-badge">{setIndex + 1}</span>
          <span className="mwl-set-card-body">
            <span className="mwl-set-card-rx">
              {row.percentage}% · {row.sets}×{row.reps}
            </span>
            <span className="mwl-set-card-sub">{exerciseName}</span>
          </span>
          <span className="mwl-set-card-kg">
            {kg}
            <span> kg</span>
          </span>
        </button>
        {showActions ? (
          <div className="mwl-set-card-inline-actions">
            {canDuplicate ? (
              <button
                type="button"
                className="mwl-set-card-inline-btn mwl-set-card-inline-btn--dup"
                title={isEs ? 'Duplicar serie' : 'Duplicate set'}
                aria-label={isEs ? 'Duplicar serie' : 'Duplicate set'}
                onClick={onDuplicate}
              >
                <Copy size={16} aria-hidden />
              </button>
            ) : null}
            {canRemove ? (
              <button
                type="button"
                className="mwl-set-card-inline-btn mwl-set-card-inline-btn--del"
                title={isEs ? 'Eliminar serie' : 'Remove set'}
                aria-label={isEs ? 'Eliminar serie' : 'Remove set'}
                onClick={onRemove}
              >
                <Trash2 size={16} aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <SetEditorSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        setIndex={setIndex}
        row={row}
        kg={String(kg)}
        exerciseName={exerciseName}
        isEs={isEs}
        onPctChange={onPctChange}
        onRepsChange={onRepsChange}
        onSetsChange={onSetsChange}
        onDuplicate={canDuplicate ? onDuplicate : undefined}
        pctMin={WL_PCT_MIN}
        pctMax={WL_PCT_MAX}
        repsMin={WL_SESSION_LIMITS.MIN_REPS_PER_SET}
        repsMax={WL_SESSION_LIMITS.MAX_REPS_PER_SET}
        setsMin={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
        setsMax={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
      />
    </>
  );
};
