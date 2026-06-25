import React from 'react';
import type { Athlete, Exercise, Session } from '../../models/training';
import type { SessionPickerOption } from '../../services/exercise';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { SessionSheetMobileCards } from './SessionSheetMobileCards';
import { SessionSheetSpreadsheet } from './SessionSheetSpreadsheet';
import type { AppBreadcrumbItem } from '../wl-shared/AppBreadcrumb';
import type { SessionExerciseBlock } from '../../models/training';

export interface SessionDayEditorProps {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  pickerOptions: SessionPickerOption[];
  isEs: boolean;
  breadcrumbItems?: AppBreadcrumbItem[];
  showSummary?: boolean;
  canAddExercise?: boolean;
  dense?: boolean;
  sortable?: boolean;
  focusBlockIndex?: number | null;
  onFocusBlockHandled?: () => void;
  onApply: (fn: () => Session) => void;
  onSelectBlock?: (index: number) => void;
  onAddExercise: () => void;
  onReorderBlocks?: (blocks: SessionExerciseBlock[]) => void;
  onRemoveBlock?: (index: number) => void;
  onMoveBlockUp?: (index: number) => void;
  onMoveBlockDown?: (index: number) => void;
}

export const SessionDayEditor: React.FC<SessionDayEditorProps> = ({
  session,
  athlete,
  exercises,
  pickerOptions,
  isEs,
  breadcrumbItems,
  showSummary = true,
  canAddExercise,
  dense = false,
  sortable,
  focusBlockIndex,
  onFocusBlockHandled,
  onApply,
  onAddExercise,
  onReorderBlocks,
  onRemoveBlock,
}) => {
  const isMobile = useMediaQuery('(max-width: 1024px)');

  if (isMobile) {
    return (
      <SessionSheetMobileCards
        session={session}
        athlete={athlete}
        exercises={exercises}
        pickerOptions={pickerOptions}
        isEs={isEs}
        breadcrumbItems={breadcrumbItems}
        showSummary={showSummary}
        canAddExercise={canAddExercise}
        sortable={sortable}
        focusBlockIndex={focusBlockIndex}
        onFocusBlockHandled={onFocusBlockHandled}
        onApply={onApply}
        onAddExercise={onAddExercise}
        onReorderBlocks={onReorderBlocks}
        onRemoveBlock={onRemoveBlock}
      />
    );
  }

  return (
    <SessionSheetSpreadsheet
      session={session}
      athlete={athlete}
      exercises={exercises}
      pickerOptions={pickerOptions}
      isEs={isEs}
      breadcrumbItems={breadcrumbItems}
      showSummary={showSummary}
      canAddExercise={canAddExercise}
      sortable={sortable}
      focusBlockIndex={focusBlockIndex}
      onFocusBlockHandled={onFocusBlockHandled}
      onApply={onApply}
      onAddExercise={onAddExercise}
      onReorderBlocks={onReorderBlocks}
      compactHeaders={dense}
    />
  );
};
