import type { ExerciseFamilyCode } from '../../models/exercise';
import { FAMILY_AVATAR } from '../wl-exercises/FamilyAvatar';
import { FAMILY_CHIP_ORDER, FAMILY_DISPLAY_LABEL } from '../wl-exercises/exerciseListUtils';
import type { ExerciseFamilyId } from '../wl-exercises/types';

export type PickerFamilyFilter = ExerciseFamilyCode | 'all';

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
}: {
  isEs: boolean;
  active: PickerFamilyFilter;
  counts: Map<PickerFamilyFilter, number>;
  onChange: (family: PickerFamilyFilter) => void;
  compact?: boolean;
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

      {FAMILY_CHIP_ORDER.map((family) => {
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
