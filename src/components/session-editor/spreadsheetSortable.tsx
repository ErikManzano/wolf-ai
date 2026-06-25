import React, { useCallback, useEffect, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import type { SessionExerciseBlock, SetScheme } from '../../models/training';

export const SPREADSHEET_DRAG_SPRING = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 38,
  mass: 0.82,
};

export type SortableExerciseRow = { id: string; block: SessionExerciseBlock };

let nextExerciseRowId = 0;

export function rowsFromExerciseBlocks(
  blocks: SessionExerciseBlock[],
  prev?: SortableExerciseRow[],
): SortableExerciseRow[] {
  return blocks.map((block, i) => ({
    id: prev?.[i]?.id ?? `ss-ex-${++nextExerciseRowId}`,
    block,
  }));
}

export type SortableSetRow = { id: string; scheme: SetScheme };

let nextSetRowId = 0;

function makeSetRowId(): string {
  nextSetRowId += 1;
  return `ss-set-${nextSetRowId}`;
}

export function rowsFromSetSchemes(schemes: SetScheme[], prev?: SortableSetRow[]): SortableSetRow[] {
  return schemes.map((scheme, i) => ({
    id: prev?.[i]?.id ?? makeSetRowId(),
    scheme,
  }));
}

export function findSetReorderMove(
  prev: SortableSetRow[],
  next: SortableSetRow[],
): { from: number; to: number } | null {
  for (let to = 0; to < next.length; to++) {
    const from = prev.findIndex((row) => row.id === next[to]!.id);
    if (from !== to) return { from, to };
  }
  return null;
}

export function useSpreadsheetSetRows(
  sets: SetScheme[],
  onReorderSets?: (fromIndex: number, toIndex: number) => void,
) {
  const canReorder = Boolean(onReorderSets) && sets.length > 1;
  const [setRows, setSetRows] = useState<SortableSetRow[]>(() => rowsFromSetSchemes(sets));

  useEffect(() => {
    setSetRows((prev) => {
      if (sets.length !== prev.length) {
        return rowsFromSetSchemes(sets, prev);
      }
      return prev.map((row, i) => ({ id: row.id, scheme: sets[i]! }));
    });
  }, [sets]);

  const handleReorder = useCallback(
    (nextRows: SortableSetRow[]) => {
      setSetRows((prev) => {
        if (onReorderSets) {
          const move = findSetReorderMove(prev, nextRows);
          if (move) onReorderSets(move.from, move.to);
        }
        return nextRows;
      });
    },
    [onReorderSets],
  );

  return { setRows, handleReorder, canReorder };
}

interface SpreadsheetDragGripProps {
  isEs: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  disabled?: boolean;
}

export function SpreadsheetDragGrip({ isEs, onPointerDown, disabled }: SpreadsheetDragGripProps) {
  if (disabled) {
    return (
      <span className="wolf-se-spreadsheet__drag wolf-se-spreadsheet__drag--disabled" aria-hidden>
        <GripVertical size={14} />
      </span>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="wolf-se-spreadsheet__drag"
      aria-label={isEs ? 'Arrastrar para reordenar' : 'Drag to reorder'}
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
      }}
    >
      <GripVertical size={14} aria-hidden />
    </div>
  );
}

interface SpreadsheetSortableSetTrProps {
  sortableRow: SortableSetRow;
  isEs: boolean;
  canReorder: boolean;
  className?: string;
  children: (ctx: { dragGrip: React.ReactNode }) => React.ReactNode;
}

export function SpreadsheetSortableSetTr({
  sortableRow,
  isEs,
  canReorder,
  className,
  children,
}: SpreadsheetSortableSetTrProps) {
  const dragControls = useDragControls();
  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragControls.start(event);
    },
    [dragControls],
  );

  const dragGrip = canReorder ? (
    <SpreadsheetDragGrip isEs={isEs} onPointerDown={startDrag} />
  ) : null;

  const content = children({ dragGrip });

  if (!canReorder) {
    return <tr className={className}>{content}</tr>;
  }

  return (
    <Reorder.Item
      as="tr"
      value={sortableRow}
      dragListener={false}
      dragControls={dragControls}
      className={`wolf-se-spreadsheet-blocks__row--sortable${className ? ` ${className}` : ''}`}
      layout="position"
      transition={SPREADSHEET_DRAG_SPRING}
      whileDrag={{ zIndex: 30, position: 'relative' }}
      style={{ touchAction: 'manipulation' }}
    >
      {content}
    </Reorder.Item>
  );
}
