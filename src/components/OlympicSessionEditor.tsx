import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, Session } from '../models/training';
import type { SessionCatalogProps } from './session-editor/types';
import { addExerciseBlock, moveExerciseBlock, removeExerciseBlock, setExerciseBlockOrder, WL_SESSION_LIMITS } from '../services/sessionMutations';
import { normalizeBlockType } from '../services/trainingEngine';
import { BlockKindBadges, ExerciseBlockCard } from './session-editor/ExerciseBlockCard';
import { ExerciseOverviewScreen } from './session-editor/ExerciseOverviewScreen';
import { SessionDayEditor } from './session-editor/SessionDayEditor';
import { SessionDayHero } from './session-editor/SessionDayHero';
import { blockDisplayName } from './session-editor/sessionSheetUtils';
import { AppBreadcrumb } from './wl-shared/AppBreadcrumb';
import { ExercisePickerSheet } from './mobile-wl/sheets/ExercisePickerSheet';
import { StickySessionActions } from './mobile-wl/navigation/StickySessionActions';
import { useMediaQuery } from '../hooks/useMediaQuery';
import './session-editor/set-rows.css';
import './session-editor/session-sheet-spreadsheet.css';
import './session-editor/session-editor-polish.css';
import './session-editor/exercise-overview-screen.css';
import './session-editor/exercise-sets-coach-screen.css';
import './session-editor/session-coach-day-cards.css';
import './mobile-wl/mobile-wl.css';
import './wl-shared/app-breadcrumb.css';
import '../styles/interactive.css';

/** Segundo movimiento por defecto al activar complejo (p. ej. Clean → Jerk). */
const DEFAULT_COMPLEX_SECOND_ID = 'ex-022';
/** Movimiento extra al añadir segmento (p. ej. sentadilla). */
const DEFAULT_EXTRA_SEGMENT_ID = 'ex-028';

