import React, { useCallback, useEffect, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Clock, ChevronDown, Copy, GripVertical, ListOrdered, Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock, SetScheme } from '../../models/training';
import { normalizeBlockType, WL_PCT_MAX, WL_PCT_MIN } from '../../services/trainingEngine';
import { WL_SESSION_LIMITS } from '../../services/sessionMutations';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { MobileSetList } from '../mobile-wl/cards/MobileSetList';
import { CompactNumberField } from './CompactNumberField';
import { ComboNumberField } from './ComboNumberField';
import { ComboPresetField } from './ComboPresetField';
import { SegmentRepField } from './SegmentRepField';
import {
  blockAvgIntensity,
  blockTotalReps,
  blockTotalSets,
  blockTonnage,
  complexSetRowTotalReps,
  complexSetRowTonnage,
  exerciseName,
  kgForExercise,
} from './blockMetrics';
import { SectionHeader } from './SectionHeader';
import {
  DEFAULT_REST_SEC,
  formatRestSec,
} from './setSchemeUtils';
import './set-rows.css';

const PCT_PRESETS_LIST = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 120] as const;
const REP_PRESETS_LIST = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20] as const;
const SETS_PRESETS_LIST = [1, 2, 3, 4, 5, 6, 8, 10] as const;
const PCT_BUTTON_STEP = 5;
const REST_PRESETS_SEC = [90, 120, 150, 180, 210, 240] as const;
const REST_PRESET_OPTIONS = REST_PRESETS_SEC.map((sec) => ({
  value: sec,
  label: formatRestSec(sec),
}));

const SET_ROW_DRAG_SPRING = { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.82 };

type SortableSetRow = {
  id: string;
  scheme: SetScheme;
};

let nextSetRowId = 0;

function makeSetRowId(): string {
  nextSetRowId += 1;
  return `premium-set-row-${nextSetRowId}`;
}

function rowsFromSchemes(schemes: SetScheme[], prev?: SortableSetRow[]): SortableSetRow[] {
  return schemes.map((scheme, i) => ({
    id: prev?.[i]?.id ?? makeSetRowId(),
    scheme,
  }));
}

function findReorderMove(prev: SortableSetRow[], next: SortableSetRow[]): { from: number; to: number } | null {
  for (let to = 0; to < next.length; to++) {
    const from = prev.findIndex((row) => row.id === next[to]!.id);
    if (from !== to) return { from, to };
  }
  return null;
}

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
  onReorderSets?: (fromIndex: number, toIndex: number) => void;
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

interface PremiumSetRowActionsProps {
  setIndex: number;
  isEs: boolean;
  canDuplicate: boolean;
  canRemove: boolean;
  onDuplicate: () => void;
  onRemove: () => void;
}

