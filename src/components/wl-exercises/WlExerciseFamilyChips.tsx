import type { ExerciseFamilyCode, ExerciseTaxonomyBundle } from '../../models/exercise';
import type { ExerciseFamilyFilter } from './exerciseListUtils';
import { FAMILY_CHIP_ORDER } from './exerciseListUtils';

export function WlExerciseFamilyChips({
  isEs,
  taxonomy,
  family,
  counts,
  onChange,
}: {
  isEs: boolean;
  taxonomy: ExerciseTaxonomyBundle;
  family: ExerciseFamilyFilter;
  counts: Record<string, number>;
  onChange: (family: ExerciseFamilyFilter) => void;
}) {
  const labelFor = (code: ExerciseFamilyCode) => {
    const item = taxonomy.families.find((entry) => entry.code === code);
    if (!item) return code;
    return isEs ? item.labelEs : item.labelEn;
  };

  return (
    <div className="wl-exercises-chips" role="tablist" aria-label={isEs ? 'Familias' : 'Families'}>
      <button
        type="button"
        role="tab"
        aria-selected={family === 'all'}
        className={`wl-exercises-chip${family === 'all' ? ' is-active' : ''}`}
        onClick={() => onChange('all')}
      >
        {isEs ? 'Todos' : 'All'}
        <span className="wl-exercises-chip__count">{counts.all ?? 0}</span>
      </button>
      {FAMILY_CHIP_ORDER.map((code) => {
        const active = family === code;
        return (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={active}
            className={`wl-exercises-chip${active ? ' is-active' : ''}`}
            onClick={() => onChange(code)}
          >
            {labelFor(code)}
            {active ? <span className="wl-exercises-chip__count">{counts[code] ?? 0}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
