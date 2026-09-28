import React, { useCallback, useMemo, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ChevronDown, Copy, Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, Session } from '../../models/training';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { normalizeBlockType } from '../../services/trainingEngine';
import {
  duplicateExerciseBlock,
  getExerciseBlockKind,
  removeExerciseBlock,
  setBlockExercise,
  setExerciseBlockKind,
} from '../../services/sessionMutations';
import type { SessionPickerOption } from '../../services/exercise';
import type { GeneratedProgram } from '../../models/training';
import { collectExerciseHistory } from './programExerciseHistory';
import { InlineReferenceChip } from './program-context/InlineReferenceChip';
import { blockTonnage, blockTotalSets } from './blockMetrics';
import { editorActionToast } from './editorActionToasts';
import { blockDisplayName } from './sessionSheetUtils';
import { formatBlockRepsSummary } from './spreadsheetBlockFormat';
import { BlockPrescriptionRx } from './BlockPrescriptionRx';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
import { SpreadsheetBlockTypeSelect } from './SpreadsheetBlockTypeSelect';
import { SpreadsheetBlockMetrics } from './SpreadsheetBlockMetrics';
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
  program?: GeneratedProgram | null;
  weekNumber?: number;
  dayNumber?: number;
  showLoadKg?: boolean;
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
  program = null,
  weekNumber = 1,
  dayNumber = 1,
  showLoadKg = true,
}) => {
  const { pushAlert } = useWolfAlert();
  const isComplex =
    normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const workSets = blockTotalSets(block);
  const repsSummary = formatBlockRepsSummary(block);
  const tonnage = blockTonnage(block, athlete, exercises);
  const blockCount = block.sets.length;
  const blockKind = getExerciseBlockKind(block);
  const complexSegments = block.segments?.length
    ? block.segments
    : [{ exerciseId: block.exerciseId }];
  const summaryLine = isEs
    ? `${workSets} series · ${repsSummary} reps${showLoadKg && tonnage > 0 ? ` · ${tonnage.toLocaleString()} kg` : ''}`
    : `${workSets} sets · ${repsSummary} reps${showLoadKg && tonnage > 0 ? ` · ${tonnage.toLocaleString()} kg` : ''}`;

  const historySnapshots = useMemo(() => {
    if (!program) return [];
    return collectExerciseHistory(program, block, athlete, exercises, weekNumber, dayNumber, 4);
  }, [program, block, athlete, exercises, weekNumber, dayNumber]);

  const priorHistorySnapshots = useMemo(
    () => historySnapshots.filter((row) => !row.isCurrent),
    [historySnapshots],
  );

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
            <div className="wolf-se-spreadsheet__exercise-main">
              {isComplex ? (
                <div className="wolf-se-spreadsheet__complex-name">
                  {complexSegments.map((segment, segmentIndex) => (
                    <React.Fragment key={`${segment.exerciseId}-${segmentIndex}`}>
                      {segmentIndex > 0 ? (
                        <span className="wolf-se-spreadsheet__complex-plus" aria-hidden>
                          <Plus size={12} strokeWidth={2.5} />
                        </span>
                      ) : null}
                      <span className="wolf-se-spreadsheet__complex-movement">
                        {segment.label?.trim() ||
                          exercises.find((exercise) => exercise.id === segment.exerciseId)?.name ||
                          blockDisplayName(block, exercises)}
                      </span>
                    </React.Fragment>
                  ))}
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
            </div>
            <BlockPrescriptionRx block={block} />
            <div className="wolf-se-spreadsheet__exercise-meta">
              <span className="wolf-se-spreadsheet__exercise-summary">{summaryLine}</span>
              {program && priorHistorySnapshots.length > 0 ? (
                <InlineReferenceChip snapshots={historySnapshots} isEs={isEs} />
              ) : null}
            </div>
          </div>
        </td>
        <td className="wolf-se-spreadsheet__col-actions">
          <div className="wolf-se-spreadsheet__row-actions">
            <SpreadsheetBlockTypeSelect
              compact
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
            <button
              type="button"
              className="wolf-se-spreadsheet__icon-btn"
              title={isEs ? 'Duplicar ejercicio' : 'Duplicate exercise'}
              disabled={session.exercises.length >= 8}
              onClick={(e) => {
                e.stopPropagation();
                onApply(() => duplicateExerciseBlock(session, blockIndex, athlete, exercises));
                pushAlert(editorActionToast(isEs, 'duplicateExercise'));
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
                pushAlert(editorActionToast(isEs, 'removeExercise'));
              }}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        </td>
        <SpreadsheetBlockMetrics
          block={block}
          athlete={athlete}
          exercises={exercises}
          isEs={isEs}
          showLoadKg={showLoadKg}
        />
        <td className="wolf-se-spreadsheet__col-blocks">
          <button
            type="button"
            className={`wolf-se-spreadsheet__blocks-toggle${expanded ? ' is-open' : ''}`}
            aria-expanded={expanded}
            aria-label={
              isEs
                ? `${blockCount} ${blockCount === 1 ? 'bloque' : 'bloques'}`
                : `${blockCount} ${blockCount === 1 ? 'block' : 'blocks'}`
            }
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(blockIndex);
            }}
          >
            <ChevronDown size={14} aria-hidden />
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr
          className="wolf-se-spreadsheet__row wolf-se-spreadsheet__row--detail"
          onClick={(e) => e.stopPropagation()}
        >
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
  const [isDragging, setIsDragging] = useState(false);

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* ignore capture failures on unsupported targets */
      }
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
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      whileDrag={{
        zIndex: 30,
        position: 'relative',
        scale: 1.01,
        boxShadow: '0 14px 34px rgba(28, 25, 23, 0.18)',
      }}
      style={{ touchAction: 'none' }}
      data-is-dragging={isDragging ? 'true' : undefined}
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
