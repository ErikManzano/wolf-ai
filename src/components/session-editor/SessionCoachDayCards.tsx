import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Dumbbell, GitMerge, GripVertical, MoreVertical } from 'lucide-react';
import { Reorder, useDragControls, motion, useReducedMotion } from 'framer-motion';
import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';
import { WL_SESSION_LIMITS, getExerciseBlockKind, setExerciseBlockKind } from '../../services/sessionMutations';
import { blockTonnage, estimateBlockRpe } from './blockMetrics';
import { blockDisplayName, blockHasExercise } from './sessionSheetUtils';
import { buildSchemeCardSummaries } from '../../utils/schemeCardRx';
import { coachListItemMotion, coachListStagger } from './coachMobileMotion';
import { ExerciseCoachActionsSheet } from './ExerciseCoachActionsSheet';
import { ExerciseDeleteConfirmModal } from './ExerciseDeleteConfirmModal';
import { CoachDayAddExerciseButton } from './CoachDayAddExerciseButton';
import { CoachBlockTypePicker } from './CoachBlockTypePicker';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { editorActionToast } from './editorActionToasts';
import './session-coach-day-cards.css';
import './coach-block-type-picker.css';
import './exercise-coach-actions-sheet.css';
import './exercise-delete-confirm-modal.css';

const DEFAULT_COMPLEX_SECOND_ID = 'ex-022';

export interface SessionCoachDayCardsProps {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  sortable?: boolean;
  onSelectBlock?: (index: number) => void;
  onReorderBlocks?: (blocks: SessionExerciseBlock[]) => void;
  canAddExercise?: boolean;
  onAddExercise?: () => void;
  onRemoveBlock?: (index: number) => void;
  onDuplicateBlock?: (index: number) => void;
  onMoveBlockUp?: (index: number) => void;
  onMoveBlockDown?: (index: number) => void;
  onChangeExercise?: (index: number) => void;
  onApply?: (fn: (session: Session) => Session) => void;
}

type SortableRow = { id: string; block: SessionExerciseBlock };

let nextRowId = 0;

function makeRowId(): string {
  nextRowId += 1;
  return `coach-day-card-${nextRowId}`;
}

function rowsFromBlocks(blocks: SessionExerciseBlock[], prev?: SortableRow[]): SortableRow[] {
  return blocks.map((block, i) => ({
    id: prev?.[i]?.id ?? makeRowId(),
    block,
  }));
}

const ACCENT_KEYS = ['orange', 'blue', 'amber', 'violet'] as const;

interface CoachDayCardProps {
  block: SessionExerciseBlock;
  index: number;
  exercises: Exercise[];
  athlete: Athlete;
  isEs: boolean;
  onSelect?: () => void;
  onOpenMenu?: () => void;
  onApply?: (fn: (session: Session) => Session) => void;
  sortable?: boolean;
  onDragStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
}

