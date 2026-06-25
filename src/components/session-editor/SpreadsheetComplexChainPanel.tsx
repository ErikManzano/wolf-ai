import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import type { SessionPickerOption } from '../../services/exercise';
import { formatAthleteKg, kgForExercise } from './blockMetrics';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
import { SegmentRepField } from './SegmentRepField';

export interface SpreadsheetComplexChainPanelProps {
  block: SessionExerciseBlock;
  blockIndex: number;
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  pickerOptions: SessionPickerOption[];
  isEs: boolean;
  onApply: (fn: () => Session) => void;
  onSegmentExerciseChange: (segmentIndex: number, exerciseId: string) => void;
  onSegmentRepChange: (segmentIndex: number, value: string) => void;
  onAddMovement: () => void;
  onRemoveMovement: (segmentIndex: number) => void;
}

export const SpreadsheetComplexChainPanel: React.FC<SpreadsheetComplexChainPanelProps> = ({
  block,
  athlete,
  exercises,
  pickerOptions,
  isEs,
  onSegmentExerciseChange,
  onSegmentRepChange,
  onAddMovement,
  onRemoveMovement,
}) => {
  const segments = block.segments ?? [];
  const refPct = block.sets[0]?.percentage ?? 75;
  const firstRow = block.sets[0];

  return (
    <div className="wolf-se-spreadsheet-chain">
      <p className="wolf-se-spreadsheet-blocks__title">
        {isEs ? 'Cadena del complejo' : 'Complex chain'}
      </p>
      <div className="wolf-se-spreadsheet-blocks__table-wrap">
        <table className="wolf-se-spreadsheet-blocks__table">
          <thead>
            <tr>
              <th>{isEs ? 'Orden' : 'Order'}</th>
              <th>{isEs ? 'Ejercicio (movimiento)' : 'Exercise (movement)'}</th>
              <th>{isEs ? 'Reps' : 'Reps'}</th>
              <th>{isEs ? 'Carga' : 'Load'}</th>
              <th>{isEs ? 'Intensidad' : 'Intensity'}</th>
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {segments.map((seg, segIndex) => {
              const ex = exercises.find((e) => e.id === seg.exerciseId);
              const kg = ex ? kgForExercise(athlete, ex, refPct) : 0;
              const repVal = firstRow?.segmentReps?.[segIndex] ?? '1';
              return (
                <tr key={segIndex}>
                  <td className="wolf-se-spreadsheet-blocks__idx">{segIndex + 1}</td>
                  <td className="wolf-se-spreadsheet-chain__exercise">
                    <ExerciseAutocomplete
                      options={pickerOptions}
                      value={seg.exerciseId}
                      isEs={isEs}
                      compact
                      panelMatchCard={false}
                      placeholder={isEs ? 'Movimiento…' : 'Movement…'}
                      onChange={(id) => onSegmentExerciseChange(segIndex, id)}
                    />
                  </td>
                  <td className="wolf-se-spreadsheet-blocks__reps">
                    <SegmentRepField
                      value={repVal}
                      onChange={(v) => onSegmentRepChange(segIndex, v)}
                      aria-label={
                        isEs ? `Reps movimiento ${segIndex + 1}` : `Movement ${segIndex + 1} reps`
                      }
                    />
                  </td>
                  <td className="wolf-se-spreadsheet-blocks__vol">
                    {ex ? `${formatAthleteKg(kg)} kg` : '—'}
                  </td>
                  <td className="wolf-se-spreadsheet-chain__pct">{refPct}%</td>
                  <td>
                    <button
                      type="button"
                      className="wolf-se-spreadsheet__icon-btn wolf-se-spreadsheet__icon-btn--danger"
                      title={isEs ? 'Quitar movimiento' : 'Remove movement'}
                      disabled={segments.length <= 2}
                      onClick={() => onRemoveMovement(segIndex)}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" className="wolf-se-spreadsheet-blocks__add" onClick={onAddMovement}>
        <Plus size={14} aria-hidden />
        {isEs ? 'Agregar movimiento' : 'Add movement'}
      </button>
      <p className="wolf-se-spreadsheet-chain__hint">
        {isEs
          ? `Carga e intensidad de referencia según el primer bloque de series (${refPct}% 1RM). Ajusta % por bloque abajo.`
          : `Reference load/intensity from the first set block (${refPct}% 1RM). Adjust % per block below.`}
      </p>
    </div>
  );
};
