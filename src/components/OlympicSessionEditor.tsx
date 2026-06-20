import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, Session } from '../models/training';
import type { SessionCatalogProps } from './session-editor/types';
import { addExerciseBlock, moveExerciseBlock, removeExerciseBlock, setExerciseBlockOrder, WL_SESSION_LIMITS } from '../services/sessionMutations';
import { normalizeBlockType } from '../services/trainingEngine';
import { BlockKindBadges, ExerciseBlockCard } from './session-editor/ExerciseBlockCard';
import { SessionDayHero } from './session-editor/SessionDayHero';
import { SessionSheetOverview } from './session-editor/SessionSheetOverview';
import { blockDisplayName } from './session-editor/sessionSheetUtils';
import { AppBreadcrumb } from './wl-shared/AppBreadcrumb';
import { StickySessionActions } from './mobile-wl/navigation/StickySessionActions';
import { useMediaQuery } from '../hooks/useMediaQuery';
import './session-editor/set-rows.css';
import './session-editor/session-editor-polish.css';
import './mobile-wl/mobile-wl.css';
import './wl-shared/app-breadcrumb.css';
import '../styles/interactive.css';

/** Segundo movimiento por defecto al activar complejo (p. ej. Clean → Jerk). */
const DEFAULT_COMPLEX_SECOND_ID = 'ex-022';
/** Movimiento extra al añadir segmento (p. ej. sentadilla). */
const DEFAULT_EXTRA_SEGMENT_ID = 'ex-028';

type SessionEditorView = 'sheet' | 'exercise';

export type { SessionEditorView };

interface OlympicSessionEditorProps {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  catalog: SessionCatalogProps;
  isEs: boolean;
  onChange: (s: Session) => void;
  draftSavedAt?: string | null;
  syncPending?: boolean;
  dayLabel?: string;
  weekNumber?: number;
  dayNumber?: number;
  embedded?: boolean;
  /** Open directly on an exercise block (matrix cell tap). */
  initialBlockIndex?: number | null;
  /** Matrix view already lists exercises — hide duplicate sheet rows. */
  hideSheetList?: boolean;
  /** Notifies parent when switching between day sheet and exercise editor. */
  onViewChange?: (view: SessionEditorView) => void;
}

