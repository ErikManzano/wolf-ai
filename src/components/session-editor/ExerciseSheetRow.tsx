import React, { useCallback } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ChevronDown, Copy, Link2, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, Session } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';
import {
  duplicateExerciseBlock,
  getExerciseBlockKind,
  removeExerciseBlock,
  setBlockExercise,
  setExerciseBlockKind,
} from '../../services/sessionMutations';
import type { SessionPickerOption } from '../../services/exercise';
import { blockTonnage, blockTotalSets } from './blockMetrics';
import { blockDisplayName } from './sessionSheetUtils';
import { formatBlockRepsSummary } from './spreadsheetBlockFormat';
import { BlockPrescriptionRx } from './BlockPrescriptionRx';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
import { SpreadsheetBlockTypeSelect } from './SpreadsheetBlockTypeSelect';
import { ExerciseSheetExpandPanel } from './ExerciseSheetExpandPanel';
import { SpreadsheetDragGrip, SPREADSHEET_DRAG_SPRING } from './spreadsheetSortable';
import type { SortableExerciseRow } from './spreadsheetSortable';

const DEFAULT_COMPLEX_SECOND_ID = 'ex-022';

function rowClickIgnoresToggle(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, a, input, select, textarea, label, [role="combobox"], [role="listbox"], .wolf-se-autocomplete, .wolf-se-spreadsheet__type-combo, .wolf-se-spreadsheet__drag',
    ),
  );
}

export interface ExerciseSheetRowProps {
  block: Session['exercises'][number];
  blockIndex: number;
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  pickerOptions: SessionPickerOption[];
  isEs: boolean;
  expanded: boolean;
  colCount: number;
  focusBlockIndex?: number | null;
  sortable?: boolean;
  onDragStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onToggleExpanded: (blockIndex: number) => void;
  onExpandBlock: (blockIndex: number) => void;
  onApply: (fn: () => Session) => void;
}

