import React from 'react';
import { Clock, Copy, GripVertical, Info, ListOrdered, Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock, SetScheme } from '../../models/training';
import { normalizeBlockType, WL_PCT_MAX, WL_PCT_MIN } from '../../services/trainingEngine';
import { WL_SESSION_LIMITS } from '../../services/sessionMutations';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { MobileSetList } from '../mobile-wl/cards/MobileSetList';
import { CompactNumberField } from './CompactNumberField';
import { ComboNumberField } from './ComboNumberField';
import { SegmentRepField } from './SegmentRepField';
import {
  blockAvgIntensity,
  blockTotalReps,
  blockTotalSets,
  blockTonnage,
  exerciseName,
  kgForExercise,
} from './blockMetrics';
import { SectionHeader } from './SectionHeader';
import {
  DEFAULT_REST_SEC,
  DEFAULT_TARGET_RIR,
  formatRestSec,
} from './setSchemeUtils';
import './set-rows.css';

const PCT_PRESETS_LIST = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 120] as const;
const REP_PRESETS_LIST = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20] as const;
const SETS_PRESETS_LIST = [1, 2, 3, 4, 5, 6, 8, 10] as const;
const PCT_BUTTON_STEP = 5;
const RIR_OPTIONS = [0, 1, 2, 3, 4, 5] as const;
const REST_PRESETS_SEC = [90, 120, 150, 180, 210, 240] as const;

interface SetsTableProps {
  block: SessionExerciseBlock;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  layout?: 'default' | 'embedded';
  onPctChange: (setIndex: number, pct: number) => void;
  onRepsChange: (setIndex: number, reps: number) => void;
  onSetsChange: (setIndex: number, sets: number) => void;
  onRirChange: (setIndex: number, rir: number) => void;
  onRestChange: (setIndex: number, restSec: number) => void;
  onSegmentRepChange: (setIndex: number, segIndex: number, value: string) => void;
  onAddSet: () => void;
  onDuplicateSet: (setIndex: number) => void;
  onRemoveSet: (setIndex: number) => void;
}

function PremiumSetsSummary({
  block,
  athlete,
  exercises,
  isEs,
}: {
  block: SessionExerciseBlock;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
}) {
  const tonnage = blockTonnage(block, athlete, exercises);
  const totalSets = blockTotalSets(block);
  const totalReps = blockTotalReps(block);
  const avgPct = blockAvgIntensity(block);

  return (
    <div className="wolf-se-sets-premium__summary">
      <div className="wolf-se-sets-premium__stat">
        <span className="wolf-se-sets-premium__stat-label">{isEs ? 'Volumen total' : 'Total volume'}</span>
        <strong className="wolf-se-sets-premium__stat-value">{tonnage} kg</strong>
      </div>
      <div className="wolf-se-sets-premium__stat">
        <span className="wolf-se-sets-premium__stat-label">{isEs ? 'Series totales' : 'Total sets'}</span>
        <strong className="wolf-se-sets-premium__stat-value">{totalSets}</strong>
      </div>
      <div className="wolf-se-sets-premium__stat">
        <span className="wolf-se-sets-premium__stat-label">{isEs ? 'Reps totales' : 'Total reps'}</span>
        <strong className="wolf-se-sets-premium__stat-value">{totalReps}</strong>
      </div>
      <div className="wolf-se-sets-premium__stat wolf-se-sets-premium__stat--accent">
        <span className="wolf-se-sets-premium__stat-label">{isEs ? 'Intensidad prom.' : 'Avg intensity'}</span>
        <strong className="wolf-se-sets-premium__stat-value">{avgPct}% 1RM</strong>
      </div>
    </div>
  );
}

interface PremiumSetMobileCardProps {
  setIndex: number;
  row: SetScheme;
  kg: string | number;
  isEs: boolean;
  canRemove: boolean;
  onPctChange: (value: number) => void;
  onRepsChange: (value: number) => void;
  onRirChange: (value: number) => void;
  onRestChange: (value: number) => void;
  onRemove: () => void;
}

