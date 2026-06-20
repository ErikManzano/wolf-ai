import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ChevronDown, ChevronRight, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { Exercise, Session, SessionExerciseBlock } from '../../models/training';
import { blockTotalReps, sessionTotalReps } from './blockMetrics';
import { formatBlockPrescription } from './schemeFormat';
import { blockDisplayName } from './sessionSheetUtils';
import { AppBreadcrumb, type AppBreadcrumbItem } from '../wl-shared/AppBreadcrumb';
import '../wl-shared/app-breadcrumb.css';

interface SessionSheetOverviewProps {
  session: Session;
  exercises: Exercise[];
  isEs: boolean;
  breadcrumbItems?: AppBreadcrumbItem[];
  canAddExercise?: boolean;
  dense?: boolean;
  hideHead?: boolean;
  sortable?: boolean;
  onSelectBlock?: (index: number) => void;
  onAddExercise?: () => void;
  onReorderBlocks?: (blocks: SessionExerciseBlock[]) => void;
  onRemoveBlock?: (index: number) => void;
  onMoveBlockUp?: (index: number) => void;
  onMoveBlockDown?: (index: number) => void;
}

type SortableRow = {
  id: string;
  block: SessionExerciseBlock;
};

let nextRowId = 0;

function makeRowId(): string {
  nextRowId += 1;
  return `sheet-row-${nextRowId}`;
}

function rowsFromBlocks(blocks: SessionExerciseBlock[], prev?: SortableRow[]): SortableRow[] {
  return blocks.map((block, i) => ({
    id: prev?.[i]?.id ?? makeRowId(),
    block,
  }));
}

interface SortableSheetRowProps {
  row: SortableRow;
  index: number;
  exercises: Exercise[];
  dense: boolean;
  isEs: boolean;
  blockReps: number;
  onSelectBlock?: (index: number) => void;
  onRemoveBlock?: (index: number) => void;
  onMoveBlockUp?: (index: number) => void;
  onMoveBlockDown?: (index: number) => void;
  totalBlocks: number;
}

function SheetExerciseRowButton({
  index,
  name,
  prescription,
  blockReps,
  dense,
  isEs,
  onClick,
  onPointerDown,
}: {
  index: number;
  name: string;
  prescription: string;
  blockReps: number;
  dense: boolean;
  isEs: boolean;
  onClick?: () => void;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className="wolf-se-sheet-row wolf-se-sheet-row--sortable"
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <span className="wolf-se-sheet-row-num">{index + 1}</span>
      <span className="wolf-se-sheet-row-body">
        <span className="wolf-se-sheet-row-name">{name}</span>
        <code className="wolf-se-sheet-row-rx" title={prescription}>
          {prescription}
        </code>
      </span>
      <span
        className="wolf-se-sheet-row-reps"
        aria-label={isEs ? `${blockReps} repeticiones` : `${blockReps} reps`}
      >
        {blockReps}
      </span>
      <ChevronRight size={dense ? 14 : 16} className="wolf-se-sheet-row-chevron" aria-hidden />
    </button>
  );
}

function SheetColumnHead({
  dense,
  isEs,
  sortable,
  showActionsSpacer,
}: {
  dense: boolean;
  isEs: boolean;
  sortable: boolean;
  showActionsSpacer: boolean;
}) {
  return (
    <div
      className={`wolf-se-sheet-col-head${dense ? ' wolf-se-sheet-col-head--dense' : ''}${sortable ? ' wolf-se-sheet-col-head--sortable' : ''}`}
      aria-hidden
    >
      {sortable ? <span className="wolf-se-sheet-col-head-spacer wolf-se-sheet-col-head-spacer--drag" /> : null}
      <div className="wolf-se-sheet-col-head-grid">
        <span className="wolf-se-sheet-col-head-cell wolf-se-sheet-col-head-cell--num">#</span>
        <span className="wolf-se-sheet-col-head-cell wolf-se-sheet-col-head-cell--exercise">
          {isEs ? 'Ejercicio' : 'Exercise'}
        </span>
        <span className="wolf-se-sheet-col-head-cell wolf-se-sheet-col-head-cell--reps">
          {isEs ? 'Reps' : 'Reps'}
        </span>
        <span className="wolf-se-sheet-col-head-cell wolf-se-sheet-col-head-cell--chev" />
      </div>
      {showActionsSpacer ? (
        <span className="wolf-se-sheet-col-head-spacer wolf-se-sheet-col-head-spacer--actions" />
      ) : null}
    </div>
  );
}

function SheetRepsTotal({ total, isEs, dense }: { total: number; isEs: boolean; dense: boolean }) {
  return (
    <div
      className={`wolf-se-sheet-reps-total${dense ? ' wolf-se-sheet-reps-total--dense' : ''}`}
      role="row"
    >
      <span className="wolf-se-sheet-reps-total-label">{isEs ? 'Total reps' : 'Total reps'}</span>
      <span className="wolf-se-sheet-reps-total-value" aria-label={isEs ? 'Total de repeticiones' : 'Total repetitions'}>
        {total}
      </span>
    </div>
  );
}

