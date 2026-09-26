import { Filter, LayoutGrid, List, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { WlSearchField } from '../wl-shared/WlSearchField';
import {
  DISCIPLINE_OPTIONS,
  ORIGIN_OPTIONS,
  DEFAULT_EXERCISE_SORT,
  SORT_OPTIONS,
  type ExerciseDisciplineFilter,
  type ExerciseOriginFilter,
  type ExerciseSortId,
} from './exerciseListUtils';
import type { ExerciseViewMode } from './types';

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
  viewMode,
  onViewModeChange,
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
  viewMode: ExerciseViewMode;
  onViewModeChange: (mode: ExerciseViewMode) => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  onCreate: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const filtersActive = discipline !== 'all' || origin !== 'all' || sort !== DEFAULT_EXERCISE_SORT;

  useEffect(() => {
    if (!filtersOpen) return;
    const onClickAway = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onFiltersOpenChange(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFiltersOpenChange(false);
    };
    window.addEventListener('mousedown', onClickAway);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClickAway);
      window.removeEventListener('keydown', onKey);
    };
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
            <span className="wl-exercises-filters-btn__label">{isEs ? 'Filtros' : 'Filters'}</span>
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

        <div className="wl-exercises-view-toggle" role="group" aria-label={isEs ? 'Modo de vista' : 'View mode'}>
          <button
            type="button"
            className={`wl-exercises-view-toggle__btn${viewMode === 'list' ? ' is-active' : ''}`}
            aria-pressed={viewMode === 'list'}
            aria-label={isEs ? 'Lista' : 'List'}
            onClick={() => onViewModeChange('list')}
          >
            <List size={16} aria-hidden />
          </button>
          <button
            type="button"
            className={`wl-exercises-view-toggle__btn${viewMode === 'grid' ? ' is-active' : ''}`}
            aria-pressed={viewMode === 'grid'}
            aria-label={isEs ? 'Grid' : 'Grid'}
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid size={16} aria-hidden />
          </button>
        </div>

        <button
          type="button"
          className="btn-primary wl-list-toolbar__cta wl-exercises-toolbar__cta"
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