function PremiumSetMobileCard({
  setIndex,
  row,
  kg,
  isEs,
  canRemove,
  onPctChange,
  onRepsChange,
  onRirChange,
  onRestChange,
  onRemove,
}: PremiumSetMobileCardProps) {
  const rir = row.targetRir ?? DEFAULT_TARGET_RIR;
  const restSec = row.restSec ?? DEFAULT_REST_SEC;
  const si = setIndex;

  return (
    <article className="wolf-se-premium-set-card">
      <div className="wolf-se-premium-set-card__head">
        <span className="wolf-se-sets-premium__serie-badge">{si + 1}</span>
        <span className="wolf-se-premium-set-card__load">
          <strong>{kg}</strong> kg
        </span>
        <button
          type="button"
          className="wolf-se-sets-premium__delete"
          disabled={!canRemove}
          aria-label={isEs ? `Eliminar serie ${si + 1}` : `Remove set ${si + 1}`}
          onClick={onRemove}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="wolf-se-premium-set-card__grid">
        <div className="wolf-se-premium-set-card__field">
          <span className="wolf-se-premium-set-card__label">% 1RM</span>
          <ComboNumberField
            variant="premium"
            value={row.percentage}
            min={WL_PCT_MIN}
            max={WL_PCT_MAX}
            step={5}
            options={[...PCT_PRESETS_LIST]}
            onChange={onPctChange}
            aria-label={isEs ? `Porcentaje serie ${si + 1}` : `Percent set ${si + 1}`}
          />
        </div>
        <div className="wolf-se-premium-set-card__field">
          <span className="wolf-se-premium-set-card__label">{isEs ? 'Reps' : 'Reps'}</span>
          <ComboNumberField
            variant="premium"
            value={row.reps}
            min={WL_SESSION_LIMITS.MIN_REPS_PER_SET}
            max={WL_SESSION_LIMITS.MAX_REPS_PER_SET}
            step={1}
            options={[...REP_PRESETS_LIST]}
            onChange={onRepsChange}
            aria-label={isEs ? `Reps serie ${si + 1}` : `Reps set ${si + 1}`}
          />
        </div>
        <div className="wolf-se-premium-set-card__field">
          <span className="wolf-se-premium-set-card__label">{isEs ? 'RIR obj.' : 'Target RIR'}</span>
          <select
            className="wolf-se-sets-premium__select"
            value={rir}
            aria-label={isEs ? `RIR serie ${si + 1}` : `RIR set ${si + 1}`}
            onChange={(e) => onRirChange(Number(e.target.value))}
          >
            {RIR_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="wolf-se-premium-set-card__field">
          <span className="wolf-se-premium-set-card__label">{isEs ? 'Descanso' : 'Rest'}</span>
          <label className="wolf-se-sets-premium__rest wolf-se-premium-set-card__rest">
            <Clock size={14} aria-hidden />
            <select
              className="wolf-se-sets-premium__select wolf-se-sets-premium__select--rest"
              value={restSec}
              aria-label={isEs ? `Descanso serie ${si + 1}` : `Rest set ${si + 1}`}
              onChange={(e) => onRestChange(Number(e.target.value))}
            >
              {REST_PRESETS_SEC.map((sec) => (
                <option key={sec} value={sec}>
                  {formatRestSec(sec)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </article>
  );
}

export const SetsTable: React.FC<SetsTableProps> = ({
  block,
  athlete,
  exercises,
  isEs,
  layout = 'default',
  onPctChange,
  onRepsChange,
  onSetsChange,
  onRirChange,
  onRestChange,
  onSegmentRepChange,
  onAddSet,
  onDuplicateSet,
  onRemoveSet,
}) => {
  const isPhone = useMediaQuery('(max-width: 767px)');
  const isTightViewport = useMediaQuery('(max-width: 1100px)');
  const isPremiumMobile = useMediaQuery('(max-width: 899px)');
  const useInlineCards = layout !== 'embedded' && isTightViewport;
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

  const premiumAddBtn = (
    <button
      type="button"
      className="wolf-se-sets-premium__add"
      disabled={block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
      onClick={onAddSet}
    >
      <Plus size={15} strokeWidth={2.25} aria-hidden />
      {isEs ? 'Agregar serie' : 'Add set'}
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
    const sectionClass = `wolf-se-sets-section${layout === 'embedded' ? ' wolf-se-sets-section--embedded' : ''}${useInlineCards ? ' wolf-se-sets-section--inline-cards' : ''}`;

    if (layout === 'embedded') {
      return (
        <section className={`${sectionClass} wolf-se-sets-section--premium`} onKeyDown={onEnter}>
          <div className="wolf-se-sets-premium__head">
            <h4 className="wolf-se-sets-premium__title">
              <ListOrdered size={16} strokeWidth={2.25} aria-hidden />
              {isEs ? 'Esquema de series' : 'Set scheme'}
            </h4>
            {premiumAddBtn}
          </div>

          {isPremiumMobile ? (
            <div className="wolf-se-sets-premium__cards">
              {block.sets.map((row, si) => {
                const kg = ex ? kgForExercise(athlete, ex, row.percentage) : '—';
                return (
                  <PremiumSetMobileCard
                    key={si}
                    setIndex={si}
                    row={row}
                    kg={kg}
                    isEs={isEs}
                    canRemove={block.sets.length > 1}
                    onPctChange={(v) => onPctChange(si, v)}
                    onRepsChange={(v) => onRepsChange(si, v)}
                    onRirChange={(v) => onRirChange(si, v)}
                    onRestChange={(v) => onRestChange(si, v)}
                    onRemove={() => onRemoveSet(si)}
                  />
                );
              })}
            </div>
          ) : (
          <div className="wolf-se-sets-premium__table-wrap">
            <table className="wolf-se-sets-premium__table">
              <thead>
                <tr>
                  <th className="wolf-se-sets-premium__col-grip" aria-hidden />
                  <th>{isEs ? 'Serie' : 'Set'}</th>
                  <th>% 1RM</th>
                  <th>{isEs ? 'Carga' : 'Load'}</th>
                  <th>{isEs ? 'Reps' : 'Reps'}</th>
                  <th>
                    <span className="wolf-se-sets-premium__th-label">
                      {isEs ? 'RIR obj.' : 'Target RIR'}
                      <Info size={12} aria-hidden />
                    </span>
                  </th>
                  <th>{isEs ? 'Descanso' : 'Rest'}</th>
                  <th className="wolf-se-sets-premium__col-actions" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {block.sets.map((row, si) => {
                  const kg = ex ? kgForExercise(athlete, ex, row.percentage) : '—';
                  const rir = row.targetRir ?? DEFAULT_TARGET_RIR;
                  const restSec = row.restSec ?? DEFAULT_REST_SEC;
                  return (
                    <tr key={si}>
                      <td className="wolf-se-sets-premium__col-grip">
                        <span className="wolf-se-sets-premium__grip" aria-hidden>
                          <GripVertical size={14} />
                        </span>
                      </td>
                      <td>
                        <span className="wolf-se-sets-premium__serie-badge">{si + 1}</span>
                      </td>
                      <td className="wolf-se-sets-premium__col-pct">
                        <ComboNumberField
                          variant="premium"
                          value={row.percentage}
                          min={WL_PCT_MIN}
                          max={WL_PCT_MAX}
                          step={5}
                          options={[...PCT_PRESETS_LIST]}
                          onChange={(v) => onPctChange(si, v)}
                          aria-label={isEs ? `Porcentaje serie ${si + 1}` : `Percent set ${si + 1}`}
                        />
                      </td>
                      <td>
                        <span className="wolf-se-sets-premium__load">{kg} kg</span>
                      </td>
                      <td className="wolf-se-sets-premium__col-reps">
                        <ComboNumberField
                          variant="premium"
                          value={row.reps}
                          min={WL_SESSION_LIMITS.MIN_REPS_PER_SET}
                          max={WL_SESSION_LIMITS.MAX_REPS_PER_SET}
                          step={1}
                          options={[...REP_PRESETS_LIST]}
                          onChange={(v) => onRepsChange(si, v)}
                          aria-label={isEs ? `Reps serie ${si + 1}` : `Reps set ${si + 1}`}
                        />
                      </td>
                      <td className="wolf-se-sets-premium__col-rir">
                        <select
                          className="wolf-se-sets-premium__select"
                          value={rir}
                          aria-label={isEs ? `RIR serie ${si + 1}` : `RIR set ${si + 1}`}
                          onChange={(e) => onRirChange(si, Number(e.target.value))}
                        >
                          {RIR_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <label className="wolf-se-sets-premium__rest">
                          <Clock size={14} aria-hidden />
                          <select
                            className="wolf-se-sets-premium__select wolf-se-sets-premium__select--rest"
                            value={restSec}
                            aria-label={isEs ? `Descanso serie ${si + 1}` : `Rest set ${si + 1}`}
                            onChange={(e) => onRestChange(si, Number(e.target.value))}
                          >
                            {REST_PRESETS_SEC.map((sec) => (
                              <option key={sec} value={sec}>
                                {formatRestSec(sec)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </td>
                      <td className="wolf-se-sets-premium__col-actions">
                        <button
                          type="button"
                          className="wolf-se-sets-premium__delete"
                          disabled={block.sets.length <= 1}
                          aria-label={isEs ? `Eliminar serie ${si + 1}` : `Remove set ${si + 1}`}
                          onClick={() => onRemoveSet(si)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          <PremiumSetsSummary block={block} athlete={athlete} exercises={exercises} isEs={isEs} />
        </section>
      );
    }

    if (isPhone) {
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

    if (useInlineCards) {
      return (
        <section className={sectionClass} onKeyDown={onEnter}>
          <SectionHeader icon={ListOrdered} title={isEs ? 'Esquema de series' : 'Set scheme'} action={addBtn} />
          <div className="wolf-se-sets-mobile wolf-se-sets-mobile--visible">
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
                    <div className="wolf-se-field-chip" role="group" aria-label={isEs ? `Porcentaje serie ${si + 1}` : `Percent set ${si + 1}`}>
                      <span className="wolf-se-field-chip-label">%1RM</span>
                      <CompactNumberField
                        size="compact"
                        value={row.percentage}
                        min={WL_PCT_MIN}
                        max={WL_PCT_MAX}
                        step={PCT_BUTTON_STEP}
                        suffix="%"
                        onChange={(v) => onPctChange(si, v)}
                        aria-label={isEs ? `Porcentaje serie ${si + 1}` : `Percent set ${si + 1}`}
                      />
                    </div>
                    <div className="wolf-se-field-chip" role="group" aria-label={isEs ? `Reps serie ${si + 1}` : `Reps set ${si + 1}`}>
                      <span className="wolf-se-field-chip-label">{isEs ? 'Reps' : 'Reps'}</span>
                      <CompactNumberField
                        size="compact"
                        value={row.reps}
                        min={WL_SESSION_LIMITS.MIN_REPS_PER_SET}
                        max={WL_SESSION_LIMITS.MAX_REPS_PER_SET}
                        step={1}
                        onChange={(v) => onRepsChange(si, v)}
                        aria-label={isEs ? `Reps serie ${si + 1}` : `Reps set ${si + 1}`}
                      />
                    </div>
                    <div className="wolf-se-field-chip" role="group" aria-label={isEs ? `Series fila ${si + 1}` : `Sets row ${si + 1}`}>
                      <span className="wolf-se-field-chip-label">{isEs ? 'Series' : 'Sets'}</span>
                      <CompactNumberField
                        size="compact"
                        value={row.sets}
                        min={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
                        max={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
                        step={1}
                        onChange={(v) => onSetsChange(si, v)}
                        aria-label={isEs ? `Series fila ${si + 1}` : `Sets row ${si + 1}`}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      );
    }

    return (
      <section className={sectionClass} onKeyDown={onEnter}>
        <SectionHeader icon={ListOrdered} title={isEs ? 'Esquema de series' : 'Set scheme'} action={addBtn} />

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
                        size="compact"
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
                        size="compact"
                        value={row.reps}
                        min={WL_SESSION_LIMITS.MIN_REPS_PER_SET}
                        max={WL_SESSION_LIMITS.MAX_REPS_PER_SET}
                        step={1}
                        onChange={(v) => onRepsChange(si, v)}
                        aria-label={`Reps ${si + 1}`}
                      />
                    </td>
                    <td>
                      <CompactNumberField
                        size="compact"
                        value={row.sets}
                        min={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
                        max={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
                        step={1}
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
                <div className="wolf-se-field-chip wolf-se-field-chip--inline wolf-se-field-chip--combo" role="group">
                  <span className="wolf-se-field-chip-label">%1RM</span>
                  <ComboNumberField
                    variant="premium"
                    value={row.percentage}
                    min={WL_PCT_MIN}
                    max={WL_PCT_MAX}
                    step={5}
                    options={[...PCT_PRESETS_LIST]}
                    onChange={(v) => onPctChange(si, v)}
                    aria-label={isEs ? `Porcentaje serie ${si + 1}` : `Percent set ${si + 1}`}
                  />
                </div>
                <div className="wolf-se-field-chip wolf-se-field-chip--inline wolf-se-field-chip--combo" role="group">
                  <span className="wolf-se-field-chip-label">{isEs ? 'Series' : 'Sets'}</span>
                  <ComboNumberField
                    variant="premium"
                    value={row.sets}
                    min={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
                    max={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
                    step={1}
                    options={[...SETS_PRESETS_LIST]}
                    onChange={(v) => onSetsChange(si, v)}
                    aria-label={isEs ? `Series fila ${si + 1}` : `Sets row ${si + 1}`}
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
                        <SegmentRepField
                          value={row.segmentReps?.[segIdx] ?? '1'}
                          onChange={(v) => onSegmentRepChange(si, segIdx, v)}
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
    </section>
  );
};
