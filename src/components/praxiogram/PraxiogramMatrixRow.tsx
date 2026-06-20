import React, { useCallback } from 'react';
import { motion, Reorder, useDragControls, useReducedMotion } from 'framer-motion';
import { GripVertical, Trash2 } from 'lucide-react';
import type { PraxiogramRow } from '../../models/praxiogram';
import { PRAXIOGRAM_COLUMNS } from './praxiogram-columns';

const PRX_ROW_SPRING = { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.82 };

export interface PraxiogramMatrixRowProps {
  row: PraxiogramRow;
  index: number;
  isEs: boolean;
  readOnly: boolean;
  canReorder: boolean;
  canRemove: boolean;
  onRemove: (rowId: string) => void;
  renderCellInput: (
    row: PraxiogramRow,
    col: (typeof PRAXIOGRAM_COLUMNS)[number],
    index: number,
  ) => React.ReactNode;
}

export const PraxiogramMatrixRow: React.FC<PraxiogramMatrixRowProps> = ({
  row,
  index,
  isEs,
  readOnly,
  canReorder,
  canRemove,
  onRemove,
  renderCellInput,
}) => {
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!canReorder) return;
      event.preventDefault();
      event.stopPropagation();
      dragControls.start(event);
    },
    [canReorder, dragControls],
  );

  const motionProps = reduceMotion
    ? {}
    : {
        layout: 'position' as const,
        initial: { opacity: 0, y: -8, scale: 0.985 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: {
          opacity: 0,
          x: 16,
          scale: 0.97,
          transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
        },
        transition: PRX_ROW_SPRING,
      };

  const dragMotionProps = reduceMotion
    ? {}
    : {
        whileDrag: {
          scale: 1.008,
          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(249, 115, 22, 0.22)',
          zIndex: 30,
        },
      };

  const rowBody = (
    <>
      <div className="prx-col-order" role="cell">
        {canReorder ? (
          <button
            type="button"
            className="prx-order-grip"
            aria-label={isEs ? `Arrastrar fila ${index + 1}` : `Drag row ${index + 1}`}
            onPointerDown={startDrag}
          >
            <GripVertical size={14} aria-hidden />
          </button>
        ) : (
          <span className="prx-order-grip prx-order-grip--static" aria-hidden>
            <GripVertical size={14} />
          </span>
        )}
        <span className="prx-order-num">{index + 1}</span>
      </div>
      {PRAXIOGRAM_COLUMNS.map((col) => (
        <div key={col.key} className="prx-col-cell" role="cell">
          {renderCellInput(row, col, index)}
        </div>
      ))}
      <div className="prx-col-actions" role="cell">
        {!readOnly ? (
          <button
            type="button"
            className="prx-delete-btn"
            onClick={() => onRemove(row.id)}
            disabled={!canRemove}
            aria-label={isEs ? `Eliminar fila ${index + 1}` : `Delete row ${index + 1}`}
          >
            <Trash2 size={16} aria-hidden />
          </button>
        ) : null}
      </div>
    </>
  );

  if (canReorder) {
    return (
      <Reorder.Item
        as="div"
        value={row}
        dragListener={false}
        dragControls={dragControls}
        role="row"
        className="prx-matrix-row prx-matrix-row--sortable"
        style={{ touchAction: 'manipulation' }}
        {...motionProps}
        {...dragMotionProps}
      >
        {rowBody}
      </Reorder.Item>
    );
  }

  return (
    <motion.div role="row" className="prx-matrix-row" {...motionProps}>
      {rowBody}
    </motion.div>
  );
};

export default PraxiogramMatrixRow;