function PremiumSetRowActions({
  setIndex,
  isEs,
  canDuplicate,
  canRemove,
  onDuplicate,
  onRemove,
}: PremiumSetRowActionsProps) {
  const si = setIndex;
  return (
    <div className="wolf-se-complex-set-card__actions">
      <button
        type="button"
        className="wolf-se-complex-set-card__action"
        disabled={!canDuplicate}
        title={isEs ? 'Duplicar' : 'Duplicate'}
        aria-label={isEs ? `Duplicar serie ${si + 1}` : `Duplicate set ${si + 1}`}
        onClick={onDuplicate}
      >
        <Copy size={15} />
      </button>
      <button
        type="button"
        className="wolf-se-complex-set-card__action wolf-se-complex-set-card__action--danger"
        disabled={!canRemove}
        aria-label={isEs ? `Eliminar serie ${si + 1}` : `Remove set ${si + 1}`}
        onClick={onRemove}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function SetRowGrip({
  isEs,
  onPointerDown,
  disabled,
  className = '',
}: {
  isEs: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (disabled) {
    return (
      <span className={`wolf-se-sets-premium__grip wolf-se-sets-premium__grip--disabled ${className}`.trim()} aria-hidden>
        <GripVertical size={14} />
      </span>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`wolf-se-sets-premium__grip ${className}`.trim()}
      aria-label={isEs ? 'Arrastrar para reordenar' : 'Drag to reorder'}
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
      }}
    >
      <GripVertical size={14} aria-hidden />
    </div>
  );
}

interface PremiumSetMobileCardProps {
  sortableRow: SortableSetRow;
  setIndex: number;
  kg: string | number;
  isEs: boolean;
  canRemove: boolean;
  canDuplicate: boolean;
  canReorder: boolean;
  onPctChange: (value: number) => void;
  onRepsChange: (value: number) => void;
  onSetsChange: (value: number) => void;
  onRestChange: (value: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function PremiumSetMobileCard({
  sortableRow,
  setIndex,
  kg,
  isEs,
  canRemove,
  canDuplicate,
  canReorder,
  onPctChange,
  onRepsChange,
  onSetsChange,
  onRestChange,
  onDuplicate,
  onRemove,
}: PremiumSetMobileCardProps) {
  const dragControls = useDragControls();
  const row = sortableRow.scheme;
  const restSec = row.restSec ?? DEFAULT_REST_SEC;
  const si = setIndex;

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragControls.start(event);
    },
    [dragControls],
  );

  const cardBody = (
    <>
      <div className="wolf-se-premium-set-card__head">
        {canReorder ? (
          <SetRowGrip isEs={isEs} className="wolf-se-sets-premium__grip--card" onPointerDown={startDrag} />
        ) : null}
        <span className="wolf-se-sets-premium__serie-badge">{si + 1}</span>
        <span className="wolf-se-premium-set-card__load">
          <strong>{kg}</strong> kg
        </span>
        <PremiumSetRowActions
          setIndex={si}
          isEs={isEs}
          canDuplicate={canDuplicate}
          canRemove={canRemove}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />
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
          <span className="wolf-se-premium-set-card__label">{isEs ? 'Series' : 'Sets'}</span>
          <ComboNumberField
            variant="premium"
            value={row.sets}
            min={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
            max={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
            step={1}
            options={[...SETS_PRESETS_LIST]}
            onChange={onSetsChange}
            aria-label={isEs ? `Series fila ${si + 1}` : `Sets row ${si + 1}`}
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
        <div className="wolf-se-premium-set-card__field wolf-se-premium-set-card__field--rest">
          <span className="wolf-se-premium-set-card__label">{isEs ? 'Descanso' : 'Rest'}</span>
          <label className="wolf-se-sets-premium__rest">
            <Clock size={14} aria-hidden />
            <ComboPresetField
              variant="premium"
              value={restSec}
              options={REST_PRESET_OPTIONS}
              onChange={onRestChange}
              className="wolf-se-combo-preset--rest"
              aria-label={isEs ? `Descanso serie ${si + 1}` : `Rest set ${si + 1}`}
            />
          </label>
        </div>
      </div>
    </>
  );

  if (!canReorder) {
    return <article className="wolf-se-premium-set-card">{cardBody}</article>;
  }

  return (
    <Reorder.Item
      as="article"
      value={sortableRow}
      dragListener={false}
      dragControls={dragControls}
      className="wolf-se-premium-set-card wolf-se-premium-set-card--sortable"
      layout="position"
      transition={SET_ROW_DRAG_SPRING}
      whileDrag={{
        scale: 1.012,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.32)',
        zIndex: 30,
      }}
      style={{ touchAction: 'manipulation', position: 'relative' }}
    >
      {cardBody}
    </Reorder.Item>
  );
}

interface SortableSetTableRowProps {
  sortableRow: SortableSetRow;
  setIndex: number;
  kg: string | number;
  isEs: boolean;
  canReorder: boolean;
  canDuplicate: boolean;
  canRemove: boolean;
  onPctChange: (value: number) => void;
  onRepsChange: (value: number) => void;
  onSetsChange: (value: number) => void;
  onRestChange: (value: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function SortableSetTableRow({
  sortableRow,
  setIndex,
  kg,
  isEs,
  canReorder,
  canDuplicate,
  canRemove,
  onPctChange,
  onRepsChange,
  onSetsChange,
  onRestChange,
  onDuplicate,
  onRemove,
}: SortableSetTableRowProps) {
  const dragControls = useDragControls();
  const row = sortableRow.scheme;
  const restSec = row.restSec ?? DEFAULT_REST_SEC;
  const si = setIndex;

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragControls.start(event);
    },
    [dragControls],
  );

  const cells = (
    <>
      <td className="wolf-se-sets-premium__col-grip">
        <SetRowGrip isEs={isEs} disabled={!canReorder} onPointerDown={canReorder ? startDrag : undefined} />
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
          onChange={onPctChange}
          aria-label={isEs ? `Porcentaje serie ${si + 1}` : `Percent set ${si + 1}`}
        />
      </td>
      <td>
        <span className="wolf-se-sets-premium__load">{kg} kg</span>
      </td>
      <td className="wolf-se-sets-premium__col-sets">
        <ComboNumberField
          variant="premium"
          value={row.sets}
          min={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
          max={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
          step={1}
          options={[...SETS_PRESETS_LIST]}
          onChange={onSetsChange}
          aria-label={isEs ? `Series fila ${si + 1}` : `Sets row ${si + 1}`}
        />
      </td>
      <td className="wolf-se-sets-premium__col-reps">
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
      </td>
      <td>
        <label className="wolf-se-sets-premium__rest">
          <Clock size={14} aria-hidden />
          <ComboPresetField
            variant="premium"
            value={restSec}
            options={REST_PRESET_OPTIONS}
            onChange={onRestChange}
            className="wolf-se-combo-preset--rest"
            aria-label={isEs ? `Descanso serie ${si + 1}` : `Rest set ${si + 1}`}
          />
        </label>
      </td>
      <td className="wolf-se-sets-premium__col-actions">
        <PremiumSetRowActions
          setIndex={si}
          isEs={isEs}
          canDuplicate={canDuplicate}
          canRemove={canRemove}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />
      </td>
    </>
  );

  if (!canReorder) {
    return <tr>{cells}</tr>;
  }

  return (
    <Reorder.Item
      as="tr"
      value={sortableRow}
      dragListener={false}
      dragControls={dragControls}
      className="wolf-se-sets-premium__row--sortable"
      layout="position"
      transition={SET_ROW_DRAG_SPRING}
      whileDrag={{ zIndex: 30 }}
      style={{ touchAction: 'manipulation', position: 'relative' }}
    >
      {cells}
    </Reorder.Item>
  );
}

interface PremiumComplexSetCardProps {
  setIndex: number;
  row: SetScheme;
  block: SessionExerciseBlock;
  segments: NonNullable<SessionExerciseBlock['segments']>;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  canRemove: boolean;
  canDuplicate: boolean;
  onPctChange: (value: number) => void;
  onSetsChange: (value: number) => void;
  onRestChange: (value: number) => void;
  onSegmentRepChange: (segIndex: number, value: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function PremiumComplexSetCard({
  setIndex,
  row,
  block,
  segments,
  athlete,
  exercises,
  isEs,
  canRemove,
  canDuplicate,
  onPctChange,
  onSetsChange,
  onRestChange,
  onSegmentRepChange,
  onDuplicate,
  onRemove,
}: PremiumComplexSetCardProps) {
  const si = setIndex;
  const [expanded, setExpanded] = useState(true);
  const restSec = row.restSec ?? DEFAULT_REST_SEC;
  const tonnage = complexSetRowTonnage(block, row, athlete, exercises);
  const totalReps = complexSetRowTotalReps(block, row);
  const avgPct = row.percentage;

  return (
    <article
      className={`wolf-se-complex-set-card wolf-se-complex-set-card--premium${expanded ? ' is-expanded' : ' is-collapsed'}`}
    >
      <header className="wolf-se-complex-set-card__head">
        <span className="wolf-se-complex-set-card__index" aria-hidden>
          {si + 1}
        </span>

        <div className="wolf-se-complex-set-card__toolbar">
          <div className="wolf-se-complex-set-card__control">
            <span className="wolf-se-complex-set-card__control-label">% 1RM</span>
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
          <div className="wolf-se-complex-set-card__control">
            <span className="wolf-se-complex-set-card__control-label">{isEs ? 'Series' : 'Sets'}</span>
            <ComboNumberField
              variant="premium"
              value={row.sets}
              min={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
              max={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
              step={1}
              options={[...SETS_PRESETS_LIST]}
              onChange={onSetsChange}
              aria-label={isEs ? `Series fila ${si + 1}` : `Sets row ${si + 1}`}
            />
          </div>
          <div className="wolf-se-complex-set-card__control wolf-se-complex-set-card__control--rest">
            <span className="wolf-se-complex-set-card__control-label">{isEs ? 'Descanso' : 'Rest'}</span>
            <label className="wolf-se-sets-premium__rest wolf-se-complex-set-card__rest">
              <Clock size={14} aria-hidden />
              <ComboPresetField
                variant="premium"
                value={restSec}
                options={REST_PRESET_OPTIONS}
                onChange={onRestChange}
                className="wolf-se-combo-preset--rest"
                aria-label={isEs ? `Descanso serie ${si + 1}` : `Rest set ${si + 1}`}
              />
            </label>
          </div>
        </div>

        <div className="wolf-se-complex-set-card__meta" aria-label={isEs ? 'Resumen de la serie' : 'Set summary'}>
          <span className="wolf-se-complex-set-card__meta-chip">{tonnage} kg</span>
          <span className="wolf-se-complex-set-card__meta-chip">
            {totalReps} {isEs ? 'reps' : 'reps'}
          </span>
          <span className="wolf-se-complex-set-card__meta-chip wolf-se-complex-set-card__meta-chip--accent">
            {avgPct}%
          </span>
        </div>

        <div className="wolf-se-complex-set-card__actions">
          <button
            type="button"
            className="wolf-se-complex-set-card__action"
            disabled={!canDuplicate}
            title={isEs ? 'Duplicar' : 'Duplicate'}
            aria-label={isEs ? `Duplicar serie ${si + 1}` : `Duplicate set ${si + 1}`}
            onClick={onDuplicate}
          >
            <Copy size={15} />
          </button>
          <button
            type="button"
            className="wolf-se-complex-set-card__action wolf-se-complex-set-card__action--danger"
            disabled={!canRemove}
            aria-label={isEs ? `Eliminar serie ${si + 1}` : `Remove set ${si + 1}`}
            onClick={onRemove}
          >
            <Trash2 size={15} />
          </button>
          <button
            type="button"
            className={`wolf-se-complex-set-card__action wolf-se-complex-set-card__toggle${expanded ? ' is-open' : ''}`}
            aria-expanded={expanded}
            title={expanded ? (isEs ? 'Ocultar movimientos' : 'Hide movements') : isEs ? 'Ver movimientos' : 'Show movements'}
            aria-label={
              expanded
                ? isEs
                  ? `Ocultar movimientos serie ${si + 1}`
                  : `Hide movements set ${si + 1}`
                : isEs
                  ? `Ver movimientos serie ${si + 1}`
                  : `Show movements set ${si + 1}`
            }
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronDown size={16} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </header>

      {expanded ? (
      <div className="wolf-se-complex-set-card__body">
        {segments.map((seg, segIdx) => {
          const exSeg = exercises.find((e) => e.id === seg.exerciseId);
          const kg = exSeg ? kgForExercise(athlete, exSeg, row.percentage) : '—';
          const name = exerciseName(exercises, seg.exerciseId);

          return (
            <div key={segIdx} className="wolf-se-complex-segment">
              <div className="wolf-se-complex-segment__head">
                <span className="wolf-se-complex-segment__badge">{segIdx + 1}</span>
                <span className="wolf-se-complex-segment__name">{name}</span>
              </div>
              <div className="wolf-se-complex-segment__grid wolf-se-complex-segment__grid--compact">
                <div className="wolf-se-complex-segment__field">
                  <span className="wolf-se-complex-segment__label">
                    {isEs ? 'Reps' : 'Reps'}
                  </span>
                  <SegmentRepField
                    value={row.segmentReps?.[segIdx] ?? '1'}
                    onChange={(v) => onSegmentRepChange(segIdx, v)}
                    variant="premium"
                    aria-label={isEs ? `Reps ${name}` : `Reps ${name}`}
                  />
                </div>
                <div className="wolf-se-complex-segment__field wolf-se-complex-segment__field--load">
                  <span className="wolf-se-complex-segment__label">{isEs ? 'Carga' : 'Load'}</span>
                  <strong className="wolf-se-complex-segment__kg">{kg} kg</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      ) : null}
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
  onRestChange,
  onSegmentRepChange,
  onAddSet,
  onDuplicateSet,
  onRemoveSet,
  onReorderSets,
}) => {
  const canReorderSets = Boolean(onReorderSets) && block.sets.length > 1;
  const [setRows, setSetRows] = useState<SortableSetRow[]>(() => rowsFromSchemes(block.sets));

  useEffect(() => {
    setSetRows((prev) => {
      if (block.sets.length !== prev.length) {
        return rowsFromSchemes(block.sets, prev);
      }
      return prev.map((row, i) => ({ id: row.id, scheme: block.sets[i]! }));
    });
  }, [block.sets]);

  const handleSetRowsReorder = useCallback(
    (nextRows: SortableSetRow[]) => {
      setSetRows((prev) => {
        if (onReorderSets) {
          const move = findReorderMove(prev, nextRows);
          if (move) onReorderSets(move.from, move.to);
        }
        return nextRows;
      });
    },
    [onReorderSets],
  );

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
      const canDuplicate = block.sets.length < WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK;
      return (
        <section className={`${sectionClass} wolf-se-sets-section--premium`} onKeyDown={onEnter}>
          <div className="wolf-se-sets-premium__head">
            <h4 className="wolf-se-sets-premium__title">
              <ListOrdered size={16} strokeWidth={2.25} aria-hidden />
              {isEs ? 'Esquema de series' : 'Set scheme'}
            </h4>
          </div>

          {isPremiumMobile ? (
            canReorderSets ? (
              <Reorder.Group
                as="div"
                axis="y"
                values={setRows}
                onReorder={handleSetRowsReorder}
                className="wolf-se-sets-premium__cards wolf-se-sets-premium__cards--sortable"
              >
                {setRows.map((sortableRow, si) => {
                  const kg = ex ? kgForExercise(athlete, ex, sortableRow.scheme.percentage) : '—';
                  return (
                    <PremiumSetMobileCard
                      key={sortableRow.id}
                      sortableRow={sortableRow}
                      setIndex={si}
                      kg={kg}
                      isEs={isEs}
                      canRemove={block.sets.length > 1}
                      canDuplicate={canDuplicate}
                      canReorder
                      onPctChange={(v) => onPctChange(si, v)}
                      onRepsChange={(v) => onRepsChange(si, v)}
                      onSetsChange={(v) => onSetsChange(si, v)}
                      onRestChange={(v) => onRestChange(si, v)}
                      onDuplicate={() => onDuplicateSet(si)}
                      onRemove={() => onRemoveSet(si)}
                    />
                  );
                })}
              </Reorder.Group>
            ) : (
              <div className="wolf-se-sets-premium__cards">
                {setRows.map((sortableRow, si) => {
                  const kg = ex ? kgForExercise(athlete, ex, sortableRow.scheme.percentage) : '—';
                  return (
                    <PremiumSetMobileCard
                      key={sortableRow.id}
                      sortableRow={sortableRow}
                      setIndex={si}
                      kg={kg}
                      isEs={isEs}
                      canRemove={block.sets.length > 1}
                      canDuplicate={canDuplicate}
                      canReorder={false}
                      onPctChange={(v) => onPctChange(si, v)}
                      onRepsChange={(v) => onRepsChange(si, v)}
                      onSetsChange={(v) => onSetsChange(si, v)}
                      onRestChange={(v) => onRestChange(si, v)}
                      onDuplicate={() => onDuplicateSet(si)}
                      onRemove={() => onRemoveSet(si)}
                    />
                  );
                })}
              </div>
            )
          ) : (
          <div className="wolf-se-sets-premium__table-wrap">
            <table className={`wolf-se-sets-premium__table${canReorderSets ? ' wolf-se-sets-premium__table--sortable' : ''}`}>
              <thead>
                <tr>
                  <th className="wolf-se-sets-premium__col-grip" aria-hidden />
                  <th>#</th>
                  <th>% 1RM</th>
                  <th>{isEs ? 'Carga' : 'Load'}</th>
                  <th>{isEs ? 'Series' : 'Sets'}</th>
                  <th>{isEs ? 'Reps' : 'Reps'}</th>
                  <th>{isEs ? 'Descanso' : 'Rest'}</th>
                  <th className="wolf-se-sets-premium__col-actions" aria-hidden />
                </tr>
              </thead>
              {canReorderSets ? (
                <Reorder.Group
                  as="tbody"
                  axis="y"
                  values={setRows}
                  onReorder={handleSetRowsReorder}
                  className="wolf-se-sets-premium__tbody--sortable"
                >
                  {setRows.map((sortableRow, si) => {
                    const kg = ex ? kgForExercise(athlete, ex, sortableRow.scheme.percentage) : '—';
                    return (
                      <SortableSetTableRow
                        key={sortableRow.id}
                        sortableRow={sortableRow}
                        setIndex={si}
                        kg={kg}
                        isEs={isEs}
                        canReorder
                        canDuplicate={canDuplicate}
                        canRemove={block.sets.length > 1}
                        onPctChange={(v) => onPctChange(si, v)}
                        onRepsChange={(v) => onRepsChange(si, v)}
                        onSetsChange={(v) => onSetsChange(si, v)}
                        onRestChange={(v) => onRestChange(si, v)}
                        onDuplicate={() => onDuplicateSet(si)}
                        onRemove={() => onRemoveSet(si)}
                      />
                    );
                  })}
                </Reorder.Group>
              ) : (
              <tbody>
                {setRows.map((sortableRow, si) => {
                  const kg = ex ? kgForExercise(athlete, ex, sortableRow.scheme.percentage) : '—';
                  return (
                    <SortableSetTableRow
                      key={sortableRow.id}
                      sortableRow={sortableRow}
                      setIndex={si}
                      kg={kg}
                      isEs={isEs}
                      canReorder={false}
                      canDuplicate={canDuplicate}
                      canRemove={block.sets.length > 1}
                      onPctChange={(v) => onPctChange(si, v)}
                      onRepsChange={(v) => onRepsChange(si, v)}
                      onSetsChange={(v) => onSetsChange(si, v)}
                      onRestChange={(v) => onRestChange(si, v)}
                      onDuplicate={() => onDuplicateSet(si)}
                      onRemove={() => onRemoveSet(si)}
                    />
                  );
                })}
              </tbody>
              )}
            </table>
          </div>
          )}

          <button
            type="button"
            className="wolf-se-sets-premium__add-row"
            disabled={block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
            onClick={onAddSet}
          >
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            {isEs ? 'Agregar serie' : 'Add set'}
          </button>

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
                <th>{isEs ? 'Series' : 'Sets'}</th>
                <th>Reps</th>
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
                        value={row.sets}
                        min={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
                        max={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
                        step={1}
                        onChange={(v) => onSetsChange(si, v)}
                        aria-label={`Sets ${si + 1}`}
                      />
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

  if (layout === 'embedded') {
    const canDuplicate = block.sets.length < WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK;
    return (
      <section
        className="wolf-se-sets-section wolf-se-sets-section--embedded wolf-se-sets-section--premium wolf-se-sets-section--complex"
        onKeyDown={onEnter}
      >
        <div className="wolf-se-sets-premium__head">
          <h4 className="wolf-se-sets-premium__title">
            <ListOrdered size={16} strokeWidth={2.25} aria-hidden />
            {isEs ? 'Series del complejo' : 'Complex sets'}
          </h4>
        </div>

        <div className="wolf-se-complex-sets wolf-se-complex-sets--premium">
          {block.sets.map((row, si) => (
            <PremiumComplexSetCard
              key={si}
              setIndex={si}
              row={row}
              block={block}
              segments={segments}
              athlete={athlete}
              exercises={exercises}
              isEs={isEs}
              canRemove={block.sets.length > 1}
              canDuplicate={canDuplicate}
              onPctChange={(v) => onPctChange(si, v)}
              onSetsChange={(v) => onSetsChange(si, v)}
              onRestChange={(v) => onRestChange(si, v)}
              onSegmentRepChange={(segIdx, val) => onSegmentRepChange(si, segIdx, val)}
              onDuplicate={() => onDuplicateSet(si)}
              onRemove={() => onRemoveSet(si)}
            />
          ))}

          <button
            type="button"
            className="wolf-se-sets-premium__add-row"
            disabled={block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
            onClick={onAddSet}
          >
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            {isEs ? 'Agregar serie' : 'Add set'}
          </button>
        </div>

        <PremiumSetsSummary block={block} athlete={athlete} exercises={exercises} isEs={isEs} />
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
