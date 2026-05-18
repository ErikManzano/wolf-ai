import React from 'react';
import { Copy, ListOrdered, Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';
import { WL_SESSION_LIMITS } from '../../services/sessionMutations';
import { CompactNumberField } from './CompactNumberField';
import { exerciseName, kgForExercise } from './blockMetrics';
import { SectionHeader } from './SectionHeader';

interface SetsTableProps {
  block: SessionExerciseBlock;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  onPctChange: (setIndex: number, pct: number) => void;
  onRepsChange: (setIndex: number, reps: number) => void;
  onSetsChange: (setIndex: number, sets: number) => void;
  onSegmentRepChange: (setIndex: number, segIndex: number, value: string) => void;
  onAddSet: () => void;
  onDuplicateSet: (setIndex: number) => void;
  onRemoveSet: (setIndex: number) => void;
}

export const SetsTable: React.FC<SetsTableProps> = ({
  block,
  athlete,
  exercises,
  isEs,
  onPctChange,
  onRepsChange,
  onSetsChange,
  onSegmentRepChange,
  onAddSet,
  onDuplicateSet,
  onRemoveSet,
}) => {
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const segments = block.segments ?? [];

  const addBtn = (
    <button
      type="button"
      className="wolf-se-btn wolf-se-btn--primary wolf-se-btn--sm"
      disabled={block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
      onClick={onAddSet}
    >
      <Plus size={14} className="me-1" />
      {isEs ? 'Serie' : 'Set'}
    </button>
  );

  const rowActions = (si: number) => (
    <div className="wolf-se-row-actions">
      <button
        type="button"
        className="wolf-se-btn wolf-se-btn--ghost wolf-se-btn--sm"
        title={isEs ? 'Duplicar' : 'Duplicate'}
        disabled={block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
        onClick={() => onDuplicateSet(si)}
      >
        <Copy size={15} />
      </button>
      <button
        type="button"
        className="wolf-se-btn wolf-se-btn--ghost wolf-se-btn--sm wolf-se-btn--danger"
        disabled={block.sets.length <= 1}
        onClick={() => onRemoveSet(si)}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (block.sets.length < WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK) onAddSet();
    }
  };

  if (!isComplex) {
    return (
      <section className="wolf-se-section" onKeyDown={onEnter}>
        <SectionHeader icon={ListOrdered} title={isEs ? 'Esquema de series' : 'Set scheme'} action={addBtn} />

        <div className="wolf-se-table-shell">
          <table className="wolf-se-table">
            <thead>
              <tr>
                <th className="wolf-se-col-idx">#</th>
                <th>%1RM</th>
                <th>Kg</th>
                <th>Reps</th>
                <th>{isEs ? 'Series' : 'Sets'}</th>
                <th className="text-end" />
              </tr>
            </thead>
            <tbody>
              {block.sets.map((row, si) => {
                const ex = exercises.find((e) => e.id === block.exerciseId);
                const kg = ex ? kgForExercise(athlete, ex, row.percentage) : '—';
                return (
                  <tr key={si} className="wolf-se-table-row">
                    <td>
                      <span className="wolf-se-row-badge">{si + 1}</span>
                    </td>
                    <td>
                      <CompactNumberField value={row.percentage} min={40} max={100} onChange={(v) => onPctChange(si, v)} aria-label={`% ${si + 1}`} />
                    </td>
                    <td>
                      <span className="wolf-se-kg-display">{kg}</span>
                    </td>
                    <td>
                      <CompactNumberField
                        value={row.reps}
                        min={WL_SESSION_LIMITS.MIN_REPS_PER_SET}
                        max={WL_SESSION_LIMITS.MAX_REPS_PER_SET}
                        onChange={(v) => onRepsChange(si, v)}
                        aria-label={`Reps ${si + 1}`}
                      />
                    </td>
                    <td>
                      <CompactNumberField
                        value={row.sets}
                        min={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
                        max={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
                        onChange={(v) => onSetsChange(si, v)}
                        aria-label={`Sets ${si + 1}`}
                      />
                    </td>
                    <td className="wolf-se-text-end">{rowActions(si)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="wolf-se-hint mb-0 mt-2">{isEs ? 'Enter · nueva serie' : 'Enter · new set'}</p>
      </section>
    );
  }

  return (
    <section className="wolf-se-section">
      <SectionHeader icon={ListOrdered} title={isEs ? 'Series del complejo' : 'Complex sets'} action={addBtn} />

      <div className="wolf-se-complex-sets">
        {block.sets.map((row, si) => (
          <div key={si} className="wolf-se-complex-set-card" onKeyDown={onEnter}>
            <div className="wolf-se-complex-set-head">
              <span className="wolf-se-row-badge wolf-se-row-badge--lg">{si + 1}</span>
              <div className="wolf-se-complex-set-fields">
                <div className="wolf-se-inline-field">
                  <span className="wolf-se-inline-label">%1RM</span>
                  <CompactNumberField value={row.percentage} min={40} max={100} onChange={(v) => onPctChange(si, v)} aria-label={`% ${si + 1}`} />
                </div>
                <div className="wolf-se-inline-field">
                  <span className="wolf-se-inline-label">{isEs ? 'Series' : 'Sets'}</span>
                  <CompactNumberField
                    value={row.sets}
                    min={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
                    max={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
                    onChange={(v) => onSetsChange(si, v)}
                    aria-label={`Sets ${si + 1}`}
                  />
                </div>
              </div>
              {rowActions(si)}
            </div>

            <div className="wolf-se-movement-grid">
              {segments.map((seg, segIdx) => {
                const ex = exercises.find((e) => e.id === seg.exerciseId);
                const kg = ex ? kgForExercise(athlete, ex, row.percentage) : '—';
                return (
                  <div key={segIdx} className="wolf-se-movement-cell">
                    <span className="wolf-se-movement-name">{exerciseName(exercises, seg.exerciseId)}</span>
                    <div className="wolf-se-movement-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="wolf-se-rep-input"
                        value={row.segmentReps?.[segIdx] ?? '1'}
                        onChange={(e) => onSegmentRepChange(si, segIdx, e.target.value)}
                        aria-label={`Reps ${exerciseName(exercises, seg.exerciseId)}`}
                      />
                      <span className="wolf-se-kg-display wolf-se-kg-display--sm">{kg} kg</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