const OlympicSessionEditor: React.FC<OlympicSessionEditorProps> = ({
  session,
  athlete,
  exercises,
  catalog,
  isEs,
  onChange,
  draftSavedAt = null,
  syncPending = false,
  dayLabel,
  weekNumber,
  dayNumber,
  embedded = false,
  initialBlockIndex = null,
  hideSheetList = false,
  onViewChange,
}) => {
  const [view, setView] = useState<SessionEditorView>('sheet');
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialBlockIndex == null || initialBlockIndex < 0) return;
    if (initialBlockIndex < session.exercises.length) {
      setEditingBlockIndex(initialBlockIndex);
      setView('exercise');
    }
  }, [initialBlockIndex, session.exercises.length]);

  useEffect(() => {
    if (editingBlockIndex == null) return;
    if (editingBlockIndex >= session.exercises.length) {
      setEditingBlockIndex(null);
      setView('sheet');
    }
  }, [editingBlockIndex, session.exercises.length]);

  useEffect(() => {
    onViewChange?.(view);
  }, [view, onViewChange]);

  useEffect(() => {
    return () => {
      onViewChange?.('sheet');
    };
  }, [onViewChange]);

  const isMobile = useMediaQuery('(max-width: 1024px)');
  const canAddExercise = session.exercises.length < WL_SESSION_LIMITS.MAX_BLOCKS_PER_SESSION;

  const apply = (fn: () => Session) => {
    onChange(fn());
  };

  const handleAddExercise = useCallback(() => {
    apply(() => addExerciseBlock(session, exercises[0]?.id ?? 'ex-001', athlete, exercises));
  }, [session, exercises, athlete]);

  const handleReorderBlocks = useCallback(
    (orderedBlocks: Session['exercises']) => {
      apply(() => setExerciseBlockOrder(session, orderedBlocks, athlete, exercises));
    },
    [session, exercises, athlete],
  );

  const handleRemoveBlock = useCallback(
    (index: number) => {
      apply(() => removeExerciseBlock(session, index, athlete, exercises));
    },
    [session, exercises, athlete],
  );

  const handleMoveBlockUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      apply(() => moveExerciseBlock(session, index, index - 1, athlete, exercises));
    },
    [session, exercises, athlete],
  );

  const handleMoveBlockDown = useCallback(
    (index: number) => {
      if (index >= session.exercises.length - 1) return;
      apply(() => moveExerciseBlock(session, index, index + 1, athlete, exercises));
    },
    [session, exercises, athlete],
  );

  const openExercise = useCallback(
    (index: number) => {
      if (index < 0 || index >= session.exercises.length) return;
      setEditingBlockIndex(index);
      setView('exercise');
      onViewChange?.('exercise');
    },
    [onViewChange, session.exercises.length],
  );

  const backToSheet = useCallback(() => {
    setView('sheet');
    setEditingBlockIndex(null);
    onViewChange?.('sheet');
  }, [onViewChange]);

  const weekCrumb =
    weekNumber != null ? (isEs ? `Semana ${weekNumber}` : `Week ${weekNumber}`) : isEs ? 'Semana' : 'Week';
  const dayCrumb =
    dayLabel?.trim() ||
    (dayNumber != null ? (isEs ? `Día ${dayNumber}` : `Day ${dayNumber}`) : isEs ? 'Día' : 'Day');
  const editingBlock =
    editingBlockIndex != null ? session.exercises[editingBlockIndex] : undefined;
  const exerciseCrumb = editingBlock ? blockDisplayName(editingBlock, exercises) : null;
  const editingIsComplex = editingBlock
    ? normalizeBlockType(editingBlock) === 'complex' && Boolean(editingBlock.segments?.length)
    : false;
  const editingIsWarmup = editingBlock?.countsTowardTechnicalNBL === false;
  const editingBlockKind = editingIsWarmup ? 'warmup' : editingIsComplex ? 'complex' : 'single';

  const sheetBreadcrumbItems = [
    { label: weekCrumb },
    { label: dayCrumb },
  ];

  const breadcrumbItems = [
    { label: weekCrumb },
    {
      label: dayCrumb,
      onClick: view === 'exercise' ? backToSheet : undefined,
    },
    ...(view === 'exercise' && exerciseCrumb ? [{ label: exerciseCrumb }] : []),
  ];

  return (
    <div
      className={`wolf-session-editor wolf-session-editor--flow${embedded ? ' wolf-session-editor--embedded' : ''}${isMobile ? ' wolf-session-editor--mobile-sticky' : ''}`}
    >
      {view === 'sheet' ? (
        <>
          {hideSheetList ? (
            <div className="wolf-se-sheet wolf-se-sheet--compact" aria-label={isEs ? 'Hoja del día' : 'Day sheet'}>
              <div className="wolf-se-sheet-head wolf-se-sheet-head--compact">
                <div className="wolf-se-sheet-head-crumb">
                  <AppBreadcrumb isEs={isEs} items={sheetBreadcrumbItems} />
                </div>
                <span className="wolf-se-sheet-hint">
                  {session.exercises.length
                    ? isEs
                      ? `${session.exercises.length} ejercicio${session.exercises.length === 1 ? '' : 's'} · añade o toca en la tabla`
                      : `${session.exercises.length} exercise${session.exercises.length === 1 ? '' : 's'} · add or tap in the grid`
                    : isEs
                      ? 'Añade el primer ejercicio del día'
                      : 'Add the first exercise for this day'}
                </span>
              </div>
              {canAddExercise ? (
                <div className="wolf-se-sheet-footer">
                  <button type="button" className="wolf-se-sets-premium__add-row wolf-se-sheet-add" onClick={handleAddExercise}>
                    <Plus size={14} aria-hidden />
                    {isEs ? 'Añadir ejercicio' : 'Add exercise'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <SessionSheetOverview
                session={session}
                exercises={exercises}
                isEs={isEs}
                breadcrumbItems={sheetBreadcrumbItems}
                canAddExercise={canAddExercise}
                dense={embedded}
                hideHead={false}
                sortable
                onSelectBlock={openExercise}
                onAddExercise={handleAddExercise}
                onReorderBlocks={handleReorderBlocks}
                onRemoveBlock={handleRemoveBlock}
                onMoveBlockUp={handleMoveBlockUp}
                onMoveBlockDown={handleMoveBlockDown}
              />
              {embedded ? null : <SessionDayHero session={session} isEs={isEs} />}
            </>
          )}
        </>
      ) : editingBlockIndex != null && editingBlock ? (
        <div className="wolf-se-exercise-view">
          <div className={`wolf-se-exercise-head${embedded ? ' wolf-se-exercise-head--embedded' : ''}`}>
            <button
              type="button"
              className="wolf-se-back-to-sheet"
              onClick={backToSheet}
              aria-label={isEs ? 'Volver a hoja del día' : 'Back to day sheet'}
            >
              <ArrowLeft size={16} aria-hidden />
              {embedded && isMobile ? null : isEs ? 'Hoja del día' : 'Day sheet'}
            </button>
            <nav className="wolf-se-flow-crumb" aria-label={isEs ? 'Ruta del día' : 'Day path'}>
              <AppBreadcrumb
                isEs={isEs}
                items={breadcrumbItems}
                trailing={
                  embedded && editingBlock && editingBlockIndex != null ? (
                    <div className="wolf-se-exercise-crumb-actions">
                      <BlockKindBadges
                        blockKind={editingBlockKind}
                        isComplex={editingIsComplex}
                        isWarmup={editingIsWarmup}
                        isEs={isEs}
                      />
                      <button
                        type="button"
                        className="wolf-se-toolbar-btn wolf-se-toolbar-btn--danger wolf-se-exercise-crumb-remove"
                        title={isEs ? 'Quitar bloque' : 'Remove block'}
                        aria-label={isEs ? 'Quitar bloque' : 'Remove block'}
                        disabled={session.exercises.length <= 1}
                        onClick={() => handleRemoveBlock(editingBlockIndex)}
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  ) : undefined
                }
              />
            </nav>
          </div>
          <ExerciseBlockCard
            block={editingBlock}
            blockIndex={editingBlockIndex}
            session={session}
            athlete={athlete}
            exercises={exercises}
            isEs={isEs}
            expanded
            totalBlocks={session.exercises.length}
            onToggle={() => undefined}
            onApply={apply}
            defaultComplexSecondId={DEFAULT_COMPLEX_SECOND_ID}
            defaultExtraSegmentId={DEFAULT_EXTRA_SEGMENT_ID}
            catalog={catalog}
            layout={embedded ? 'embedded' : 'default'}
          />
        </div>
      ) : null}

      <StickySessionActions
        session={session}
        isEs={isEs}
        draftSavedAt={draftSavedAt}
        syncPending={syncPending}
        canAddExercise={canAddExercise && view === 'sheet'}
        onAddExercise={handleAddExercise}
      />
    </div>
  );
};

export default OlympicSessionEditor;
