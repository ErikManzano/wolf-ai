import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import type { SessionPickerOption } from '../../services/exercise';
import { ExerciseSheetRow, SortableExerciseSheetGroup } from './ExerciseSheetRow';
import { rowsFromExerciseBlocks, type SortableExerciseRow } from './spreadsheetSortable';
import { SessionSheetSummary } from './SessionSheetSummary';
import { AppBreadcrumb, type AppBreadcrumbItem } from '../wl-shared/AppBreadcrumb';
import '../wl-shared/app-breadcrumb.css';
import './session-sheet-spreadsheet.css';
import './set-rows.css';

export interface SessionSheetSpreadsheetProps {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  pickerOptions: SessionPickerOption[];
  isEs: boolean;
  breadcrumbItems?: AppBreadcrumbItem[];
  showSummary?: boolean;
  canAddExercise?: boolean;
  sortable?: boolean;
  /** Single-line column labels (embedded program editor). */
  compactHeaders?: boolean;
  focusBlockIndex?: number | null;
  onFocusBlockHandled?: () => void;
  onApply: (fn: () => Session) => void;
  onAddExercise: () => void;
  onReorderBlocks?: (blocks: SessionExerciseBlock[]) => void;
}

export const SessionSheetSpreadsheet: React.FC<SessionSheetSpreadsheetProps> = ({
  session,
  athlete,
  exercises,
  pickerOptions,
  isEs,
  breadcrumbItems,
  showSummary = true,
  canAddExercise = true,
  sortable = false,
  compactHeaders = false,
  focusBlockIndex = null,
  onFocusBlockHandled,
  onApply,
  onAddExercise,
  onReorderBlocks,
}) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(() => new Set());
  const canSort = sortable && Boolean(onReorderBlocks) && session.exercises.length > 1;
  const [rows, setRows] = useState<SortableExerciseRow[]>(() => rowsFromExerciseBlocks(session.exercises));

  useEffect(() => {
    setRows((prev) => {
      if (session.exercises.length !== prev.length) {
        return rowsFromExerciseBlocks(session.exercises, prev);
      }
      return prev.map((row, i) => ({ id: row.id, block: session.exercises[i]! }));
    });
  }, [session.exercises]);

  useEffect(() => {
    if (focusBlockIndex == null) return;
    setExpandedBlocks((prev) => new Set(prev).add(focusBlockIndex));
    const cell = tableRef.current?.querySelector<HTMLElement>(
      `[data-block-index="${focusBlockIndex}"]`,
    );
    const input = cell?.querySelector<HTMLInputElement>('.wolf-se-autocomplete-input');
    if (input) {
      input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      input.focus();
    }
    onFocusBlockHandled?.();
  }, [focusBlockIndex, session.exercises.length, onFocusBlockHandled]);

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
    (nextRows: SortableExerciseRow[]) => {
      setRows(nextRows);
      onReorderBlocks?.(nextRows.map((row) => row.block));
    },
    [onReorderBlocks],
  );

  const colCount = 8;

  return (
    <section
      className={`wolf-se-spreadsheet${canSort ? ' wolf-se-spreadsheet--sortable' : ''}${compactHeaders ? ' wolf-se-spreadsheet--compact-head' : ''}`}
      aria-label={isEs ? 'Hoja del día' : 'Day sheet'}
    >
      {(breadcrumbItems?.length || showSummary) ? (
        <div className="wolf-se-spreadsheet__head">
          {breadcrumbItems?.length ? <AppBreadcrumb isEs={isEs} items={breadcrumbItems} /> : null}
          {showSummary ? (
            <SessionSheetSummary session={session} athlete={athlete} exercises={exercises} isEs={isEs} />
          ) : null}
        </div>
      ) : null}

      <div className="wolf-se-spreadsheet__table-wrap">
        <table className="wolf-se-spreadsheet__table" ref={tableRef}>
          <colgroup>
            <col className="wolf-se-spreadsheet__col-idx" />
            <col className="wolf-se-spreadsheet__col-exercise" />
            <col className="wolf-se-spreadsheet__col-type" />
            <col className="wolf-se-spreadsheet__col-blocks" />
            <col className="wolf-se-spreadsheet__col-metric" />
            <col className="wolf-se-spreadsheet__col-metric" />
            <col className="wolf-se-spreadsheet__col-metric wolf-se-spreadsheet__col-metric--vol" />
            <col className="wolf-se-spreadsheet__col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th className="wolf-se-spreadsheet__col-idx">#</th>
              <th className="wolf-se-spreadsheet__col-exercise">{isEs ? 'Ejercicio' : 'Exercise'}</th>
              <th className="wolf-se-spreadsheet__col-type">{isEs ? 'Tipo' : 'Type'}</th>
              <th className="wolf-se-spreadsheet__col-blocks">
                {compactHeaders ? (
                  isEs ? 'Bloques' : 'Blocks'
                ) : (
                  <span className="wolf-se-spreadsheet__th-stack">
                    <span className="wolf-se-spreadsheet__th-primary">{isEs ? 'Bloques' : 'Blocks'}</span>
                    <span className="wolf-se-spreadsheet__th-secondary">{isEs ? 'de series' : 'of sets'}</span>
                  </span>
                )}
              </th>
              <th className="wolf-se-spreadsheet__col-metric wolf-se-spreadsheet__col-metric--zone">
                {compactHeaders ? (
                  isEs ? 'Series' : 'Sets'
                ) : (
                  <span className="wolf-se-spreadsheet__th-stack">
                    <span className="wolf-se-spreadsheet__th-primary">{isEs ? 'Series' : 'Sets'}</span>
                    <span className="wolf-se-spreadsheet__th-secondary">{isEs ? 'totales' : 'total'}</span>
                  </span>
                )}
              </th>
              <th className="wolf-se-spreadsheet__col-metric wolf-se-spreadsheet__col-metric--zone">
                {compactHeaders ? (
                  'Reps'
                ) : (
                  <span className="wolf-se-spreadsheet__th-stack">
                    <span className="wolf-se-spreadsheet__th-primary">Reps</span>
                    <span className="wolf-se-spreadsheet__th-secondary">{isEs ? 'totales' : 'total'}</span>
                  </span>
                )}
              </th>
              <th className="wolf-se-spreadsheet__col-metric wolf-se-spreadsheet__col-metric--vol wolf-se-spreadsheet__col-metric--zone">
                {compactHeaders ? (
                  isEs ? 'Vol. kg' : 'Vol. kg'
                ) : (
                  <span className="wolf-se-spreadsheet__th-stack">
                    <span className="wolf-se-spreadsheet__th-primary">{isEs ? 'Volumen' : 'Volume'}</span>
                    <span className="wolf-se-spreadsheet__th-secondary">kg</span>
                  </span>
                )}
              </th>
              <th className="wolf-se-spreadsheet__col-actions" aria-hidden />
            </tr>
          </thead>
          {session.exercises.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={colCount} className="wolf-se-spreadsheet__empty">
                  {isEs ? 'Sin ejercicios. Añade el primero abajo.' : 'No exercises. Add one below.'}
                </td>
              </tr>
            </tbody>
          ) : canSort ? (
            <Reorder.Group
              axis="y"
              values={rows}
              onReorder={handleReorder}
              as="div"
              className="wolf-se-spreadsheet__reorder-shell"
              style={{ display: 'contents' }}
            >
              {rows.map((row, blockIndex) => (
                <SortableExerciseSheetGroup
                  key={row.id}
                  row={row}
                  canSort={canSort}
                  block={row.block}
                  blockIndex={blockIndex}
                  session={session}
                  athlete={athlete}
                  exercises={exercises}
                  pickerOptions={pickerOptions}
                  isEs={isEs}
                  expanded={expandedBlocks.has(blockIndex)}
                  colCount={colCount}
                  focusBlockIndex={focusBlockIndex}
                  onToggleExpanded={toggleExpanded}
                  onExpandBlock={expandBlock}
                  onApply={onApply}
                />
              ))}
            </Reorder.Group>
          ) : (
            <tbody>
              {session.exercises.map((block, blockIndex) => (
                <ExerciseSheetRow
                  key={blockIndex}
                  block={block}
                  blockIndex={blockIndex}
                  session={session}
                  athlete={athlete}
                  exercises={exercises}
                  pickerOptions={pickerOptions}
                  isEs={isEs}
                  expanded={expandedBlocks.has(blockIndex)}
                  colCount={colCount}
                  focusBlockIndex={focusBlockIndex}
                  onToggleExpanded={toggleExpanded}
                  onExpandBlock={expandBlock}
                  onApply={onApply}
                />
              ))}
            </tbody>
          )}
        </table>
      </div>

      {canAddExercise ? (
        <button type="button" className="wolf-se-spreadsheet__add-row" onClick={onAddExercise}>
          <Plus size={16} aria-hidden />
          {isEs ? 'Agregar ejercicio' : 'Add exercise'}
        </button>
      ) : null}
    </section>
  );
};
