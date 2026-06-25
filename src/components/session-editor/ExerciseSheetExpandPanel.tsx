import React from 'react';
import type { Athlete, Exercise, Session } from '../../models/training';
import type { SessionPickerOption } from '../../services/exercise';
import { normalizeBlockType } from '../../services/trainingEngine';
import {
  addComplexSegment,
  addSetToBlock,
  duplicateSetAt,
  removeComplexSegment,
  removeSetFromBlock,
  reorderSetsInBlock,
  setSegmentExercise,
  updateSegmentRepAt,
  updateSetSchemeField,
} from '../../services/sessionMutations';
import { SpreadsheetSetBlocksPanel } from './SpreadsheetSetBlocksPanel';
import { SpreadsheetComplexUnifiedPanel } from './SpreadsheetComplexUnifiedPanel';

export interface ExerciseSheetExpandPanelProps {
  block: Session['exercises'][number];
  blockIndex: number;
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  pickerOptions: SessionPickerOption[];
  isEs: boolean;
  onApply: (fn: () => Session) => void;
}

export const ExerciseSheetExpandPanel: React.FC<ExerciseSheetExpandPanelProps> = ({
  block,
  blockIndex,
  session,
  athlete,
  exercises,
  pickerOptions,
  isEs,
  onApply,
}) => {
  const isComplex =
    normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);

  if (isComplex) {
    return (
      <SpreadsheetComplexUnifiedPanel
        block={block}
        blockIndex={blockIndex}
        session={session}
        athlete={athlete}
        exercises={exercises}
        pickerOptions={pickerOptions}
        isEs={isEs}
        onSegmentExerciseChange={(segIndex, exerciseId) =>
          onApply(() =>
            setSegmentExercise(session, blockIndex, segIndex, exerciseId, athlete, exercises),
          )
        }
        onAddMovement={() =>
          onApply(() =>
            addComplexSegment(session, blockIndex, exercises[0]?.id ?? '', athlete, exercises),
          )
        }
        onRemoveMovement={(segIndex) =>
          onApply(() => removeComplexSegment(session, blockIndex, segIndex, athlete, exercises))
        }
        onPctChange={(si, v) =>
          onApply(() =>
            updateSetSchemeField(session, blockIndex, si, 'percentage', v, athlete, exercises),
          )
        }
        onSetsChange={(si, v) =>
          onApply(() =>
            updateSetSchemeField(session, blockIndex, si, 'sets', v, athlete, exercises),
          )
        }
        onRestChange={(si, v) =>
          onApply(() =>
            updateSetSchemeField(session, blockIndex, si, 'restSec', v, athlete, exercises),
          )
        }
        onSegmentRepChange={(si, segIdx, val) =>
          onApply(() =>
            updateSegmentRepAt(session, blockIndex, si, segIdx, val, athlete, exercises),
          )
        }
        onAddSet={() => onApply(() => addSetToBlock(session, blockIndex, athlete, exercises))}
        onDuplicateSet={(si) =>
          onApply(() => duplicateSetAt(session, blockIndex, si, athlete, exercises))
        }
        onRemoveSet={(si) =>
          onApply(() => removeSetFromBlock(session, blockIndex, si, athlete, exercises))
        }
        onReorderSets={(from, to) =>
          onApply(() => reorderSetsInBlock(session, blockIndex, from, to, athlete, exercises))
        }
      />
    );
  }

  return (
    <SpreadsheetSetBlocksPanel
      block={block}
      blockIndex={blockIndex}
      session={session}
      athlete={athlete}
      exercises={exercises}
      isEs={isEs}
      onApply={onApply}
      onPctChange={(si, v) =>
        onApply(() =>
          updateSetSchemeField(session, blockIndex, si, 'percentage', v, athlete, exercises),
        )
      }
      onRepsChange={(si, v) =>
        onApply(() =>
          updateSetSchemeField(session, blockIndex, si, 'reps', v, athlete, exercises),
        )
      }
      onSetsChange={(si, v) =>
        onApply(() =>
          updateSetSchemeField(session, blockIndex, si, 'sets', v, athlete, exercises),
        )
      }
      onRestChange={(si, v) =>
        onApply(() =>
          updateSetSchemeField(session, blockIndex, si, 'restSec', v, athlete, exercises),
        )
      }
      onSegmentRepChange={(si, segIdx, val) =>
        onApply(() =>
          updateSegmentRepAt(session, blockIndex, si, segIdx, val, athlete, exercises),
        )
      }
      onAddSet={() => onApply(() => addSetToBlock(session, blockIndex, athlete, exercises))}
      onDuplicateSet={(si) =>
        onApply(() => duplicateSetAt(session, blockIndex, si, athlete, exercises))
      }
      onRemoveSet={(si) =>
        onApply(() => removeSetFromBlock(session, blockIndex, si, athlete, exercises))
      }
      onReorderSets={(from, to) =>
        onApply(() => reorderSetsInBlock(session, blockIndex, from, to, athlete, exercises))
      }
    />
  );
};
