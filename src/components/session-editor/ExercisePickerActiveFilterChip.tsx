import type { CatalogGrupoFilter } from '../../data/wlCatalogGroups';
import type { MuscleGroupFilter } from '../wl-exercises/exerciseListUtils';
import type { PickerVariationFilter } from './ExercisePickerFamilyFilters';
import { pickerCatalogFilterSummary } from './pickerSidebarItems';
import type { PickerCatalogSection } from './exercisePickerCatalogUtils';

export function ExercisePickerActiveFilterChip({
  isEs,
  section,
  catalogGrupo,
  muscle,
  variation,
  onClearFilters,
  onShowCatalog,
}: {
  isEs: boolean;
  section: PickerCatalogSection;
  catalogGrupo: CatalogGrupoFilter;
  muscle: MuscleGroupFilter;
  variation: PickerVariationFilter;
  onClearFilters: () => void;
  onShowCatalog: () => void;
}) {
  const summary = pickerCatalogFilterSummary(isEs, {
    section,
    catalogGrupo,
    muscle,
    variation,
  });
  const hasFilters =
    section !== 'all' ||
    catalogGrupo !== 'all' ||
    muscle !== 'all' ||
    variation !== 'all';

  return (
    <div className="wolf-se-picker-filter-bar">
      {summary ? (
        <span className="wolf-se-picker-filter-bar__chip" title={summary}>
          {summary}
        </span>
      ) : (
        <span className="wolf-se-picker-filter-bar__hint">
          {isEs ? 'Buscando en todo el catálogo' : 'Searching full catalog'}
        </span>
      )}
      <div className="wolf-se-picker-filter-bar__actions">
        <button type="button" className="wolf-se-picker-filter-bar__btn" onPointerDown={(e) => e.preventDefault()} onClick={onShowCatalog}>
          {isEs ? 'Catálogo' : 'Catalog'}
        </button>
        {hasFilters ? (
          <button
            type="button"
            className="wolf-se-picker-filter-bar__btn wolf-se-picker-filter-bar__btn--muted"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onClearFilters}
          >
            {isEs ? 'Limpiar filtros' : 'Clear filters'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
