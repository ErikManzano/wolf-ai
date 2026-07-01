import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import type { SessionPickerOption } from '../../services/exercise';
import { normalizeBlockType } from '../../services/trainingEngine';
import {
  duplicateExerciseBlock,
  getExerciseBlockKind,
  setBlockExercise,
  setExerciseBlockKind,
} from '../../services/sessionMutations';
import { blockTonnage, blockTotalSets } from './blockMetrics';
import { blockDisplayName } from './sessionSheetUtils';
import { formatBlockPrescriptionDisplay } from './schemeFormat';
import { formatBlockRepsSummary } from './spreadsheetBlockFormat';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
import { SpreadsheetBlockTypeSelect } from './SpreadsheetBlockTypeSelect';
import { ExerciseSheetExpandPanel } from './ExerciseSheetExpandPanel';
import { AppBreadcrumb, type AppBreadcrumbItem } from '../wl-shared/AppBreadcrumb';
import { SessionSheetSummary } from './SessionSheetSummary';
import '../wl-shared/app-breadcrumb.css';
import './session-sheet-spreadsheet.css';

const DEFAULT_COMPLEX_SECOND_ID = 'ex-022';

type SortableRow = { id: string; block: SessionExerciseBlock };

function rowsFromBlocks(blocks: SessionExerciseBlock[], prev?: SortableRow[]): SortableRow[] {
  return blocks.map((block, i) => ({
    id: prev?.[i]?.id ?? `se-row-${i}-${block.exerciseId}`,
    block,
  }));
}

function rowClickIgnoresToggle(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, a, input, select, textarea, label, [role="combobox"], [role="listbox"], .wolf-se-autocomplete, .wolf-se-spreadsheet__type-combo',
    ),
  );
}

interface MobileCardProps {
  block: SessionExerciseBlock;
  blockIndex: number;
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  pickerOptions: SessionPickerOption[];
  isEs: boolean;
  expanded: boolean;
  sortable: boolean;
  totalBlocks: number;
  focusBlockIndex?: number | null;
  onToggleExpanded: (index: number) => void;
  onExpandBlock: (index: number) => void;
  onApply: (fn: () => Session) => void;
  onRemoveBlock?: (index: number) => void;
  onDragStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
}

