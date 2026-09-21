import type { MuscleGroupFilter } from './exerciseListUtils';
import { MUSCLE_CHIP_ORDER, MUSCLE_LABELS } from './exerciseListUtils';

export function WlExerciseMuscleChips({
  isEs,
  muscleGroup,
  counts,
  onChange,
}: {
  isEs: boolean;
  muscleGroup: MuscleGroupFilter;
  counts: Record<string, number>;
  onChange: (group: MuscleGroupFilter) => void;
}) {
  return (
    <div className="wl-exercises-chips" role="tablist" aria-label={isEs ? 'Grupos musculares' : 'Muscle groups'}>
      <button
        type="button"
        role="tab"
        aria-selected={muscleGroup === 'all'}
        className={`wl-exercises-chip${muscleGroup === 'all' ? ' is-active' : ''}`}
        onClick={() => onChange('all')}
      >
        {isEs ? 'Todos' : 'All'}
        <span className="wl-exercises-chip__count">{counts.all ?? 0}</span>
      </button>
      {MUSCLE_CHIP_ORDER.map((code) => {
        const active = muscleGroup === code;
        const label = MUSCLE_LABELS[code];
        return (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={active}
            className={`wl-exercises-chip${active ? ' is-active' : ''}`}
            onClick={() => onChange(code)}
          >
            {isEs ? label.es : label.en}
            {active ? <span className="wl-exercises-chip__count">{counts[code] ?? 0}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