export const ExerciseSheetRow: React.FC<ExerciseSheetRowProps> = ({
  block,
  blockIndex,
  session,
  athlete,
  exercises,
  pickerOptions,
  isEs,
  expanded,
  colCount,
  focusBlockIndex = null,
  sortable = false,
  onDragStart,
  onToggleExpanded,
  onExpandBlock,
  onApply,
}) => {
  const isComplex =
    normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const workSets = blockTotalSets(block);
  const repsSummary = formatBlockRepsSummary(block);
  const tonnage = blockTonnage(block, athlete, exercises);
  const blockCount = block.sets.length;
  const blockKind = getExerciseBlockKind(block);
  const summaryLine = isEs
    ? `${workSets} series · ${repsSummary} reps · ${tonnage > 0 ? `${tonnage.toLocaleString()} kg` : '—'}`
    : `${workSets} sets · ${repsSummary} reps · ${tonnage > 0 ? `${tonnage.toLocaleString()} kg` : '—'}`;

  return (
    <>
      <tr
        className={`wolf-se-spreadsheet__row wolf-se-spreadsheet__row--block wolf-se-spreadsheet__row--block--${blockKind}${blockIndex % 2 === 1 ? ' wolf-se-spreadsheet__row--block--alt' : ''}${expanded ? ' is-expanded' : ''}`}
        tabIndex={0}
        aria-expanded={expanded}
        onClick={(e) => {
          if (rowClickIgnoresToggle(e.target)) return;
          onToggleExpanded(blockIndex);
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          if (rowClickIgnoresToggle(e.target)) return;
          e.preventDefault();
          onToggleExpanded(blockIndex);
        }}
      >
        <td className="wolf-se-spreadsheet__col-idx">
          <div className="wolf-se-spreadsheet__idx-cell">
            {sortable && onDragStart ? (
              <SpreadsheetDragGrip isEs={isEs} onPointerDown={onDragStart} />
            ) : null}
            <span className="wolf-se-spreadsheet__idx-num">{blockIndex + 1}</span>
          </div>
        </td>
        <td className="wolf-se-spreadsheet__col-exercise" data-block-index={blockIndex}>
          <div className="wolf-se-spreadsheet__exercise-cell">
            {isComplex ? (
              <div className="wolf-se-spreadsheet__complex-name">
                <Link2 size={14} className="wolf-se-spreadsheet__complex-icon" aria-hidden />
                <span className="wolf-se-spreadsheet__exercise-name-text">
                  {blockDisplayName(block, exercises)}
                </span>
              </div>
            ) : (
              <ExerciseAutocomplete
                options={pickerOptions}
                value={block.exerciseId}
                isEs={isEs}
                compact
                panelMatchCard={false}
                autoFocus={focusBlockIndex === blockIndex}
                placeholder={isEs ? 'Elegir ejercicio…' : 'Pick exercise…'}
                onChange={(id) =>
                  onApply(() => setBlockExercise(session, blockIndex, id, athlete, exercises))
                }
              />
            )}
            <BlockPrescriptionRx block={block} />
            <span className="wolf-se-spreadsheet__exercise-summary">{summaryLine}</span>
          </div>
        </td>
        <td className="wolf-se-spreadsheet__col-type">
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
        </td>
        <td className="wolf-se-spreadsheet__col-blocks">
          <button
            type="button"
            className={`wolf-se-spreadsheet__blocks-toggle${expanded ? ' is-open' : ''}`}
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(blockIndex);
            }}
          >
            {blockCount}{' '}
            {isEs ? (blockCount === 1 ? 'bloque' : 'bloques') : blockCount === 1 ? 'block' : 'blocks'}
            <ChevronDown size={14} aria-hidden />
          </button>
        </td>
        <td className="wolf-se-spreadsheet__metric wolf-se-spreadsheet__metric--zone-start">{workSets}</td>
        <td className="wolf-se-spreadsheet__metric">{repsSummary}</td>
        <td className="wolf-se-spreadsheet__metric wolf-se-spreadsheet__metric--vol">
          {tonnage > 0 ? `${tonnage.toLocaleString()} kg` : '—'}
        </td>
        <td className="wolf-se-spreadsheet__col-actions">
          <div className="wolf-se-spreadsheet__row-actions">
            <button
              type="button"
              className="wolf-se-spreadsheet__icon-btn"
              title={isEs ? 'Duplicar ejercicio' : 'Duplicate exercise'}
              disabled={session.exercises.length >= 8}
              onClick={(e) => {
                e.stopPropagation();
                onApply(() => duplicateExerciseBlock(session, blockIndex, athlete, exercises));
              }}
            >
              <Copy size={14} aria-hidden />
            </button>
            <button
              type="button"
              className="wolf-se-spreadsheet__icon-btn wolf-se-spreadsheet__icon-btn--danger"
              title={isEs ? 'Eliminar ejercicio' : 'Remove exercise'}
              disabled={session.exercises.length <= 1}
              onClick={(e) => {
                e.stopPropagation();
                onApply(() => removeExerciseBlock(session, blockIndex, athlete, exercises));
              }}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="wolf-se-spreadsheet__row wolf-se-spreadsheet__row--detail">
          <td colSpan={colCount}>
            <div className="wolf-se-spreadsheet__detail-panel">
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
          </td>
        </tr>
      ) : null}
    </>
  );
};

interface SortableExerciseSheetGroupProps extends ExerciseSheetRowProps {
  row: SortableExerciseRow;
  canSort: boolean;
}

export const SortableExerciseSheetGroup: React.FC<SortableExerciseSheetGroupProps> = ({
  row,
  canSort,
  blockIndex,
  ...props
}) => {
  const dragControls = useDragControls();
  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragControls.start(event);
    },
    [dragControls],
  );

  if (!canSort) {
    return (
      <ExerciseSheetRow {...props} block={row.block} blockIndex={blockIndex} sortable={false} />
    );
  }

  return (
    <Reorder.Item
      as="tbody"
      value={row}
      dragListener={false}
      dragControls={dragControls}
      className="wolf-se-spreadsheet__tbody--sortable"
      layout="position"
      transition={SPREADSHEET_DRAG_SPRING}
      whileDrag={{ zIndex: 20, position: 'relative' }}
      style={{ touchAction: 'manipulation' }}
    >
      <ExerciseSheetRow
        {...props}
        block={row.block}
        blockIndex={blockIndex}
        sortable
        onDragStart={startDrag}
      />
    </Reorder.Item>
  );
};