const MobileExerciseCard: React.FC<MobileCardProps> = ({
  block,
  blockIndex,
  session,
  athlete,
  exercises,
  pickerOptions,
  isEs,
  expanded,
  sortable,
  totalBlocks,
  focusBlockIndex,
  onToggleExpanded,
  onExpandBlock,
  onApply,
  onRemoveBlock,
  onDragStart,
}) => {
  const isComplex =
    normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const workSets = blockTotalSets(block);
  const repsSummary = formatBlockRepsSummary(block);
  const tonnage = blockTonnage(block, athlete, exercises);
  const blockCount = block.sets.length;
  const blockKind = getExerciseBlockKind(block);
  const prescriptionDisplay = formatBlockPrescriptionDisplay(block);

  return (
    <article
      className={`wolf-se-mobile-card${expanded ? ' is-expanded' : ''}`}
      onClick={(e) => {
        if (rowClickIgnoresToggle(e.target)) return;
        onToggleExpanded(blockIndex);
      }}
    >
      <header className="wolf-se-mobile-card__head">
        {sortable && onDragStart ? (
          <div
            role="button"
            tabIndex={0}
            className="wolf-se-mobile-card__drag"
            aria-label={isEs ? 'Arrastrar' : 'Drag'}
            onPointerDown={onDragStart}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} aria-hidden />
          </div>
        ) : null}
        <span className="wolf-se-mobile-card__idx">{blockIndex + 1}</span>
        <div className="wolf-se-mobile-card__title-wrap">
          {isComplex ? (
            <h4 className="wolf-se-mobile-card__title">{blockDisplayName(block, exercises, isEs)}</h4>
          ) : (
            <div
              className="wolf-se-mobile-card__picker"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <ExerciseAutocomplete
                options={pickerOptions}
                value={block.exerciseId}
                isEs={isEs}
                compact
                panelMatchCard={false}
                autoFocus={focusBlockIndex === blockIndex}
                placeholder={isEs ? 'Ejercicio…' : 'Exercise…'}
                onChange={(id) =>
                  onApply(() => setBlockExercise(session, blockIndex, id, athlete, exercises))
                }
              />
            </div>
          )}
          <p className="wolf-se-mobile-card__rx">{prescriptionDisplay}</p>
        </div>
        <button
          type="button"
          className={`wolf-se-mobile-card__chev${expanded ? ' is-open' : ''}`}
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpanded(blockIndex);
          }}
        >
          <ChevronDown size={18} aria-hidden />
        </button>
      </header>

      <div
        className="wolf-se-mobile-card__meta"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <SpreadsheetBlockTypeSelect
          kind={blockKind}
          isEs={isEs}
          onChange={(kind) => {
            onApply(() =>
              setExerciseBlockKind(
                session,
                blockIndex,
                kind,
                athlete,
                exercises,
                DEFAULT_COMPLEX_SECOND_ID,
              ),
            );
            if (kind === 'complex') onExpandBlock(blockIndex);
          }}
        />
        <span className="wolf-se-mobile-card__blocks-pill">
          {blockCount} {isEs ? (blockCount === 1 ? 'bloque' : 'bloques') : blockCount === 1 ? 'block' : 'blocks'}
        </span>
      </div>

      <p className="wolf-se-mobile-card__totals">
        {workSets} {isEs ? 'series' : 'sets'} · {repsSummary} reps ·{' '}
        {tonnage > 0 ? `${tonnage.toLocaleString()} kg` : '—'}
      </p>

      <div className="wolf-se-mobile-card__actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="wolf-se-spreadsheet__icon-btn"
          title={isEs ? 'Duplicar' : 'Duplicate'}
          disabled={session.exercises.length >= 8}
          onClick={() =>
            onApply(() => duplicateExerciseBlock(session, blockIndex, athlete, exercises))
          }
        >
          <Copy size={14} aria-hidden />
        </button>
        {onRemoveBlock ? (
          <button
            type="button"
            className="wolf-se-spreadsheet__icon-btn wolf-se-spreadsheet__icon-btn--danger"
            title={isEs ? 'Eliminar' : 'Remove'}
            disabled={totalBlocks <= 1}
            onClick={() => onRemoveBlock(blockIndex)}
          >
            <Trash2 size={14} aria-hidden />
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div
          className="wolf-se-mobile-card__expand"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <ExerciseSheetExpandPanel
            block={block}
            blockIndex={blockIndex}
            session={session}
            athlete={athlete}
            exercises={exercises}
            pickerOptions={pickerOptions}
            isEs={isEs}
            onApply={onApply}
          />
        </div>
      ) : null}
    </article>
  );
};

function SortableMobileCard({
  row,
  blockIndex,
  ...props
}: Omit<MobileCardProps, 'onDragStart' | 'sortable'> & {
  row: SortableRow;
  sortable: boolean;
}) {
  const dragControls = useDragControls();
  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragControls.start(event);
  };

  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={dragControls}
      className="wolf-se-mobile-card-item"
    >
      <MobileExerciseCard {...props} blockIndex={blockIndex} onDragStart={startDrag} />
    </Reorder.Item>
  );
}

export interface SessionSheetMobileCardsProps {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  pickerOptions: SessionPickerOption[];
  isEs: boolean;
  breadcrumbItems?: AppBreadcrumbItem[];
  showSummary?: boolean;
  canAddExercise?: boolean;
  sortable?: boolean;
  focusBlockIndex?: number | null;
  onFocusBlockHandled?: () => void;
  onApply: (fn: () => Session) => void;
  onAddExercise: () => void;
  onReorderBlocks?: (blocks: SessionExerciseBlock[]) => void;
  onRemoveBlock?: (index: number) => void;
}

