import { SlidersHorizontal } from 'lucide-react';
import type { AthleteSortId } from './athleteListUtils';
import { WlListActionBar } from '../wl-shared/WlListActionBar';

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
  sort,
  onSortChange,
  canAdd,
  onAdd,
}: {
  isEs: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  sort: AthleteSortId;
  onSortChange: (id: AthleteSortId) => void;
  canAdd?: boolean;
  onAdd?: () => void;
}) {
  return (
    <div className="wl-athletes-toolbar">
      <WlListActionBar
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={isEs ? 'Buscar atleta…' : 'Search athlete…'}
        searchAriaLabel={isEs ? 'Buscar atleta' : 'Search athlete'}
        filterIcon={SlidersHorizontal}
        filterValue={sort}
        onFilterChange={(value) => onSortChange(value as AthleteSortId)}
        filterAriaLabel={isEs ? 'Ordenar atletas' : 'Sort athletes'}
        filterOptions={SORT_OPTIONS.map((option) => ({
          id: option.id,
          label: isEs ? option.labelEs : option.labelEn,
          shortLabel: isEs ? option.shortEs : option.shortEn,
        }))}
        filterActive={sort !== 'name_asc'}
        primaryLabel={isEs ? 'Añadir atleta' : 'Add athlete'}
        primaryAriaLabel={isEs ? 'Añadir atleta' : 'Add athlete'}
        onPrimaryClick={() => onAdd?.()}
        showPrimary={Boolean(canAdd && onAdd)}
      />
    </div>
  );
}
