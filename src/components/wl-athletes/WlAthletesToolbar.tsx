import { ArrowUpDown, Filter, Plus } from 'lucide-react';
import type { AthleteFilterId, AthleteSortId } from './athleteListUtils';
import { WlListFieldSelect } from '../wl-shared/WlListFieldSelect';
import { WlSearchField } from '../wl-shared/WlSearchField';

const FILTER_OPTIONS: { id: AthleteFilterId; labelEs: string; labelEn: string }[] = [
  { id: 'all', labelEs: 'Todos', labelEn: 'All' },
  { id: 'no_program', labelEs: 'Sin programa', labelEn: 'No program' },
  { id: 'low_adherence', labelEs: 'Baja adherencia', labelEn: 'Low adherence' },
  { id: 'beginner', labelEs: 'Principiante', labelEn: 'Beginner' },
  { id: 'intermediate', labelEs: 'Intermedio', labelEn: 'Intermediate' },
  { id: 'advanced', labelEs: 'Avanzado', labelEn: 'Advanced' },
];

const SORT_OPTIONS: {
  id: AthleteSortId;
  labelEs: string;
  labelEn: string;
  shortEs: string;
  shortEn: string;
}[] = [
  { id: 'name_asc', labelEs: 'Nombre A–Z', labelEn: 'Name A–Z', shortEs: 'A–Z', shortEn: 'A–Z' },
  { id: 'name_desc', labelEs: 'Nombre Z–A', labelEn: 'Name Z–A', shortEs: 'Z–A', shortEn: 'Z–A' },
  {
    id: 'adherence_desc',
    labelEs: 'Mayor adherencia',
    labelEn: 'Highest adherence',
    shortEs: 'Adherencia ↑',
    shortEn: 'Adherence ↑',
  },
  {
    id: 'adherence_asc',
    labelEs: 'Menor adherencia',
    labelEn: 'Lowest adherence',
    shortEs: 'Adherencia ↓',
    shortEn: 'Adherence ↓',
  },
  {
    id: 'recent',
    labelEs: 'Actividad reciente',
    labelEn: 'Recent activity',
    shortEs: 'Reciente',
    shortEn: 'Recent',
  },
];

export function WlAthletesToolbar({
  isEs,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  canAdd,
  onAdd,
}: {
  isEs: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  filter: AthleteFilterId;
  onFilterChange: (id: AthleteFilterId) => void;
  sort: AthleteSortId;
  onSortChange: (id: AthleteSortId) => void;
  canAdd?: boolean;
  onAdd?: () => void;
}) {
  return (
    <div className="wl-athletes-toolbar">
      <div className="wl-list-toolbar wl-list-toolbar--action-bar">
        <WlSearchField
          value={search}
          onChange={onSearchChange}
          placeholder={isEs ? 'Buscar atleta…' : 'Search athlete…'}
          ariaLabel={isEs ? 'Buscar atleta' : 'Search athlete'}
        />
        <WlListFieldSelect
          icon={Filter}
          value={filter}
          onChange={(value) => onFilterChange(value as AthleteFilterId)}
          ariaLabel={isEs ? 'Filtrar atletas' : 'Filter athletes'}
          active={filter !== 'all'}
          title={FILTER_OPTIONS.find((option) => option.id === filter)?.[isEs ? 'labelEs' : 'labelEn']}
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {isEs ? option.labelEs : option.labelEn}
            </option>
          ))}
        </WlListFieldSelect>
        <WlListFieldSelect
          icon={ArrowUpDown}
          value={sort}
          onChange={(value) => onSortChange(value as AthleteSortId)}
          ariaLabel={isEs ? 'Ordenar atletas' : 'Sort athletes'}
          active={sort !== 'name_asc'}
          title={SORT_OPTIONS.find((option) => option.id === sort)?.[isEs ? 'labelEs' : 'labelEn']}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id} title={isEs ? option.labelEs : option.labelEn}>
              {isEs ? option.shortEs : option.shortEn}
            </option>
          ))}
        </WlListFieldSelect>
        {canAdd && onAdd ? (
          <button
            type="button"
            className="btn-primary wl-list-toolbar__cta"
            onClick={onAdd}
            aria-label={isEs ? 'Añadir atleta' : 'Add athlete'}
          >
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            <span className="wl-list-toolbar__cta-label">{isEs ? 'Añadir atleta' : 'Add athlete'}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
