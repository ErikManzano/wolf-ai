import { SlidersHorizontal } from 'lucide-react';
import type { AthleteSortId } from './athleteListUtils';
import { WlListFieldSelect } from '../wl-shared/WlListFieldSelect';
import { WlSearchField } from '../wl-shared/WlSearchField';

export function WlAthletesToolbar({
  isEs,
  search,
  onSearchChange,
  sort,
  onSortChange,
}: {
  isEs: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  sort: AthleteSortId;
  onSortChange: (id: AthleteSortId) => void;
}) {
  return (
    <div className="wl-athletes-toolbar">
      <div className="wl-list-toolbar">
        <div className="wl-list-toolbar__main">
          <WlSearchField
            value={search}
            onChange={onSearchChange}
            placeholder={isEs ? 'Buscar atleta…' : 'Search athlete…'}
            ariaLabel={isEs ? 'Buscar atleta' : 'Search athlete'}
          />
          <WlListFieldSelect
            icon={SlidersHorizontal}
            value={sort}
            onChange={(value) => onSortChange(value as AthleteSortId)}
            ariaLabel={isEs ? 'Ordenar' : 'Sort'}
          >
            <option value="name_asc">{isEs ? 'Nombre A–Z' : 'Name A–Z'}</option>
            <option value="name_desc">{isEs ? 'Nombre Z–A' : 'Name Z–A'}</option>
            <option value="adherence_desc">{isEs ? 'Mayor adherencia' : 'Highest adherence'}</option>
            <option value="adherence_asc">{isEs ? 'Menor adherencia' : 'Lowest adherence'}</option>
            <option value="recent">{isEs ? 'Actividad reciente' : 'Recent activity'}</option>
          </WlListFieldSelect>
        </div>
      </div>
    </div>
  );
}