const SortableSheetRow: React.FC<SortableSheetRowProps> = ({
  row,
  index,
  exercises,
  dense,
  isEs,
  blockReps,
  onSelectBlock,
  onRemoveBlock,
  onMoveBlockUp,
  onMoveBlockDown,
  totalBlocks,
}) => {
  const dragControls = useDragControls();
  const { block } = row;
  const prescription = formatBlockPrescription(block);
  const name = blockDisplayName(block, exercises);

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragControls.start(event);
    },
    [dragControls],
  );

  const showReorderButtons =
    !dense && totalBlocks > 1 && Boolean(onMoveBlockUp) && Boolean(onMoveBlockDown);

  return (
    <Reorder.Item
      as="div"
      value={row}
      dragListener={false}
      dragControls={dragControls}
      className={`wolf-se-sheet-row-item wolf-se-sheet-row-item--sortable${dense ? ' wolf-se-sheet-row-item--dense' : ''}`}
      style={{ touchAction: 'manipulation' }}
      layout="position"
      transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.82 }}
      whileDrag={{
        scale: 1.015,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.32)',
        zIndex: 30,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        className="wolf-se-sheet-row-drag"
        aria-label={isEs ? 'Arrastrar para reordenar' : 'Drag to reorder'}
        onPointerDown={startDrag}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
        }}
      >
        <GripVertical size={dense ? 15 : 16} aria-hidden />
      </div>
      <SheetExerciseRowButton
        index={index}
        name={name}
        prescription={prescription}
        blockReps={blockReps}
        dense={dense}
        isEs={isEs}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onSelectBlock?.(index)}
      />
      {showReorderButtons ? (
        <div className="wolf-se-sheet-row-reorder" role="group" aria-label={isEs ? 'Reordenar' : 'Reorder'}>
          <button
            type="button"
            className="wolf-se-sheet-row-reorder-btn"
            disabled={index === 0}
            aria-label={isEs ? 'Subir ejercicio' : 'Move exercise up'}
            onClick={(event) => {
              event.stopPropagation();
              onMoveBlockUp?.(index);
            }}
          >
            <ChevronUp size={dense ? 14 : 15} aria-hidden />
          </button>
          <button
            type="button"
            className="wolf-se-sheet-row-reorder-btn"
            disabled={index === totalBlocks - 1}
            aria-label={isEs ? 'Bajar ejercicio' : 'Move exercise down'}
            onClick={(event) => {
              event.stopPropagation();
              onMoveBlockDown?.(index);
            }}
          >
            <ChevronDown size={dense ? 14 : 15} aria-hidden />
          </button>
        </div>
      ) : null}
      {onRemoveBlock ? (
        <button
          type="button"
          className="wolf-se-sheet-row-delete"
          aria-label={isEs ? 'Eliminar ejercicio' : 'Remove exercise'}
          onClick={(event) => {
            event.stopPropagation();
            onRemoveBlock(index);
          }}
        >
          <Trash2 size={dense ? 14 : 15} aria-hidden />
        </button>
      ) : null}
    </Reorder.Item>
  );
};