function CoachDayCard({
  block,
  index,
  exercises,
  athlete,
  isEs,
  onSelect,
  onOpenMenu,
  onApply,
  sortable,
  onDragStart,
}: CoachDayCardProps) {
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const blockKind = getExerciseBlockKind(block);
  const hasExercise = blockHasExercise(block);
  const name = blockDisplayName(block, exercises, isEs);
  const tonnage = blockTonnage(block, athlete, exercises);
  const accent = ACCENT_KEYS[index % ACCENT_KEYS.length]!;
  const volumeLabel = tonnage > 0 ? `${tonnage.toLocaleString()} kg` : '—';
  const estimatedRpe = estimateBlockRpe(block);
  const schemeSummaries = buildSchemeCardSummaries(block, athlete, exercises);

  return (
    <article
      className={`wolf-se-coach-day-card wolf-se-coach-day-card--${accent} wolf-se-coach-day-card--mockup`}
      data-accent={accent}
    >
      {sortable && onDragStart ? (
        <div
          role="button"
          tabIndex={0}
          className="wolf-se-coach-day-card__drag"
          aria-label={isEs ? 'Arrastrar para reordenar' : 'Drag to reorder'}
          onPointerDown={onDragStart}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} aria-hidden />
        </div>
      ) : null}

      <div className="wolf-se-coach-day-card__shell">
        <div className="wolf-se-coach-day-card__header">
          <span
            className={`wolf-se-coach-day-card__icon${isComplex ? ' wolf-se-coach-day-card__icon--complex' : ''}`}
            aria-hidden
          >
            {isComplex ? <GitMerge size={20} strokeWidth={2} /> : <Dumbbell size={20} strokeWidth={2} />}
          </span>
          <h3
            className={`wolf-se-coach-day-card__name${hasExercise ? '' : ' wolf-se-coach-day-card__name--missing'}`}
          >
            {name}
          </h3>
          {onOpenMenu ? (
            <button
              type="button"
              className="wolf-se-coach-day-card__menu-btn"
              aria-label={isEs ? 'Acciones del ejercicio' : 'Exercise actions'}
              onClick={(e) => {
                e.stopPropagation();
                onOpenMenu();
              }}
            >
              <MoreVertical size={18} aria-hidden />
            </button>
          ) : null}
        </div>

        {onApply ? (
          <CoachBlockTypePicker
            kind={blockKind}
            isEs={isEs}
            className="wolf-se-coach-day-card__type-picker"
            onChange={(kind) => {
              onApply((current) =>
                setExerciseBlockKind(
                  current,
                  index,
                  kind,
                  athlete,
                  exercises,
                  DEFAULT_COMPLEX_SECOND_ID,
                ),
              );
              if (kind === 'complex') onSelect?.();
            }}
          />
        ) : null}

        {schemeSummaries.length > 0 ? (
          <div
            className="wolf-se-coach-day-card__rx-block"
            aria-label={isEs ? 'Prescripción' : 'Prescription'}
          >
            {schemeSummaries.map((scheme) => (
              <p
                key={scheme.key}
                className={`wolf-se-coach-day-card__rx wolf-se-coach-day-card__rx--${scheme.purpose}`}
              >
                <span
                  className={`wolf-se-coach-day-card__rx-dot wolf-se-coach-day-card__rx-dot--${scheme.purpose}`}
                  aria-hidden
                />
                {scheme.kgLabel ? (
                  <span
                    className={`wolf-se-coach-day-card__rx-kg${isComplex ? ' wolf-se-coach-day-card__rx-kg--complex' : ''}`}
                  >
                    {scheme.kgLabel}
                  </span>
                ) : null}
                {scheme.percentage > 0 ? (
                  <span className="wolf-se-coach-day-card__rx-meta">{scheme.percentage}%</span>
                ) : null}
                <span className="wolf-se-coach-day-card__rx-meta">{scheme.volumeLabel}</span>
              </p>
            ))}
          </div>
        ) : block.sets.length === 0 ? (
          <p className="wolf-se-coach-day-card__empty-sets">
            {isEs ? 'Sin bloques prescritos' : 'No prescribed blocks'}
          </p>
        ) : null}

        <button type="button" className="wolf-se-coach-day-card__footer" onClick={onSelect}>
          {estimatedRpe != null ? (
            <span className="wolf-se-coach-day-card__rpe">RPE {estimatedRpe}</span>
          ) : (
            <span className="wolf-se-coach-day-card__rpe wolf-se-coach-day-card__rpe--muted">RPE —</span>
          )}
          <span className="wolf-se-coach-day-card__footer-vol">
            {isEs ? 'Volumen' : 'Volume'}{' '}
            <strong className={tonnage > 0 ? 'wolf-se-coach-day-card__vol--on' : ''}>{volumeLabel}</strong>
            <ChevronRight className="wolf-se-coach-day-card__chev" size={18} strokeWidth={2} aria-hidden />
          </span>
        </button>
      </div>
    </article>
  );
}

interface SortableCoachDayCardProps extends CoachDayCardProps {
  row: SortableRow;
}

function SortableCoachDayCard({ row, index, ...rest }: SortableCoachDayCardProps) {
  const dragControls = useDragControls();
  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragControls.start(event);
    },
    [dragControls],
  );

  return (
    <Reorder.Item
      as="li"
      value={row}
      dragListener={false}
      dragControls={dragControls}
      className="wolf-se-coach-day-card-item"
      style={{ touchAction: 'manipulation' }}
      layout="position"
      transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.82 }}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.28)',
        zIndex: 30,
      }}
    >
      <CoachDayCard
        {...rest}
        block={row.block}
        index={index}
        sortable
        onDragStart={startDrag}
        onSelect={() => rest.onSelect?.()}
      />
    </Reorder.Item>
  );
}

