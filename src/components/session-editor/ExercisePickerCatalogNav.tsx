import type { ExerciseVariationCode } from '../../models/exercise';
import type { CatalogGrupoFilter } from '../../data/wlCatalogGroups';
import type { SessionPickerOption } from '../../services/exercise';
import type { MuscleGroupFilter } from '../wl-exercises/exerciseListUtils';
import type { ExerciseQuickFilter } from '../wl-exercises/types';
import type { PickerFamilyFilter, PickerVariationFilter } from './ExercisePickerFamilyFilters';
import { ExercisePickerCatalogSidebar } from './ExercisePickerCatalogSidebar';
import type { PickerCatalogSection } from './exercisePickerCatalogUtils';

/** @deprecated Prefer ExercisePickerCatalogSidebar inside ExercisePickerPanelSplit. */
export function ExercisePickerCatalogNav({
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
  quickFilter?: ExerciseQuickFilter;
  favoriteCount?: number;
  recentCount?: number;
  compact?: boolean;
  familyFilter?: PickerFamilyFilter;
  onFamilyChange?: (family: PickerFamilyFilter) => void;
}) {
  return (
    <ExercisePickerCatalogSidebar
      isEs={isEs}
      options={options}
      section={section}
      onSectionChange={onSectionChange}
      catalogGrupoFilter={catalogGrupoFilter}
      onCatalogGrupoChange={onCatalogGrupoChange}
      muscleFilter={muscleFilter}
      onMuscleChange={onMuscleChange}
      variationFilter={variationFilter}
      onVariationChange={onVariationChange}
      variationLabels={variationLabels}
      onQuickFilterChange={onQuickFilterChange}
    />
  );
}
