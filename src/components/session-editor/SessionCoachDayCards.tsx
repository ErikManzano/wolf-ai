import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Dumbbell, GitMerge, GripVertical, MoreVertical, Plus } from 'lucide-react';
import { Reorder, useDragControls, motion, useReducedMotion } from 'framer-motion';
import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';
import { WL_SESSION_LIMITS } from '../../services/sessionMutations';
import { blockTonnage, estimateBlockRpe } from './blockMetrics';
import { blockUsesComplexReps, formatSetPrescriptionCoachMobile } from './schemeFormat';
import { blockDisplayName, blockHasExercise } from './sessionSheetUtils';
import { coachListItemMotion, coachListStagger } from './coachMobileMotion';
import { CoachDayHeaderStrip } from './CoachDayHeaderStrip';
import { ExerciseCoachActionsSheet } from './ExerciseCoachActionsSheet';
import { ExerciseDeleteConfirmModal } from './ExerciseDeleteConfirmModal';
import './session-coach-day-cards.css';
import './exercise-coach-actions-sheet.css';
import './exercise-delete-confirm-modal.css';

export interface SessionCoachDayCardsProps {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  dayNumber?: number;
  dayLabel?: string;
  sortable?: boolean;
  onSelectBlock?: (index: number) => void;
  onReorderBlocks?: (blocks: SessionExerciseBlock[]) => void;
  onDuplicateDay?: () => void;
  canDuplicateDay?: boolean;
  canAddExercise?: boolean;
  onAddExercise?: () => void;
  onRemoveBlock?: (index: number) => void;
  onDuplicateBlock?: (index: number) => void;
  onMoveBlockUp?: (index: number) => void;
  onMoveBlockDown?: (index: number) => void;
  onChangeExercise?: (index: number) => void;
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
  sortable,
  onDragStart,
}: CoachDayCardProps) {
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const hasExercise = blockHasExercise(block);
  const name = blockDisplayName(block, exercises, isEs);
  const tonnage = blockTonnage(block, athlete, exercises);
  const accent = ACCENT_KEYS[index % ACCENT_KEYS.length]!;
  const volumeLabel = tonnage > 0 ? `${tonnage.toLocaleString()} kg` : '—';
  const isComplexReps = blockUsesComplexReps(block);
  const estimatedRpe = estimateBlockRpe(block);

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

        {block.sets.length > 0 ? (
          <ul className="wolf-se-coach-day-card__sets" aria-label={isEs ? 'Bloques prescritos' : 'Prescribed blocks'}>
            {block.sets.map((scheme, si) => (
              <li key={si}>
                <code className="wolf-se-coach-day-card__set-row">
                  {formatSetPrescriptionCoachMobile(scheme, isComplexReps)}
                </code>
              </li>
            ))}
          </ul>
        ) : (
          <p className="wolf-se-coach-day-card__empty-sets">
            {isEs ? 'Sin bloques prescritos' : 'No prescribed blocks'}
          </p>
        )}

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
  dayNumber,
  dayLabel,
  sortable = false,
  onSelectBlock,
  onReorderBlocks,
  onDuplicateDay,
  canDuplicateDay,
  canAddExercise = false,
  onAddExercise,
  onRemoveBlock,
  onDuplicateBlock,
  onMoveBlockUp,
  onMoveBlockDown,
  onChangeExercise,
}) => {
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
    onSelect: () => onSelectBlock?.(index),
    onOpenMenu: onRemoveBlock || onDuplicateBlock || onMoveBlockUp || onMoveBlockDown ? () => setActionsIndex(index) : undefined,
  });

  return (
    <section className="wolf-se-coach-day" aria-label={isEs ? 'Ejercicios del día' : 'Day exercises'}>
      <CoachDayHeaderStrip
        session={session}
        athlete={athlete}
        exercises={exercises}
        isEs={isEs}
        dayNumber={dayNumber}
        dayLabel={dayLabel}
        onDuplicateDay={onDuplicateDay}
        canDuplicateDay={canDuplicateDay}
      />

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
        <button
          type="button"
          className="wolf-se-coach-day-add"
          disabled={!canAddExercise}
          onClick={onAddExercise}
        >
          <span className="wolf-se-coach-day-add__icon" aria-hidden>
            <Plus size={20} strokeWidth={2.25} />
          </span>
          {isEs ? 'Añadir ejercicio' : 'Add exercise'}
        </button>
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
          if (deleteIndex != null) onRemoveBlock?.(deleteIndex);
          setDeleteIndex(null);
        }}
      />
    </section>
  );
};
