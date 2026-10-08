import type { ExerciseFamilyCode, ExerciseVariationCode } from '../../models/exercise';
import type { SessionPickerOption } from '../../services/exercise';
import { FAMILY_AVATAR } from '../wl-exercises/FamilyAvatar';
import {
  FAMILY_CHIP_ORDER,
  FAMILY_DISPLAY_LABEL,
  MUSCLE_CHIP_ORDER,
  MUSCLE_LABELS,
  muscleGroupFromTags,
  type MuscleGroupFilter,
} from '../wl-exercises/exerciseListUtils';
import type { ExerciseFamilyId } from '../wl-exercises/types';

export type PickerFamilyFilter = ExerciseFamilyCode | 'all';
export type PickerVariationFilter = ExerciseVariationCode | 'all';

export function pickerMuscleGroupForOption(opt: SessionPickerOption): MuscleGroupFilter {
  return muscleGroupFromTags(opt.tags ?? []) ?? 'full_body';
}

export function buildPickerMuscleCounts(options: SessionPickerOption[]): Map<MuscleGroupFilter, number> {
  const map = new Map<MuscleGroupFilter, number>();
  map.set('all', options.length);
  for (const opt of options) {
    const group = pickerMuscleGroupForOption(opt);
    map.set(group, (map.get(group) ?? 0) + 1);
  }
  return map;
}

export function filterPickerByMuscleGroup(
  options: SessionPickerOption[],
  muscle: MuscleGroupFilter,
): SessionPickerOption[] {
  if (muscle === 'all') return options;
  return options.filter((opt) => pickerMuscleGroupForOption(opt) === muscle);
}

export const PICKER_VARIATION_ORDER: ExerciseVariationCode[] = [
  'classic',
  'power',
  'hang',
  'block',
  'muscle',
  'tall',
  'pull',
  'high_pull',
  'complex',
];

export function buildPickerVariationCounts(
  options: SessionPickerOption[],
): Map<PickerVariationFilter, number> {
  const map = new Map<PickerVariationFilter, number>();
  map.set('all', options.length);
  for (const opt of options) {
    const code = opt.variation ?? 'classic';
    map.set(code, (map.get(code) ?? 0) + 1);
  }
  return map;
}

export function filterPickerByVariation(
  options: SessionPickerOption[],
  variation: PickerVariationFilter,
): SessionPickerOption[] {
  if (variation === 'all') return options;
  return options.filter((opt) => (opt.variation ?? 'classic') === variation);
}

/** Conteos por familia a partir de resultados de búsqueda. */
export function buildPickerFamilyCounts(
  options: { family: ExerciseFamilyCode }[],
): Map<PickerFamilyFilter, number> {
  const map = new Map<PickerFamilyFilter, number>();
  map.set('all', options.length);
  for (const opt of options) {
    map.set(opt.family, (map.get(opt.family) ?? 0) + 1);
  }
  return map;
}

export function filterPickerByFamily<T extends { family: ExerciseFamilyCode }>(
  options: T[],
  family: PickerFamilyFilter,
): T[] {
  if (family === 'all') return options;
  return options.filter((opt) => opt.family === family);
}