export const SessionSheetMobileCards: React.FC<SessionSheetMobileCardsProps> = ({
  session,
  athlete,
  exercises,
  pickerOptions,
  isEs,
  breadcrumbItems,
  showSummary = true,
  canAddExercise = true,
  sortable = false,
  focusBlockIndex = null,
  onFocusBlockHandled,
  onApply,
  onAddExercise,
  onReorderBlocks,
  onRemoveBlock,
}) => {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(() => new Set());
  const canSort = sortable && Boolean(onReorderBlocks) && session.exercises.length > 1;
  const [rows, setRows] = useState<SortableRow[]>(() => rowsFromBlocks(session.exercises));

  useEffect(() => {
    setRows((prev) => {
      if (session.exercises.length !== prev.length) {
        return rowsFromBlocks(session.exercises, prev);
      }
      return prev.map((row, i) => ({ id: row.id, block: session.exercises[i]! }));
    });
  }, [session.exercises]);

  useEffect(() => {
    if (focusBlockIndex == null) return;
    setExpandedBlocks((prev) => new Set(prev).add(focusBlockIndex));
    onFocusBlockHandled?.();
  }, [focusBlockIndex, onFocusBlockHandled]);

  const toggleExpanded = useCallback((blockIndex: number) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockIndex)) next.delete(blockIndex);
      else next.add(blockIndex);
      return next;
    });
  }, []);

  const expandBlock = useCallback((blockIndex: number) => {
    setExpandedBlocks((prev) => new Set(prev).add(blockIndex));
  }, []);

  const handleReorder = useCallback(
    (nextRows: SortableRow[]) => {
      setRows(nextRows);
      onReorderBlocks?.(nextRows.map((r) => r.block));
    },
    [onReorderBlocks],
  );

  return (
    <section className="wolf-se-spreadsheet wolf-se-mobile-cards" aria-label={isEs ? 'Hoja del día' : 'Day sheet'}>
      {(breadcrumbItems?.length || showSummary) ? (
        <div className="wolf-se-spreadsheet__head">
          {breadcrumbItems?.length ? <AppBreadcrumb isEs={isEs} items={breadcrumbItems} /> : null}
          {showSummary ? (
            <SessionSheetSummary session={session} athlete={athlete} exercises={exercises} isEs={isEs} />
          ) : null}
        </div>
      ) : null}

      {session.exercises.length === 0 ? (
        <p className="wolf-se-spreadsheet__empty wolf-se-mobile-cards__empty">
          {isEs ? 'Sin ejercicios. Añade el primero abajo.' : 'No exercises. Add one below.'}
        </p>
      ) : canSort ? (
        <Reorder.Group
          as="div"
          axis="y"
          values={rows}
          onReorder={handleReorder}
          className="wolf-se-mobile-cards__list"
        >
          {rows.map((row, i) => (
            <SortableMobileCard
              key={row.id}
              row={row}
              block={row.block}
              blockIndex={i}
              session={session}
              athlete={athlete}
              exercises={exercises}
              pickerOptions={pickerOptions}
              isEs={isEs}
              expanded={expandedBlocks.has(i)}
              sortable={canSort}
              totalBlocks={session.exercises.length}
              focusBlockIndex={focusBlockIndex}
              onToggleExpanded={toggleExpanded}
              onExpandBlock={expandBlock}
              onApply={onApply}
              onRemoveBlock={onRemoveBlock}
            />
          ))}
        </Reorder.Group>
      ) : (
        <div className="wolf-se-mobile-cards__list">
          {session.exercises.map((block, i) => (
            <MobileExerciseCard
              key={i}
              block={block}
              blockIndex={i}
              session={session}
              athlete={athlete}
              exercises={exercises}
              pickerOptions={pickerOptions}
              isEs={isEs}
              expanded={expandedBlocks.has(i)}
              sortable={false}
              totalBlocks={session.exercises.length}
              focusBlockIndex={focusBlockIndex}
              onToggleExpanded={toggleExpanded}
              onExpandBlock={expandBlock}
              onApply={onApply}
              onRemoveBlock={onRemoveBlock}
            />
          ))}
        </div>
      )}

      {canAddExercise ? (
        <button type="button" className="wolf-se-spreadsheet__add-row" onClick={onAddExercise}>
          <Plus size={16} aria-hidden />
          {isEs ? 'Agregar ejercicio' : 'Add exercise'}
        </button>
      ) : null}
    </section>
  );
};
