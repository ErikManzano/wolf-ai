import { Plus, SlidersHorizontal } from 'lucide-react';
import type { AthleteSortId } from './athleteListUtils';
import { WlListFieldSelect } from '../wl-shared/WlListFieldSelect';
import { WlSearchField } from '../wl-shared/WlSearchField';
import { WlToolbarIconButton } from '../wl-shared/WlToolbarIconButton';

const SORT_OPTIONS: { id: AthleteSortId; labelEs: string; labelEn: string }[] = [
  { id: 'name_asc', labelEs: 'Nombre A–Z', labelEn: 'Name A–Z' },
  { id: 'name_desc', labelEs: 'Nombre Z–A', labelEn: 'Name Z–A' },
  { id: 'adherence_desc', labelEs: 'Mayor adherencia', labelEn: 'Highest adherence' },
  { id: 'adherence_asc', labelEs: 'Menor adherencia', labelEn: 'Lowest adherence' },
  { id: 'recent', labelEs: 'Actividad reciente', labelEn: 'Recent activity' },
];

export function WlAthletesToolbar({
  isEs,
  isMobile,
  search,
  onSearchChange,
  sort,
  onSortChange,
  canAdd,
  onAdd,
}: {
  isEs: boolean;
  isMobile: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  sort: AthleteSortId;
  onSortChange: (id: AthleteSortId) => void;
  canAdd?: boolean;
  onAdd?: () => void;
}) {
  return (
    <div className="wl-athletes-toolbar">
      <div className={`wl-list-toolbar${isMobile ? ' wl-list-toolbar--inline-mobile' : ''}`}>
        <div className="wl-list-toolbar__main">
          <WlSearchField
            value={search}
            onChange={onSearchChange}
            placeholder={isEs ? 'Buscar atleta…' : 'Search athlete…'}
            ariaLabel={isEs ? 'Buscar atleta' : 'Search athlete'}
          />
          {isMobile ? (
            <div className="wl-list-toolbar__actions">
              <WlToolbarIconButton
                active={sort !== 'name_asc'}
                ariaLabel={isEs ? 'Restablecer orden' : 'Reset sort'}
                onClick={() => {
                  if (sort !== 'name_asc') onSortChange('name_asc');
                }}
              >
                <SlidersHorizontal size={16} />
              </WlToolbarIconButton>
              {canAdd && onAdd ? (
                <WlToolbarIconButton
                  variant="accent"
                  ariaLabel={isEs ? 'Añadir atleta' : 'Add athlete'}
                  onClick={onAdd}
                >
                  <Plus size={20} strokeWidth={2.5} />
                </WlToolbarIconButton>
              ) : null}
            </div>
          ) : (
            <WlListFieldSelect
              icon={SlidersHorizontal}
              value={sort}
              onChange={(value) => onSortChange(value as AthleteSortId)}
              ariaLabel={isEs ? 'Ordenar' : 'Sort'}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {isEs ? option.labelEs : option.labelEn}
                </option>
              ))}
            </WlListFieldSelect>
          )}
        </div>
      </div>

      {isMobile ? (
        <div className="wl-list-filter-chips wl-list-filter-chips--mobile">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`wl-list-filter-chip${sort === option.id ? ' is-active' : ''}`}
              onClick={() => onSortChange(option.id)}
            >
              {isEs ? option.labelEs : option.labelEn}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
