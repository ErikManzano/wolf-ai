import React from 'react';
import { Reorder } from 'framer-motion';
import { Copy, Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import type { SessionPickerOption } from '../../services/exercise';
import { WL_SESSION_LIMITS } from '../../services/sessionMutations';
import { complexSetRowTonnage, formatAthleteKg, kgForExercise } from './blockMetrics';
import { ComboPresetField } from './ComboPresetField';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
import { SegmentRepField } from './SegmentRepField';
import { DEFAULT_REST_SEC } from './setSchemeUtils';
import { purposeForScheme, purposeLabel } from './spreadsheetPurposeUtils';
import { spreadsheetRestPresetOptions, spreadsheetSetsOptions } from './spreadsheetSetFieldPresets';
import { SpreadsheetSortableSetTr, useSpreadsheetSetRows } from './spreadsheetSortable';

const PCT_PRESETS = [60, 65, 70, 75, 80, 85, 90, 95, 100].map((n) => ({ value: n, label: `${n}%` }));
const SETS_SUFFIX = { ES: 'series', EN: 'sets' } as const;
const REPS_SUFFIX = 'reps';

export interface SpreadsheetComplexUnifiedPanelProps {
  block: SessionExerciseBlock;
  blockIndex: number;
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  pickerOptions: SessionPickerOption[];
  isEs: boolean;
  onPctChange: (setIndex: number, pct: number) => void;
  onSetsChange: (setIndex: number, sets: number) => void;
  onRestChange: (setIndex: number, restSec: number) => void;
  onSegmentRepChange: (setIndex: number, segIndex: number, value: string) => void;
  onSegmentExerciseChange: (segmentIndex: number, exerciseId: string) => void;
  onAddMovement: () => void;
  onRemoveMovement: (segmentIndex: number) => void;
  onAddSet: () => void;
  onDuplicateSet: (setIndex: number) => void;
  onRemoveSet: (setIndex: number) => void;
  onReorderSets?: (fromIndex: number, toIndex: number) => void;
}

export const SpreadsheetComplexUnifiedPanel: React.FC<SpreadsheetComplexUnifiedPanelProps> = ({
  block,
  athlete,
  exercises,
  pickerOptions,
  isEs,
  onPctChange,
  onSetsChange,
  onRestChange,
  onSegmentRepChange,
  onSegmentExerciseChange,
  onAddMovement,
  onRemoveMovement,
  onAddSet,
  onDuplicateSet,
  onRemoveSet,
  onReorderSets,
}) => {
  const segments = block.segments ?? [];
  const { setRows, handleReorder, canReorder } = useSpreadsheetSetRows(block.sets, onReorderSets);
  const setsSuffix = isEs ? SETS_SUFFIX.ES : SETS_SUFFIX.EN;
  const restPresetOptions = spreadsheetRestPresetOptions(isEs);

  const renderSetRow = (row: (typeof block.sets)[number], setIndex: number, dragGrip: React.ReactNode) => {
    const purpose = purposeForScheme(row);
    const vol = complexSetRowTonnage(block, row, athlete, exercises);
    return (
      <>
        <td className="wolf-se-spreadsheet-blocks__idx">
          <div className="wolf-se-spreadsheet-blocks__idx-cell">
            {dragGrip}
            <span>{setIndex + 1}</span>
          </div>
        </td>
        <td>
          <span
            className={`wolf-se-spreadsheet-purpose wolf-se-spreadsheet-purpose--${purpose}`}
          >
            <span className="wolf-se-spreadsheet-purpose__dot" aria-hidden />
            {purposeLabel(purpose, isEs)}
            <span className="wolf-se-spreadsheet-purpose__pct">({row.percentage}%)</span>
          </span>
        </td>
        <td className="wolf-se-spreadsheet-blocks__pct">
          <ComboPresetField
            variant="premium"
            value={row.percentage}
            options={PCT_PRESETS}
            onChange={(v) => onPctChange(setIndex, v)}
            aria-label={
              isEs ? `Intensidad bloque ${setIndex + 1}` : `Intensity block ${setIndex + 1}`
            }
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
        {segments.map((seg, segIndex) => {
          const ex = exercises.find((e) => e.id === seg.exerciseId);
          const kg = ex ? kgForExercise(athlete, ex, row.percentage) : 0;
          return (
            <React.Fragment key={segIndex}>
              <td className="wolf-se-spreadsheet-blocks__reps wolf-se-spreadsheet-complex-unified__seg-cell">
                <SegmentRepField
                  value={row.segmentReps?.[segIndex] ?? '1'}
                  onChange={(v) => onSegmentRepChange(setIndex, segIndex, v)}
                  suffix={REPS_SUFFIX}
                  aria-label={
                    isEs
                      ? `Reps mov. ${segIndex + 1} bloque ${setIndex + 1}`
                      : `Mov. ${segIndex + 1} reps block ${setIndex + 1}`
                  }
                />
              </td>
              <td className="wolf-se-spreadsheet-blocks__vol wolf-se-spreadsheet-complex-unified__seg-cell wolf-se-spreadsheet-complex-unified__seg-cell--load">
                {ex ? `${formatAthleteKg(kg)} kg` : '—'}
              </td>
            </React.Fragment>
          );
        })}
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
    <div className={`wolf-se-spreadsheet-complex-unified${canReorder ? ' wolf-se-spreadsheet-complex-unified--sortable' : ''}`}>
      <p className="wolf-se-spreadsheet-blocks__title">
        {isEs ? 'Prescripción del complejo' : 'Complex prescription'}
      </p>
      <div className="wolf-se-spreadsheet-blocks__table-wrap wolf-se-spreadsheet-complex-unified__wrap">
        <table className="wolf-se-spreadsheet-blocks__table wolf-se-spreadsheet-complex-unified__table">
          <thead>
            <tr>
              <th rowSpan={2}>{isEs ? 'Bloque' : 'Block'}</th>
              <th rowSpan={2}>{isEs ? 'Propósito' : 'Purpose'}</th>
              <th rowSpan={2}>{isEs ? 'Intensidad' : 'Intensity'}</th>
              <th rowSpan={2}>{isEs ? 'Series' : 'Sets'}</th>
              {segments.map((_, segIndex) => (
                <th
                  key={segIndex}
                  colSpan={2}
                  className="wolf-se-spreadsheet-complex-unified__seg-head"
                >
                  {isEs ? `Mov. ${segIndex + 1}` : `Mov. ${segIndex + 1}`}
                </th>
              ))}
              <th rowSpan={2}>{isEs ? 'Descanso' : 'Rest'}</th>
              <th rowSpan={2}>{isEs ? 'Volumen' : 'Volume'}</th>
              <th rowSpan={2} aria-hidden />
            </tr>
            <tr>
              {segments.map((_, segIndex) => (
                <React.Fragment key={segIndex}>
                  <th className="wolf-se-spreadsheet-complex-unified__sub">{isEs ? 'Reps' : 'Reps'}</th>
                  <th className="wolf-se-spreadsheet-complex-unified__sub wolf-se-spreadsheet-complex-unified__sub--load">
                    {isEs ? 'Carga' : 'Load'}
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="wolf-se-spreadsheet-complex-unified__movement-row">
              <td colSpan={3} className="wolf-se-spreadsheet-complex-unified__movement-label">
                {isEs ? 'Movimientos' : 'Movements'}
              </td>
              <td className="wolf-se-spreadsheet-complex-unified__movement-series" aria-hidden />
              {segments.map((seg, segIndex) => (
                <td
                  key={segIndex}
                  colSpan={2}
                  className="wolf-se-spreadsheet-complex-unified__movement-cell"
                >
                  <div className="wolf-se-spreadsheet-complex-unified__movement-editor">
                    <ExerciseAutocomplete
                      options={pickerOptions}
                      value={seg.exerciseId}
                      isEs={isEs}
                      compact
                      panelMatchCard={false}
                      placeholder={isEs ? 'Movimiento…' : 'Movement…'}
                      onChange={(id) => onSegmentExerciseChange(segIndex, id)}
                    />
                    <button
                      type="button"
                      className="wolf-se-spreadsheet__icon-btn wolf-se-spreadsheet__icon-btn--danger"
                      title={isEs ? 'Quitar movimiento' : 'Remove movement'}
                      disabled={segments.length <= 2}
                      onClick={() => onRemoveMovement(segIndex)}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </div>
                </td>
              ))}
              <td colSpan={3} className="wolf-se-spreadsheet-complex-unified__movement-actions">
                <button
                  type="button"
                  className="wolf-se-spreadsheet-blocks__add"
                  disabled={segments.length >= WL_SESSION_LIMITS.MAX_COMPLEX_SEGMENTS}
                  onClick={onAddMovement}
                >
                  <Plus size={14} aria-hidden />
                  {isEs ? 'Agregar movimiento' : 'Add movement'}
                </button>
              </td>
            </tr>
          </tbody>
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