export function ExercisePickerFamilyFilters({
  isEs,
  active,
  counts,
  onChange,
  compact = false,
  hiddenIds,
}: {
  isEs: boolean;
  active: PickerFamilyFilter;
  counts: Map<PickerFamilyFilter, number>;
  onChange: (family: PickerFamilyFilter) => void;
  compact?: boolean;
  hiddenIds?: ExerciseFamilyCode[];
}) {
  const allLabel = isEs ? 'Todos' : 'All';
  const allCount = counts.get('all') ?? 0;

  return (
    <div
      className={`wolf-se-picker-families${compact ? ' wolf-se-picker-families--compact' : ''}`}
      role="tablist"
      aria-label={isEs ? 'Filtrar por familia' : 'Filter by family'}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === 'all'}
        className={`wolf-se-picker-family-chip${active === 'all' ? ' is-active' : ''}`}
        onPointerDown={(e) => {
          e.preventDefault();
          onChange('all');
        }}
      >
        <span>{allLabel}</span>
        {allCount > 0 ? <span className="wolf-se-picker-family-chip__count">{allCount}</span> : null}
      </button>

      {FAMILY_CHIP_ORDER.filter((family) => !hiddenIds?.includes(family)).map((family) => {
        const token = FAMILY_AVATAR[family as ExerciseFamilyId];
        const count = counts.get(family) ?? 0;
        const label = FAMILY_DISPLAY_LABEL[family as ExerciseFamilyId];
        const disabled = count === 0;

        return (
          <button
            key={family}
            type="button"
            role="tab"
            aria-selected={active === family}
            title={label}
            disabled={disabled}
            className={`wolf-se-picker-family-chip${active === family ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              if (disabled) return;
              onChange(family);
            }}
          >
            <span
              className="wolf-se-picker-family-chip__abbr"
              style={{ background: token.background, color: token.color }}
              aria-hidden
            >
              {token.abbr}
            </span>
            {compact ? null : <span className="wolf-se-picker-family-chip__label">{label}</span>}
            {count > 0 ? <span className="wolf-se-picker-family-chip__count">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function ExercisePickerMuscleFilters({
  isEs,
  active,
  counts,
  onChange,
}: {
  isEs: boolean;
  active: MuscleGroupFilter;
  counts: Map<MuscleGroupFilter, number>;
  onChange: (muscle: MuscleGroupFilter) => void;
}) {
  const allLabel = isEs ? 'Todos' : 'All';
  const allCount = counts.get('all') ?? 0;

  return (
    <div
      className="wolf-se-picker-families wolf-se-picker-families--secondary"
      role="tablist"
      aria-label={isEs ? 'Filtrar por músculo' : 'Filter by muscle'}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === 'all'}
        className={`wolf-se-picker-family-chip${active === 'all' ? ' is-active' : ''}`}
        onPointerDown={(e) => {
          e.preventDefault();
          onChange('all');
        }}
      >
        <span>{allLabel}</span>
        {allCount > 0 ? <span className="wolf-se-picker-family-chip__count">{allCount}</span> : null}
      </button>

      {MUSCLE_CHIP_ORDER.map((code) => {
        const count = counts.get(code) ?? 0;
        const disabled = count === 0;
        const label = isEs ? MUSCLE_LABELS[code].es : MUSCLE_LABELS[code].en;
        return (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={active === code}
            disabled={disabled}
            className={`wolf-se-picker-family-chip${active === code ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              if (disabled) return;
              onChange(code);
            }}
          >
            <span>{label}</span>
            {count > 0 ? <span className="wolf-se-picker-family-chip__count">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function ExercisePickerVariationFilters({
  isEs,
  active,
  counts,
  variationLabels,
  onChange,
}: {
  isEs: boolean;
  active: PickerVariationFilter;
  counts: Map<PickerVariationFilter, number>;
  variationLabels: Record<ExerciseVariationCode, string>;
  onChange: (variation: PickerVariationFilter) => void;
}) {
  const allLabel = isEs ? 'Todos' : 'All';
  const allCount = counts.get('all') ?? 0;

  return (
    <div
      className="wolf-se-picker-families wolf-se-picker-families--secondary"
      role="tablist"
      aria-label={isEs ? 'Filtrar por variación' : 'Filter by variation'}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === 'all'}
        className={`wolf-se-picker-family-chip${active === 'all' ? ' is-active' : ''}`}
        onPointerDown={(e) => {
          e.preventDefault();
          onChange('all');
        }}
      >
        <span>{allLabel}</span>
        {allCount > 0 ? <span className="wolf-se-picker-family-chip__count">{allCount}</span> : null}
      </button>

      {PICKER_VARIATION_ORDER.map((code) => {
        const count = counts.get(code) ?? 0;
        const disabled = count === 0;
        const label = variationLabels[code] ?? code;
        return (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={active === code}
            disabled={disabled}
            className={`wolf-se-picker-family-chip${active === code ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              if (disabled) return;
              onChange(code);
            }}
          >
            <span>{label}</span>
            {count > 0 ? <span className="wolf-se-picker-family-chip__count">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
