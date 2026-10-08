import type { ExerciseVariationCode } from '../../models/exercise';
import type { CatalogGrupoFilter } from '../../data/wlCatalogGroups';
import type { SessionPickerOption } from '../../services/exercise';
import { WlExerciseGrupoChips } from '../wl-exercises/WlExerciseGrupoChips';
import {
  WlExerciseCatalogSidebarList,
  type CatalogSidebarItem,
} from '../wl-exercises/WlExerciseCatalogSidebarList';
import { catalogSectionUsesMuscles, type MuscleGroupFilter } from '../wl-exercises/exerciseListUtils';
import type { ExerciseQuickFilter } from '../wl-exercises/types';
import { Library } from 'lucide-react';
import type { PickerVariationFilter } from './ExercisePickerFamilyFilters';
import {
  buildPickerCatalogGrupoCounts,
  buildPickerSectionCounts,
  filterPickerByCatalogGrupo,
  filterPickerOptionsBySection,
  PICKER_CATALOG_SECTIONS,
  type PickerCatalogSection,
} from './exercisePickerCatalogUtils';
import {
  buildPickerMuscleSidebarItems,
  buildPickerVariationSidebarItems,
} from './pickerSidebarItems';

export function ExercisePickerCatalogSidebar({
  isEs,
  options,
  section,
  onSectionChange,
  catalogGrupoFilter,
  onCatalogGrupoChange,
  muscleFilter,
  onMuscleChange,
  variationFilter,
  onVariationChange,
  variationLabels,
  onQuickFilterChange,
}: {
  isEs: boolean;
  options: SessionPickerOption[];
  section: PickerCatalogSection;
  onSectionChange: (section: PickerCatalogSection) => void;
  catalogGrupoFilter: CatalogGrupoFilter;
  onCatalogGrupoChange: (grupo: CatalogGrupoFilter) => void;
  muscleFilter: MuscleGroupFilter;
  onMuscleChange: (muscle: MuscleGroupFilter) => void;
  variationFilter: PickerVariationFilter;
  onVariationChange: (variation: PickerVariationFilter) => void;
  variationLabels: Record<ExerciseVariationCode, string>;
  onQuickFilterChange: (filter: ExerciseQuickFilter) => void;
}) {
  const sectionCounts = buildPickerSectionCounts(options);
  const sectionPool = filterPickerOptionsBySection(options, section);
  const catalogGrupoCounts = buildPickerCatalogGrupoCounts(sectionPool);
  const afterGrupo = filterPickerByCatalogGrupo(sectionPool, catalogGrupoFilter);

  const showGrupoRefine = section === 'weightlifting';
  const showMuscleRefine = section !== 'all' && catalogSectionUsesMuscles(section);
  const showVariationRefine = section === 'weightlifting' && catalogGrupoFilter !== 'all';
  const sectionChosen = section !== 'all';

  const sectionItems: CatalogSidebarItem[] = PICKER_CATALOG_SECTIONS.filter(
    (chip) => chip.id === 'all' || (sectionCounts[chip.id] ?? 0) > 0,
  ).map((chip) => ({
    id: chip.id,
    label: isEs ? chip.es : chip.en,
    count: sectionCounts[chip.id] ?? 0,
    icon: chip.id === 'all' ? undefined : ('folder' as const),
  }));

  const muscleItems = buildPickerMuscleSidebarItems(isEs, sectionPool);
  const variationItems = buildPickerVariationSidebarItems(isEs, afterGrupo, variationLabels).filter(
    (item) => item.id === 'all' || (item.count ?? 0) > 0,
  );

  return (
    <nav
      className="wl-exercise-catalog-sidebar wolf-se-picker-catalog-sidebar"
      aria-label={isEs ? 'Explorar catálogo' : 'Browse catalog'}
    >
      <div className="wl-exercise-catalog-sidebar__head wolf-se-picker-catalog-sidebar__head">
        <Library size={16} strokeWidth={2.25} aria-hidden />
        <span>{isEs ? 'Biblioteca' : 'Library'}</span>
      </div>

      <div className="wolf-se-picker-catalog-sidebar__scroll">
        <p className="wl-exercise-catalog-sidebar__kicker">{isEs ? 'Secciones' : 'Sections'}</p>
        <WlExerciseCatalogSidebarList
          preventFocusSteal
          ariaLabel={isEs ? 'Secciones del catálogo' : 'Catalog sections'}
          items={sectionItems}
          activeId={section}
          onChange={(id) => onSectionChange(id as PickerCatalogSection)}
        />

        {sectionChosen && showMuscleRefine ? (
          <div className="wolf-se-picker-catalog-sidebar__folder">
            <p className="wl-exercise-catalog-sidebar__kicker wl-exercise-catalog-sidebar__kicker--nested">
              {isEs ? 'Músculo' : 'Muscle'}
            </p>
            <WlExerciseCatalogSidebarList
              preventFocusSteal
              nested
              ariaLabel={isEs ? 'Grupo muscular' : 'Muscle group'}
              items={muscleItems}
              activeId={muscleFilter}
              onChange={(id) => {
                onQuickFilterChange('none');
                onMuscleChange(id as MuscleGroupFilter);
              }}
            />
          </div>
        ) : null}

        {sectionChosen && showGrupoRefine ? (
          <div className="wolf-se-picker-catalog-sidebar__folder">
            <p className="wl-exercise-catalog-sidebar__kicker wl-exercise-catalog-sidebar__kicker--nested">
              {isEs ? 'Grupos' : 'Groups'}
            </p>
            <WlExerciseGrupoChips
              isEs={isEs}
              catalogGrupo={catalogGrupoFilter}
              counts={catalogGrupoCounts}
              onChange={onCatalogGrupoChange}
              sidebar
              preventFocusSteal
            />
          </div>
        ) : null}

        {showVariationRefine ? (
          <div className="wolf-se-picker-catalog-sidebar__folder wolf-se-picker-catalog-sidebar__folder--deep">
            <p className="wl-exercise-catalog-sidebar__kicker wl-exercise-catalog-sidebar__kicker--nested">
              {isEs ? 'Variación' : 'Variation'}
            </p>
            <WlExerciseCatalogSidebarList
              preventFocusSteal
              nested
              ariaLabel={isEs ? 'Variación' : 'Variation'}
              items={variationItems}
              activeId={variationFilter}
              onChange={(id) => onVariationChange(id as PickerVariationFilter)}
            />
          </div>
        ) : null}
      </div>
    </nav>
  );
}
