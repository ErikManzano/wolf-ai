import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ExerciseListSortState, ExerciseSortColumn } from './types';

function SortArrow({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  if (!active) return null;
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown;
  return <Icon size={11} strokeWidth={2.5} aria-hidden className="wl-exercise-table-header__sort-icon" />;
}

export function ExerciseListHeader({
  isEs,
  sort,
  allSelected,
  someSelected,
  onToggleAll,
  onSortColumn,
}: {
  isEs: boolean;
  sort: ExerciseListSortState;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onSortColumn: (column: ExerciseSortColumn) => void;
}) {
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  const headerBtn = (column: ExerciseSortColumn, label: string, className?: string) => (
    <button
      type="button"
      className={`wl-exercise-table-header__sort${sort.column === column ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      onClick={() => onSortColumn(column)}
    >
      <span>{label}</span>
      <SortArrow active={sort.column === column} direction={sort.direction} />
    </button>
  );

  return (
    <div className="wl-exercise-table-header" role="row">
      <div className="wl-exercise-table-header__cell wl-exercise-table-header__cell--check" role="columnheader">
        <input
          ref={selectAllRef}
          type="checkbox"
          className="wl-exercise-table-check"
          checked={allSelected}
          aria-label={isEs ? 'Seleccionar todos' : 'Select all'}
          onChange={onToggleAll}
        />
      </div>
      <div className="wl-exercise-table-header__cell wl-exercise-table-header__cell--name" role="columnheader">
        {headerBtn('name', isEs ? 'EJERCICIO' : 'EXERCISE')}
      </div>
      <div className="wl-exercise-table-header__cell wl-exercise-table-header__cell--family" role="columnheader">
        {headerBtn('family', isEs ? 'FAMILIA' : 'FAMILY')}
      </div>
      <div className="wl-exercise-table-header__cell wl-exercise-table-header__cell--type" role="columnheader">
        {headerBtn('type', isEs ? 'TIPO' : 'TYPE')}
      </div>
      <div className="wl-exercise-table-header__cell wl-exercise-table-header__cell--state" role="columnheader">
        {headerBtn('state', isEs ? 'ESTADO' : 'STATUS')}
      </div>
      <div className="wl-exercise-table-header__cell wl-exercise-table-header__cell--actions" role="columnheader">
        <span className="wl-exercise-table-header__label wl-exercise-table-header__label--sr">
          {isEs ? 'Acciones' : 'Actions'}
        </span>
      </div>
    </div>
  );
}