export const SessionSheetOverview: React.FC<SessionSheetOverviewProps> = ({
  session,
  exercises,
  isEs,
  breadcrumbItems,
  canAddExercise = false,
  dense = false,
  hideHead = false,
  sortable = false,
  onSelectBlock,
  onAddExercise,
  onReorderBlocks,
  onRemoveBlock,
  onMoveBlockUp,
  onMoveBlockDown,
}) => {
  const canSort =
    sortable && Boolean(onReorderBlocks) && session.exercises.length > 1;
  const [rows, setRows] = useState<SortableRow[]>(() => rowsFromBlocks(session.exercises));

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

  const totalReps = useMemo(() => sessionTotalReps(session.exercises), [session.exercises]);
  const showActionsSpacer = Boolean(onRemoveBlock);

  return (
    <section
      className={`wolf-se-sheet wolf-se-sheet--primary${dense ? ' wolf-se-sheet--dense' : ''}${canSort ? ' wolf-se-sheet--sortable' : ''}`}
      aria-label={isEs ? 'Hoja del día' : 'Day sheet'}
    >
      {hideHead ? null : (
        <div className="wolf-se-sheet-head">
          <div className="wolf-se-sheet-head-main">
            {breadcrumbItems && breadcrumbItems.length > 0 ? (
              <div className="wolf-se-sheet-head-crumb">
                <AppBreadcrumb isEs={isEs} items={breadcrumbItems} />
              </div>
            ) : (
              <h3 className="wolf-se-sheet-title">{isEs ? 'Hoja del día' : 'Day sheet'}</h3>
            )}
            {session.exercises.length > 0 ? (
              <span className="wolf-se-sheet-count" aria-label={isEs ? 'Ejercicios' : 'Exercises'}>
                {session.exercises.length}
              </span>
            ) : null}
          </div>
          {session.exercises.length === 0 || !dense ? (
            <span className="wolf-se-sheet-hint">
              {session.exercises.length
                ? isEs
                  ? canSort
                    ? 'Arrastra para reordenar · toca para editar'
                    : 'Toca un ejercicio para editar'
                  : canSort
                    ? 'Drag to reorder · tap to edit'
                    : 'Tap an exercise to edit'
                : isEs
                  ? 'Añade el primer ejercicio del día'
                  : 'Add the first exercise for this day'}
            </span>
          ) : null}
        </div>
      )}

      {session.exercises.length > 0 ? (
        <>
          <SheetColumnHead
            dense={dense}
            isEs={isEs}
            sortable={canSort}
            showActionsSpacer={showActionsSpacer}
          />
          {canSort ? (
          <Reorder.Group
            as="div"
            axis="y"
            values={rows}
            onReorder={handleReorder}
            className="wolf-se-sheet-rows wolf-se-sheet-rows--sortable"
          >
            {rows.map((row, i) => (
              <SortableSheetRow
                key={row.id}
                row={row}
                index={i}
                exercises={exercises}
                dense={dense}
                isEs={isEs}
                blockReps={blockTotalReps(row.block)}
                onSelectBlock={onSelectBlock}
                onRemoveBlock={onRemoveBlock}
                onMoveBlockUp={onMoveBlockUp}
                onMoveBlockDown={onMoveBlockDown}
                totalBlocks={session.exercises.length}
              />
            ))}
          </Reorder.Group>
        ) : (
          <ol className="wolf-se-sheet-rows">
            {session.exercises.map((block, i) => {
              const prescription = formatBlockPrescription(block);
              const name = blockDisplayName(block, exercises);
              const blockReps = blockTotalReps(block);
              const showReorderButtons =
                !dense &&
                session.exercises.length > 1 &&
                Boolean(onMoveBlockUp) &&
                Boolean(onMoveBlockDown);
              return (
                <li key={`sheet-${block.exerciseId}-${i}`}>
                  <div className={`wolf-se-sheet-row-item${dense ? ' wolf-se-sheet-row-item--dense' : ''} wolf-se-sheet-row-item--static`}>
                    {sortable && onRemoveBlock && session.exercises.length > 1 ? (
                      <span className="wolf-se-sheet-row-drag wolf-se-sheet-row-drag--placeholder" aria-hidden />
                    ) : null}
                    <SheetExerciseRowButton
                      index={i}
                      name={name}
                      prescription={prescription}
                      blockReps={blockReps}
                      dense={dense}
                      isEs={isEs}
                      onClick={() => onSelectBlock?.(i)}
                    />
                    {showReorderButtons ? (
                      <div className="wolf-se-sheet-row-reorder" role="group" aria-label={isEs ? 'Reordenar' : 'Reorder'}>
                        <button
                          type="button"
                          className="wolf-se-sheet-row-reorder-btn"
                          disabled={i === 0}
                          aria-label={isEs ? 'Subir ejercicio' : 'Move exercise up'}
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveBlockUp?.(i);
                          }}
                        >
                          <ChevronUp size={dense ? 14 : 15} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="wolf-se-sheet-row-reorder-btn"
                          disabled={i === session.exercises.length - 1}
                          aria-label={isEs ? 'Bajar ejercicio' : 'Move exercise down'}
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveBlockDown?.(i);
                          }}
                        >
                          <ChevronDown size={dense ? 14 : 15} aria-hidden />
                        </button>
                      </div>
                    ) : null}
                    {onRemoveBlock ? (
                      <button
                        type="button"
                        className="wolf-se-sheet-row-delete"
                        aria-label={isEs ? 'Eliminar ejercicio' : 'Remove exercise'}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveBlock(i);
                        }}
                      >
                        <Trash2 size={dense ? 14 : 15} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
          <SheetRepsTotal total={totalReps} isEs={isEs} dense={dense} />
        </>
      ) : (
        <div className="wolf-se-sheet-empty">
          <p>{isEs ? 'Sin ejercicios en esta sesión.' : 'No exercises in this session yet.'}</p>
        </div>
      )}

      {onAddExercise ? (
        <div className="wolf-se-sheet-footer">
          <button
            type="button"
            className="wolf-se-sets-premium__add-row wolf-se-sheet-add"
            disabled={!canAddExercise}
            onClick={onAddExercise}
          >
            <Plus size={14} aria-hidden />
            {isEs ? 'Añadir ejercicio' : 'Add exercise'}
          </button>
        </div>
      ) : null}
    </section>
  );
};
