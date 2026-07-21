import React from 'react';
import type { ExerciseBlockKind } from '../../services/sessionMutations';
import { exerciseBlockKindLabel, exerciseBlockKindLabelShort } from '../../services/sessionMutations';
import './coach-block-type-picker.css';

const KINDS: readonly ExerciseBlockKind[] = ['simple', 'complex'];

export interface CoachBlockTypePickerProps {
  kind: ExerciseBlockKind;
  isEs: boolean;
  onChange: (kind: ExerciseBlockKind) => void;
  className?: string;
  /** Compact row for exercise cards; `panel` for overview header. */
  variant?: 'inline' | 'panel';
}

export const CoachBlockTypePicker: React.FC<CoachBlockTypePickerProps> = ({
  kind,
  isEs,
  onChange,
  className,
  variant = 'inline',
}) => {
  const ariaLabel = isEs ? 'Tipo de ejercicio' : 'Exercise type';

  return (
    <div
      className={[
        'wolf-se-coach-block-type',
        variant === 'panel' ? 'wolf-se-coach-block-type--panel' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="radiogroup"
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {KINDS.map((value) => {
        const active = kind === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`wolf-se-coach-block-type__chip wolf-se-coach-block-type__chip--${value}${active ? ' is-active' : ''}`}
            onClick={() => {
              if (!active) onChange(value);
            }}
          >
            <span className="wolf-se-coach-block-type__dot" aria-hidden />
            <span className="wolf-se-coach-block-type__label wolf-se-coach-block-type__label--full">
              {exerciseBlockKindLabel(value, isEs)}
            </span>
            <span className="wolf-se-coach-block-type__label wolf-se-coach-block-type__label--short" aria-hidden>
              {exerciseBlockKindLabelShort(value, isEs)}
            </span>
          </button>
        );
      })}
    </div>
  );
};
