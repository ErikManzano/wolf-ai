import React from 'react';
import { ListOrdered, Plus } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock } from '../../../models/training';
import { WL_SESSION_LIMITS } from '../../../services/sessionMutations';
import { exerciseName } from '../../session-editor/blockMetrics';
import { SectionHeader } from '../../session-editor/SectionHeader';
import { MobileSetCard } from './MobileSetCard';
import '../mobile-wl.css';

interface MobileSetListProps {
  block: SessionExerciseBlock;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  onPctChange: (setIndex: number, pct: number) => void;
  onRepsChange: (setIndex: number, reps: number) => void;
  onSetsChange: (setIndex: number, sets: number) => void;
  onAddSet: () => void;
  onDuplicateSet: (setIndex: number) => void;
  onRemoveSet: (setIndex: number) => void;
}

export const MobileSetList: React.FC<MobileSetListProps> = ({
  block,
  athlete,
  exercises,
  isEs,
  onPctChange,
  onRepsChange,
  onSetsChange,
  onAddSet,
  onDuplicateSet,
  onRemoveSet,
}) => {
  const ex = exercises.find((e) => e.id === block.exerciseId);
  const name = exerciseName(exercises, block.exerciseId);

  const addBtn = (
    <button
      type="button"
      className="wolf-se-btn wolf-se-btn--primary wolf-se-btn--sm"
      disabled={block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
      onClick={onAddSet}
    >
      <Plus size={14} aria-hidden />
      {isEs ? 'Serie' : 'Set'}
    </button>
  );

  return (
    <section className="wolf-se-sets-section">
      <SectionHeader icon={ListOrdered} title={isEs ? 'Esquema de series' : 'Set scheme'} action={addBtn} />
      <div className="mwl-set-list">
        {block.sets.map((row, si) => (
          <MobileSetCard
            key={si}
            setIndex={si}
            row={row}
            exercise={ex}
            athlete={athlete}
            exerciseName={name}
            isEs={isEs}
            canDuplicate={block.sets.length < WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
            canRemove={block.sets.length > 1}
            onPctChange={(v) => onPctChange(si, v)}
            onRepsChange={(v) => onRepsChange(si, v)}
            onSetsChange={(v) => onSetsChange(si, v)}
            onDuplicate={() => onDuplicateSet(si)}
            onRemove={() => onRemoveSet(si)}
          />
        ))}
      </div>
      <p className="wolf-se-sets-hint">
        {isEs ? 'Toca una serie para editar · desliza para acciones' : 'Tap a set to edit · swipe for actions'}
      </p>
    </section>
  );
};