type SessionEditorView = 'sheet' | 'exerciseOverview' | 'exerciseSets';

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
  const [focusBlockIndex, setFocusBlockIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [overviewExpandSetIndex, setOverviewExpandSetIndex] = useState<number | null>(null);

  const isMobile = useMediaQuery('(max-width: 1024px)');
  const useMobileCoachFlow = embedded && isMobile;

  const setEditorView = useCallback(
    (next: SessionEditorView) => {
      setView(next);
      onViewChange?.(next);
    },
    [onViewChange],
  );

  useEffect(() => {
    if (initialBlockIndex == null || initialBlockIndex < 0) return;
    if (initialBlockIndex < session.exercises.length) {
      setEditingBlockIndex(initialBlockIndex);
      setEditorView(useMobileCoachFlow ? 'exerciseOverview' : 'exerciseSets');
    }
  }, [initialBlockIndex, session.exercises.length, setEditorView, useMobileCoachFlow]);

  useEffect(() => {
    if (editingBlockIndex == null) return;
    if (editingBlockIndex >= session.exercises.length) {
      setEditingBlockIndex(null);
      setEditorView('sheet');
    }
  }, [editingBlockIndex, session.exercises.length, setEditorView]);

  useEffect(() => {
    onViewChange?.(view);
  }, [view, onViewChange]);

  useEffect(() => {
    return () => {
      onViewChange?.('sheet');
    };
  }, [onViewChange]);

  const canAddExercise = session.exercises.length < WL_SESSION_LIMITS.MAX_BLOCKS_PER_SESSION;

  const apply = useCallback(
    (fn: () => Session) => {
      onChange(fn());
    },
    [onChange],
  );

  const openExerciseOverview = useCallback(
    (index: number, expandSetIndex: number | null = null) => {
      if (index < 0 || index >= session.exercises.length) return;
      setEditingBlockIndex(index);
      setOverviewExpandSetIndex(expandSetIndex);
      setEditorView(useMobileCoachFlow ? 'exerciseOverview' : 'exerciseSets');
    },
    [session.exercises.length, setEditorView, useMobileCoachFlow],
  );

  const handleAddExercise = useCallback(() => {
    if (useMobileCoachFlow) {
      setPickerOpen(true);
      return;
    }
    apply(() => {
      const next = addExerciseBlock(session, '', athlete, exercises);
      setFocusBlockIndex(next.exercises.length - 1);
      return next;
    });
  }, [apply, session, exercises, athlete, useMobileCoachFlow]);

  const handlePickerSelect = useCallback(
    (exerciseId: string) => {
      setPickerOpen(false);
      apply(() => {
        const next = addExerciseBlock(session, exerciseId, athlete, exercises);
        const newIndex = next.exercises.length - 1;
        setEditingBlockIndex(newIndex);
        setOverviewExpandSetIndex(0);
        setEditorView('exerciseOverview');
        return next;
      });
    },
    [apply, session, athlete, exercises, setEditorView],
  );

  const handleReorderBlocks = useCallback(
    (orderedBlocks: Session['exercises']) => {
      apply(() => setExerciseBlockOrder(session, orderedBlocks, athlete, exercises));
    },
    [apply, session, exercises, athlete],
  );

  const handleRemoveBlock = useCallback(
    (index: number) => {
      apply(() => removeExerciseBlock(session, index, athlete, exercises));
      if (editingBlockIndex === index) {
        setEditingBlockIndex(null);
        setEditorView('sheet');
      }
    },
    [apply, session, exercises, athlete, editingBlockIndex, setEditorView],
  );

  const handleMoveBlockUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      apply(() => moveExerciseBlock(session, index, index - 1, athlete, exercises));
    },
    [apply, session, exercises, athlete],
  );

  const handleMoveBlockDown = useCallback(
    (index: number) => {
      if (index >= session.exercises.length - 1) return;
      apply(() => moveExerciseBlock(session, index, index + 1, athlete, exercises));
    },
    [apply, session, exercises, athlete],
  );

  const backToSheet = useCallback(() => {
    setEditorView('sheet');
    setEditingBlockIndex(null);
    setOverviewExpandSetIndex(null);
  }, [setEditorView]);

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
      onClick: view !== 'sheet' ? backToSheet : undefined,
    },
    ...(view !== 'sheet' && exerciseCrumb ? [{ label: exerciseCrumb }] : []),
  ];

  const showStickyAdd = view === 'sheet' && canAddExercise;

  return (
    <div
      className={`wolf-session-editor wolf-session-editor--flow${embedded ? ' wolf-session-editor--embedded' : ''}${isMobile ? ' wolf-session-editor--mobile-sticky' : ''}${useMobileCoachFlow ? ' wolf-session-editor--mobile-coach' : ''}`}
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
              <SessionDayEditor
                session={session}
                athlete={athlete}
                exercises={exercises}
                pickerOptions={catalog.pickerOptions}
                isEs={isEs}
                breadcrumbItems={embedded ? undefined : sheetBreadcrumbItems}
                showSummary={!embedded}
                canAddExercise={canAddExercise}
                dense={embedded}
                embedded={embedded}
                dayNumber={dayNumber}
                dayLabel={dayLabel}
                sortable
                focusBlockIndex={focusBlockIndex}
                onFocusBlockHandled={() => setFocusBlockIndex(null)}
                onApply={apply}
                onSelectBlock={openExerciseOverview}
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
      ) : view === 'exerciseOverview' && useMobileCoachFlow && editingBlockIndex != null && editingBlock ? (
        <ExerciseOverviewScreen
          block={editingBlock}
          blockIndex={editingBlockIndex}
          session={session}
          athlete={athlete}
          exercises={exercises}
          isEs={isEs}
          totalBlocks={session.exercises.length}
          onApply={apply}
          onBack={backToSheet}
          initialExpandedSetIndex={overviewExpandSetIndex}
          onRemoveBlock={() => handleRemoveBlock(editingBlockIndex)}
        />
      ) : view === 'exerciseSets' && !useMobileCoachFlow && editingBlockIndex != null && editingBlock ? (
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
            mode={useMobileCoachFlow ? 'setsOnly' : 'full'}
          />
        </div>
      ) : null}

      {useMobileCoachFlow ? (
        <ExercisePickerSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          options={catalog.pickerOptions}
          value=""
          isEs={isEs}
          title={isEs ? 'Agregar ejercicio' : 'Add exercise'}
          recentIds={catalog.recentIds}
          keepOpenOnSelect={false}
          onChange={handlePickerSelect}
        />
      ) : null}

      {(!useMobileCoachFlow || view === 'sheet') ? (
      <StickySessionActions
        session={session}
        isEs={isEs}
        draftSavedAt={draftSavedAt}
        syncPending={syncPending}
        canAddExercise={showStickyAdd}
        onAddExercise={handleAddExercise}
        addLabel={useMobileCoachFlow ? (isEs ? 'Agregar ejercicio' : 'Add exercise') : undefined}
        hideMetrics={useMobileCoachFlow}
      />
      ) : null}
    </div>
  );
};

export default OlympicSessionEditor;
