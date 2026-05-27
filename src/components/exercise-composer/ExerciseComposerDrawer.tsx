import React from 'react';
import type { ExerciseDefinition, ExerciseDefinitionInput } from '../../models/exercise';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useWolfAlert } from '../../context/WolfAlertContext';
import MovementComposer from '../exercise-intelligence/MovementComposer';

export type ComposerDrawerMode = 'create' | 'edit' | 'fork';

interface ExerciseComposerDrawerProps {
  open: boolean;
  language: 'ES' | 'EN';
  mode: ComposerDrawerMode;
  initial?: ExerciseDefinition | null;
  forkParentId?: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const ExerciseComposerDrawer: React.FC<ExerciseComposerDrawerProps> = ({
  open,
  language,
  mode,
  initial,
  forkParentId,
  onClose,
  onSaved,
}) => {
  const isEs = language === 'ES';
  const { pushAlert } = useWolfAlert();
  const { createExerciseDefinition, updateExerciseDefinition, forkExerciseDefinition } = useWolfAssign();

  return (
    <MovementComposer
      open={open}
      isEs={isEs}
      mode={mode}
      initial={initial}
      forkParentId={forkParentId}
      onClose={onClose}
      onSave={async (input: ExerciseDefinitionInput, ctx) => {
        let err: string | null = null;
        if (ctx.mode === 'fork' && ctx.forkParentId) {
          err = await forkExerciseDefinition(ctx.forkParentId, input);
        } else if (ctx.editingId) {
          err = await updateExerciseDefinition(ctx.editingId, input);
        } else {
          err = await createExerciseDefinition(input);
        }
        if (err) {
          pushAlert({ tone: 'error', message: err });
          return err;
        }
        pushAlert({ tone: 'success', message: isEs ? 'Movimiento guardado' : 'Movement saved' });
        onSaved?.();
        onClose();
        return null;
      }}
    />
  );
};

export default ExerciseComposerDrawer;