export const SessionCoachDayCards: React.FC<SessionCoachDayCardsProps> = ({
  session,
  athlete,
  exercises,
  isEs,
  sortable = false,
  onSelectBlock,
  onReorderBlocks,
  canAddExercise = false,
  onAddExercise,
  onRemoveBlock,
  onDuplicateBlock,
  onMoveBlockUp,
  onMoveBlockDown,
  onChangeExercise,
  onApply,
}) => {
  const { pushAlert } = useWolfAlert();
  const canSort = sortable && Boolean(onReorderBlocks) && session.exercises.length > 1;
  const reduceMotion = useReducedMotion();
  const [rows, setRows] = useState<SortableRow[]>(() => rowsFromBlocks(session.exercises));
  const [actionsIndex, setActionsIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  useEffect(() => {
    setRows((prev) => {
      if (session.exercises.length !== prev.length) {
        return rowsFromBlocks(session.exercises, prev);
      }
      return prev.map((row, i) => ({
        id: row.id,
        block: session.exercises[i]!,
      }));
    });
  }, [session.exercises]);

  const handleReorder = useCallback(
    (nextRows: SortableRow[]) => {
      setRows(nextRows);
      onReorderBlocks?.(nextRows.map((row) => row.block));
    },
    [onReorderBlocks],
  );

  const actionsIsComplex =
    actionsIndex != null &&
    normalizeBlockType(session.exercises[actionsIndex]!) === 'complex' &&
    Boolean(session.exercises[actionsIndex]!.segments?.length);

  const cardProps = (index: number) => ({
    block: session.exercises[index]!,
    index,
    exercises,
    athlete,
    isEs,
    onApply,
    onSelect: () => onSelectBlock?.(index),
    onOpenMenu: onRemoveBlock || onDuplicateBlock || onMoveBlockUp || onMoveBlockDown ? () => setActionsIndex(index) : undefined,
  });

  return (
    <section className="wolf-se-coach-day" aria-label={isEs ? 'Ejercicios del día' : 'Day exercises'}>
      {session.exercises.length > 0 ? (
        canSort ? (
          <Reorder.Group
            as="ul"
            axis="y"
            values={rows}
            onReorder={handleReorder}
            className="wolf-se-coach-day__list wolf-se-coach-day__list--sortable"
          >
            {rows.map((row, i) => (
              <SortableCoachDayCard key={row.id} row={row} {...cardProps(i)} />
            ))}
          </Reorder.Group>
        ) : (
          <motion.ul
            className="wolf-se-coach-day__list"
            variants={coachListStagger}
            initial="hidden"
            animate="visible"
          >
            {session.exercises.map((block, i) => (
              <motion.li key={`coach-day-${block.exerciseId}-${i}`} variants={coachListItemMotion(reduceMotion)}>
                <CoachDayCard {...cardProps(i)} />
              </motion.li>
            ))}
          </motion.ul>
        )
      ) : (
        <div className="wolf-se-coach-day__empty">
          <span className="wolf-se-coach-day__empty-icon" aria-hidden>
            <Dumbbell size={32} strokeWidth={1.75} />
          </span>
          <p>{isEs ? 'Aún no hay ejercicios en este día' : 'No exercises in this day yet'}</p>
        </div>
      )}

      {onAddExercise ? (
        <CoachDayAddExerciseButton
          isEs={isEs}
          disabled={!canAddExercise}
          onClick={onAddExercise}
        />
      ) : null}

      <ExerciseCoachActionsSheet
        open={actionsIndex != null}
        onClose={() => setActionsIndex(null)}
        isEs={isEs}
        canDelete={session.exercises.length > 1 && Boolean(onRemoveBlock)}
        canDuplicate={session.exercises.length < WL_SESSION_LIMITS.MAX_BLOCKS_PER_SESSION}
        canMoveUp={actionsIndex != null && actionsIndex > 0}
        canMoveDown={actionsIndex != null && actionsIndex < session.exercises.length - 1}
        onEditExercise={
          onChangeExercise && actionsIndex != null && !actionsIsComplex
            ? () => {
                setActionsIndex(null);
                onChangeExercise(actionsIndex);
              }
            : undefined
        }
        onDuplicateExercise={
          onDuplicateBlock && actionsIndex != null
            ? () => {
                setActionsIndex(null);
                onDuplicateBlock(actionsIndex);
                pushAlert(editorActionToast(isEs, 'duplicateExercise'));
              }
            : undefined
        }
        onMoveUp={
          onMoveBlockUp && actionsIndex != null
            ? () => {
                setActionsIndex(null);
                onMoveBlockUp(actionsIndex);
              }
            : undefined
        }
        onMoveDown={
          onMoveBlockDown && actionsIndex != null
            ? () => {
                setActionsIndex(null);
                onMoveBlockDown(actionsIndex);
              }
            : undefined
        }
        onDeleteExercise={
          onRemoveBlock && actionsIndex != null
            ? () => {
                setActionsIndex(null);
                setDeleteIndex(actionsIndex);
              }
            : undefined
        }
      />

      <ExerciseDeleteConfirmModal
        open={deleteIndex != null}
        exerciseName={deleteIndex != null ? blockDisplayName(session.exercises[deleteIndex]!, exercises, isEs) : ''}
        isEs={isEs}
        onCancel={() => setDeleteIndex(null)}
        onConfirm={() => {
          if (deleteIndex != null) {
            onRemoveBlock?.(deleteIndex);
            pushAlert(editorActionToast(isEs, 'removeExercise'));
          }
          setDeleteIndex(null);
        }}
      />
    </section>
  );
};
