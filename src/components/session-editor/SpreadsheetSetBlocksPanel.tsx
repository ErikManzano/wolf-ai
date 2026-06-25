import React from 'react';
import { Reorder } from 'framer-motion';
import { Copy, Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';
import { WL_SESSION_LIMITS } from '../../services/sessionMutations';
import {
  complexSetRowTonnage,
  kgForExercise,
} from './blockMetrics';
import { ComboPresetField } from './ComboPresetField';
import { SegmentRepField } from './SegmentRepField';
import { DEFAULT_REST_SEC } from './setSchemeUtils';
import { purposeForScheme, purposeLabel } from './spreadsheetPurposeUtils';
import {
  spreadsheetRepsOptions,
  spreadsheetRestPresetOptions,
  spreadsheetSetsOptions,
} from './spreadsheetSetFieldPresets';
import { SpreadsheetSortableSetTr, useSpreadsheetSetRows } from './spreadsheetSortable';

const PCT_PRESETS = [60, 65, 70, 75, 80, 85, 90, 95, 100].map((n) => ({ value: n, label: `${n}%` }));
const SETS_SUFFIX = { ES: 'series', EN: 'sets' } as const;
const REPS_SUFFIX = 'reps';

export interface SpreadsheetSetBlocksPanelProps {
  block: SessionExerciseBlock;
  blockIndex: number;
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  onApply: (fn: () => Session) => void;
  onPctChange: (setIndex: number, pct: number) => void;
  onRepsChange: (setIndex: number, reps: number) => void;
  onSetsChange: (setIndex: number, sets: number) => void;
  onRestChange: (setIndex: number, restSec: number) => void;
  onSegmentRepChange: (setIndex: number, segIndex: number, value: string) => void;
  onAddSet: () => void;
  onDuplicateSet: (setIndex: number) => void;
  onRemoveSet: (setIndex: number) => void;
  onReorderSets?: (fromIndex: number, toIndex: number) => void;
}

function rowVolume(
  block: SessionExerciseBlock,
  setIndex: number,
  athlete: Athlete,
  exercises: Exercise[],
): number {
  const row = block.sets[setIndex];
  if (!row) return 0;
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  if (isComplex) return complexSetRowTonnage(block, row, athlete, exercises);
  const ex = exercises.find((e) => e.id === block.exerciseId);
  if (!ex) return 0;
  const kg = kgForExercise(athlete, ex, row.percentage);
  return Math.round(kg * row.reps * row.sets);
}

export const SpreadsheetSetBlocksPanel: React.FC<SpreadsheetSetBlocksPanelProps> = ({
  block,
  athlete,
  exercises,
  isEs,
  onPctChange,
  onRepsChange,
  onSetsChange,
  onRestChange,
  onSegmentRepChange,
  onAddSet,
  onDuplicateSet,
  onRemoveSet,
  onReorderSets,
}) => {
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const { setRows, handleReorder, canReorder } = useSpreadsheetSetRows(block.sets, onReorderSets);
  const setsSuffix = isEs ? SETS_SUFFIX.ES : SETS_SUFFIX.EN;
  const restPresetOptions = spreadsheetRestPresetOptions(isEs);

  const renderSetRow = (row: (typeof block.sets)[number], setIndex: number, dragGrip: React.ReactNode) => {
    const purpose = purposeForScheme(row);
    const vol = rowVolume(block, setIndex, athlete, exercises);
    return (
      <>
        <td className="wolf-se-spreadsheet-blocks__idx">
          <div className="wolf-se-spreadsheet-blocks__idx-cell">
            {dragGrip}
            <span>{setIndex + 1}</span>
          </div>
        </td>
        <td className="wolf-se-spreadsheet-blocks__purpose">
          <span className={`wolf-se-spreadsheet-purpose wolf-se-spreadsheet-purpose--${purpose}`}>
            <span className="wolf-se-spreadsheet-purpose__dot" aria-hidden />
            <span className="wolf-se-spreadsheet-purpose__label">{purposeLabel(purpose, isEs)}</span>
          </span>
        </td>
        <td className="wolf-se-spreadsheet-blocks__pct">
          <ComboPresetField
            variant="premium"
            value={row.percentage}
            options={PCT_PRESETS}
            onChange={(v) => onPctChange(setIndex, v)}
            aria-label={isEs ? `Intensidad bloque ${setIndex + 1}` : `Intensity block ${setIndex + 1}`}
          />
        </td>
        <td className="wolf-se-spreadsheet-blocks__sets">
          <ComboPresetField
            variant="premium"
            value={row.sets}
            options={spreadsheetSetsOptions(row.sets)}
            onChange={(v) => onSetsChange(setIndex, v)}
            suffix={setsSuffix}
            aria-label={isEs ? `Series bloque ${setIndex + 1}` : `Sets block ${setIndex + 1}`}
          />
        </td>
        <td className="wolf-se-spreadsheet-blocks__reps">
          {isComplex && block.segments?.length ? (
            <div className="wolf-se-spreadsheet-blocks__segment-reps">
              {block.segments.map((_, segIndex) => (
                <SegmentRepField
                  key={segIndex}
                  value={row.segmentReps?.[segIndex] ?? '1'}
                  onChange={(v) => onSegmentRepChange(setIndex, segIndex, v)}
                  suffix={REPS_SUFFIX}
                  aria-label={
                    isEs
                      ? `Reps segmento ${segIndex + 1} bloque ${setIndex + 1}`
                      : `Segment ${segIndex + 1} reps block ${setIndex + 1}`
                  }
                />
              ))}
            </div>
          ) : (
            <ComboPresetField
              variant="premium"
              value={row.reps}
              options={spreadsheetRepsOptions(row.reps)}
              onChange={(v) => onRepsChange(setIndex, v)}
              suffix={REPS_SUFFIX}
              aria-label={isEs ? `Reps bloque ${setIndex + 1}` : `Reps block ${setIndex + 1}`}
            />
          )}
        </td>
        <td className="wolf-se-spreadsheet-blocks__rest">
          <ComboPresetField
            variant="premium"
            value={row.restSec ?? DEFAULT_REST_SEC}
            options={restPresetOptions}
            onChange={(v) => onRestChange(setIndex, v)}
            className="wolf-se-combo-preset--rest"
            aria-label={isEs ? `Descanso bloque ${setIndex + 1}` : `Rest block ${setIndex + 1}`}
          />
        </td>
        <td className="wolf-se-spreadsheet-blocks__vol">
          {vol > 0 ? `${vol.toLocaleString()} kg` : '—'}
        </td>
        <td>
          <div className="wolf-se-spreadsheet__row-actions">
            <button
              type="button"
              className="wolf-se-spreadsheet__icon-btn"
              title={isEs ? 'Duplicar bloque' : 'Duplicate block'}
              disabled={block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
              onClick={() => onDuplicateSet(setIndex)}
            >
              <Copy size={14} aria-hidden />
            </button>
            <button
              type="button"
              className="wolf-se-spreadsheet__icon-btn wolf-se-spreadsheet__icon-btn--danger"
              title={isEs ? 'Eliminar bloque' : 'Remove block'}
              disabled={block.sets.length <= 1}
              onClick={() => onRemoveSet(setIndex)}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        </td>
      </>
    );
  };

  return (
    <div className={`wolf-se-spreadsheet-blocks${canReorder ? ' wolf-se-spreadsheet-blocks--sortable' : ''}`}>
      <p className="wolf-se-spreadsheet-blocks__title">
        {isEs ? 'Prescripción por bloque' : 'Per-block prescription'}
      </p>
      <div className="wolf-se-spreadsheet-blocks__table-wrap">
        <table className="wolf-se-spreadsheet-blocks__table">
          <colgroup>
            <col className="wolf-se-spreadsheet-blocks__col-idx" />
            <col className="wolf-se-spreadsheet-blocks__col-purpose" />
            <col className="wolf-se-spreadsheet-blocks__col-pct" />
            <col className="wolf-se-spreadsheet-blocks__col-sets" />
            <col className="wolf-se-spreadsheet-blocks__col-reps" />
            <col className="wolf-se-spreadsheet-blocks__col-rest" />
            <col className="wolf-se-spreadsheet-blocks__col-vol" />
            <col className="wolf-se-spreadsheet-blocks__col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th className="wolf-se-spreadsheet-blocks__th-idx">{isEs ? 'Bloque' : 'Block'}</th>
              <th className="wolf-se-spreadsheet-blocks__th-purpose">{isEs ? 'Propósito' : 'Purpose'}</th>
              <th className="wolf-se-spreadsheet-blocks__th-pct">{isEs ? 'Intensidad' : 'Intensity'}</th>
              <th className="wolf-se-spreadsheet-blocks__th-sets">
                <span className="wolf-se-spreadsheet__th-stack">
                  <span className="wolf-se-spreadsheet__th-primary">{isEs ? 'Series' : 'Sets'}</span>
                </span>
              </th>
              <th className="wolf-se-spreadsheet-blocks__th-reps">
                <span className="wolf-se-spreadsheet__th-stack">
                  <span className="wolf-se-spreadsheet__th-primary">Reps</span>
                </span>
              </th>
              <th className="wolf-se-spreadsheet-blocks__th-rest">
                <span className="wolf-se-spreadsheet__th-stack">
                  <span className="wolf-se-spreadsheet__th-primary">{isEs ? 'Descanso' : 'Rest'}</span>
                </span>
              </th>
              <th className="wolf-se-spreadsheet-blocks__th-vol">
                <span className="wolf-se-spreadsheet__th-stack">
                  <span className="wolf-se-spreadsheet__th-primary">{isEs ? 'Volumen' : 'Volume'}</span>
                  <span className="wolf-se-spreadsheet__th-secondary">kg</span>
                </span>
              </th>
              <th className="wolf-se-spreadsheet-blocks__th-actions" aria-hidden />
            </tr>
          </thead>
          {canReorder ? (
            <Reorder.Group
              as="tbody"
              axis="y"
              values={setRows}
              onReorder={handleReorder}
              className="wolf-se-spreadsheet-blocks__tbody--sortable"
            >
              {setRows.map((sortableRow, setIndex) => (
                <SpreadsheetSortableSetTr
                  key={sortableRow.id}
                  sortableRow={sortableRow}
                  isEs={isEs}
                  canReorder
                >
                  {({ dragGrip }) => renderSetRow(sortableRow.scheme, setIndex, dragGrip)}
                </SpreadsheetSortableSetTr>
              ))}
            </Reorder.Group>
          ) : (
            <tbody>
              {block.sets.map((row, setIndex) => (
                <SpreadsheetSortableSetTr
                  key={setIndex}
                  sortableRow={{ id: `static-${setIndex}`, scheme: row }}
                  isEs={isEs}
                  canReorder={false}
                >
                  {({ dragGrip }) => renderSetRow(row, setIndex, dragGrip)}
                </SpreadsheetSortableSetTr>
              ))}
            </tbody>
          )}
        </table>
      </div>
      <button
        type="button"
        className="wolf-se-spreadsheet-blocks__add"
        disabled={block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
        onClick={onAddSet}
      >
        <Plus size={14} aria-hidden />
        {isEs ? 'Agregar bloque' : 'Add block'}
      </button>
    </div>
  );
};
