import { Filter, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { WlSearchField } from '../wl-shared/WlSearchField';
import {
  DISCIPLINE_OPTIONS,
  ORIGIN_OPTIONS,
  SORT_OPTIONS,
  type ExerciseDisciplineFilter,
  type ExerciseOriginFilter,
  type ExerciseSortId,
} from './exerciseListUtils';

export function WlExercisesToolbar({
  isEs,
  search,
  onSearchChange,
  discipline,
  onDisciplineChange,
  origin,
  onOriginChange,
  sort,
  onSortChange,
  filtersOpen,
  onFiltersOpenChange,
  onCreate,
}: {
  isEs: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  discipline: ExerciseDisciplineFilter;
  onDisciplineChange: (value: ExerciseDisciplineFilter) => void;
  origin: ExerciseOriginFilter;
  onOriginChange: (value: ExerciseOriginFilter) => void;
  sort: ExerciseSortId;
  onSortChange: (value: ExerciseSortId) => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  onCreate: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const filtersActive = discipline !== 'all' || origin !== 'all' || sort !== 'name_asc';

  useEffect(() => {
    if (!filtersOpen) return;
    const onClickAway = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onFiltersOpenChange(false);
    };
    window.addEventListener('mousedown', onClickAway);
    return () => window.removeEventListener('mousedown', onClickAway);
  }, [filtersOpen, onFiltersOpenChange]);

  return (
    <div className="wl-exercises-toolbar" ref={ref}>
      <div className="wl-list-toolbar wl-list-toolbar--action-bar">
        <WlSearchField
          value={search}
          onChange={onSearchChange}
          placeholder={isEs ? 'Buscar ejercicio…' : 'Search exercise…'}
          ariaLabel={isEs ? 'Buscar ejercicio' : 'Search exercise'}
        />
        <div className="wl-exercises-filters-wrap">
          <button
            type="button"
            className={`wl-exercises-filters-btn${filtersActive ? ' is-active' : ''}`}
            aria-expanded={filtersOpen}
            onClick={() => onFiltersOpenChange(!filtersOpen)}
          >
            <Filter size={16} strokeWidth={2.25} aria-hidden />
            {isEs ? 'Filtros' : 'Filters'}
          </button>
          {filtersOpen ? (
            <div className="wl-exercises-filters-popover" role="dialog" aria-label={isEs ? 'Filtros' : 'Filters'}>
              <label>
                {isEs ? 'Disciplina' : 'Discipline'}
                <select
                  value={discipline}
                  onChange={(event) => onDisciplineChange(event.target.value as ExerciseDisciplineFilter)}
                >
                  {DISCIPLINE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {isEs ? option.labelEs : option.labelEn}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {isEs ? 'Origen' : 'Origin'}
                <select value={origin} onChange={(event) => onOriginChange(event.target.value as ExerciseOriginFilter)}>
                  {ORIGIN_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {isEs ? option.labelEs : option.labelEn}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {isEs ? 'Orden' : 'Sort'}
                <select value={sort} onChange={(event) => onSortChange(event.target.value as ExerciseSortId)}>
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {isEs ? option.labelEs : option.labelEn}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="btn-primary wl-list-toolbar__cta"
          onClick={onCreate}
          aria-label={isEs ? 'Nuevo ejercicio' : 'New exercise'}
        >
          <Plus size={16} strokeWidth={2.25} aria-hidden />
          <span className="wl-list-toolbar__cta-label">{isEs ? 'Nuevo ejercicio' : 'New exercise'}</span>
        </button>
      </div>
    </div>
  );
}
