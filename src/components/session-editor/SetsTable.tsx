import React from 'react';
import { Copy, ListOrdered, Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock } from '../../models/training';
import { normalizeBlockType, WL_PCT_MAX, WL_PCT_MIN } from '../../services/trainingEngine';
import { WL_SESSION_LIMITS } from '../../services/sessionMutations';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { MobileSetList } from '../mobile-wl/cards/MobileSetList';
import { CompactNumberField } from './CompactNumberField';
import { exerciseName, kgForExercise } from './blockMetrics';
import { SectionHeader } from './SectionHeader';
import './set-rows.css';

/** Incremento de %1RM con botones −/+ (entrada manual: enteros 40–120). */
const PCT_BUTTON_STEP = 5;

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
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const segments = block.segments ?? [];

  const addBtn = (
    <button
      type="button"
      className="wolf-se-btn wolf-se-btn--primary wolf-se-btn--sm"
      disabled={block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
      onClick={onAddSet}
    >
      <Plus size={14} aria-hidden />
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
    const ex = exercises.find((e) => e.id === block.exerciseId);

    if (isMobile) {
      return (
        <MobileSetList
          block={block}
          athlete={athlete}
          exercises={exercises}
          isEs={isEs}
          onPctChange={onPctChange}
          onRepsChange={onRepsChange}
          onSetsChange={onSetsChange}
          onAddSet={onAddSet}
          onDuplicateSet={onDuplicateSet}
          onRemoveSet={onRemoveSet}
        />
      );
    }

    return (
      <section className="wolf-se-sets-section" onKeyDown={onEnter}>
        <SectionHeader icon={ListOrdered} title={isEs ? 'Esquema de series' : 'Set scheme'} action={addBtn} />

        {/* Móvil / tablet estrecha: tarjetas compactas */}
        <div className="wolf-se-sets-mobile">
          {block.sets.map((row, si) => {
            const kg = ex ? kgForExercise(athlete, ex, row.percentage) : '—';
            return (
              <article key={si} className="wolf-se-set-card">
                <div className="wolf-se-set-card-top">
                  <span className="wolf-se-row-badge wolf-se-row-badge--lg">{si + 1}</span>
                  <span className="wolf-se-set-card-kg">
                    <strong>{kg}</strong> kg
                  </span>
                  {rowActions(si)}
                </div>
                <div className="wolf-se-set-card-fields">
                  <div
                    className="wolf-se-field-chip"
                    role="group"
                    aria-label={isEs ? `Porcentaje serie ${si + 1}` : `Percent set ${si + 1}`}
                  >
                    <span className="wolf-se-field-chip-label">%1RM</span>
                    <CompactNumberField
                      value={row.percentage}
                      min={WL_PCT_MIN}
                      max={WL_PCT_MAX}
                      step={PCT_BUTTON_STEP}
                      suffix="%"
                      onChange={(v) => onPctChange(si, v)}
                      aria-label={isEs ? `Porcentaje serie ${si + 1}` : `Percent set ${si + 1}`}
                    />
                  </div>
                  <div
                    className="wolf-se-field-chip"
                    role="group"
                    aria-label={isEs ? `Reps serie ${si + 1}` : `Reps set ${si + 1}`}
                  >
                    <span className="wolf-se-field-chip-label">{isEs ? 'Reps' : 'Reps'}</span>
                    <CompactNumberField
                      value={row.reps}
                      min={WL_SESSION_LIMITS.MIN_REPS_PER_SET}
                      max={WL_SESSION_LIMITS.MAX_REPS_PER_SET}
                      onChange={(v) => onRepsChange(si, v)}
                      aria-label={isEs ? `Reps serie ${si + 1}` : `Reps set ${si + 1}`}
                    />
                  </div>
                  <div
                    className="wolf-se-field-chip"
                    role="group"
                    aria-label={isEs ? `Series fila ${si + 1}` : `Sets row ${si + 1}`}
                  >
                    <span className="wolf-se-field-chip-label">{isEs ? 'Series' : 'Sets'}</span>
                    <CompactNumberField
                      value={row.sets}
                      min={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
                      max={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
                      onChange={(v) => onSetsChange(si, v)}
                      aria-label={isEs ? `Series fila ${si + 1}` : `Sets row ${si + 1}`}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Desktop: tabla */}
        <div className="wolf-se-sets-desktop wolf-se-table-shell">
          <table className="wolf-se-table">
            <thead>
              <tr>
                <th className="wolf-se-col-idx">#</th>
                <th>%1RM</th>
                <th>Kg</th>
                <th>Reps</th>
                <th>{isEs ? 'Series' : 'Sets'}</th>
                <th className="wolf-se-text-end" />
              </tr>
            </thead>
            <tbody>
              {block.sets.map((row, si) => {
                const kg = ex ? kgForExercise(athlete, ex, row.percentage) : '—';
                return (
                  <tr key={si} className="wolf-se-table-row">
                    <td>
                      <span className="wolf-se-row-badge">{si + 1}</span>
                    </td>
                    <td>
                      <CompactNumberField
                        value={row.percentage}
                        min={WL_PCT_MIN}
                        max={WL_PCT_MAX}
                        step={PCT_BUTTON_STEP}
                        suffix="%"
                        onChange={(v) => onPctChange(si, v)}
                        aria-label={`% ${si + 1}`}
                      />
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

        <p className="wolf-se-sets-hint">{isEs ? 'Enter · nueva serie' : 'Enter · new set row'}</p>
      </section>
    );
  }

  return (
    <section className="wolf-se-sets-section">
      <SectionHeader icon={ListOrdered} title={isEs ? 'Series del complejo' : 'Complex sets'} action={addBtn} />

      <div className="wolf-se-complex-sets">
        {block.sets.map((row, si) => (
          <article key={si} className="wolf-se-complex-set-card" onKeyDown={onEnter}>
            <div className="wolf-se-complex-set-head">
              <span className="wolf-se-row-badge wolf-se-row-badge--lg">{si + 1}</span>
              <div className="wolf-se-complex-set-fields">
                <div className="wolf-se-field-chip wolf-se-field-chip--inline" role="group">
                  <span className="wolf-se-field-chip-label">%1RM</span>
                  <CompactNumberField
                    value={row.percentage}
                    min={WL_PCT_MIN}
                    max={WL_PCT_MAX}
                    step={PCT_BUTTON_STEP}
                    suffix="%"
                    onChange={(v) => onPctChange(si, v)}
                    aria-label={`% ${si + 1}`}
                  />
                </div>
                <div className="wolf-se-field-chip wolf-se-field-chip--inline" role="group">
                  <span className="wolf-se-field-chip-label">{isEs ? 'Series' : 'Sets'}</span>
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
                const exSeg = exercises.find((e) => e.id === seg.exerciseId);
                const kg = exSeg ? kgForExercise(athlete, exSeg, row.percentage) : '—';
                return (
                  <div key={segIdx} className="wolf-se-movement-cell">
                    <span className="wolf-se-movement-name">{exerciseName(exercises, seg.exerciseId)}</span>
                    <div className="wolf-se-movement-row">
                      <label className="wolf-se-rep-field">
                        <span className="wolf-se-field-chip-label">Reps</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="wolf-se-rep-input"
                          value={row.segmentReps?.[segIdx] ?? '1'}
                          placeholder="2+1"
                          onChange={(e) => onSegmentRepChange(si, segIdx, e.target.value)}
                          aria-label={`Reps ${exerciseName(exercises, seg.exerciseId)}`}
                        />
                      </label>
                      <span className="wolf-se-kg-display wolf-se-kg-display--sm">
                        <strong>{kg}</strong> kg
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <p className="wolf-se-sets-hint">{isEs ? 'Enter · nueva serie' : 'Enter · new set row'}</p>
    </section>
  );
};
