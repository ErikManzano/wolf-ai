import type { ExerciseVariationCode } from '../../models/exercise';
import { WL_CATALOG_GROUP_LABELS, type CatalogGrupoFilter } from '../../data/wlCatalogGroups';
import type { SessionPickerOption } from '../../services/exercise';
import {
  MUSCLE_CHIP_ORDER,
  MUSCLE_LABELS,
  type MuscleGroupFilter,
} from '../wl-exercises/exerciseListUtils';
import type { CatalogSidebarItem } from '../wl-exercises/WlExerciseCatalogSidebarList';
import {
  buildPickerMuscleCounts,
  buildPickerVariationCounts,
  PICKER_VARIATION_ORDER,
  type PickerVariationFilter,
} from './ExercisePickerFamilyFilters';
import { PICKER_CATALOG_SECTIONS, type PickerCatalogSection } from './exercisePickerCatalogUtils';

export function buildPickerMuscleSidebarItems(
  isEs: boolean,
  options: SessionPickerOption[],
): CatalogSidebarItem[] {
  const counts = buildPickerMuscleCounts(options);
  const items: CatalogSidebarItem[] = [
    { id: 'all', label: isEs ? 'Todos' : 'All', count: counts.get('all') ?? 0 },
  ];
  for (const code of MUSCLE_CHIP_ORDER) {
    const count = counts.get(code) ?? 0;
    if (count === 0) continue;
    items.push({
      id: code,
      label: isEs ? MUSCLE_LABELS[code].es : MUSCLE_LABELS[code].en,
      count,
      indent: true,
      icon: 'folder',
    });
  }
  return items;
}

export function buildPickerVariationSidebarItems(
  isEs: boolean,
  options: SessionPickerOption[],
  variationLabels: Record<ExerciseVariationCode, string>,
): CatalogSidebarItem[] {
  const counts = buildPickerVariationCounts(options);
  const items: CatalogSidebarItem[] = [
    { id: 'all', label: isEs ? 'Todos' : 'All', count: counts.get('all') ?? 0 },
  ];
  for (const code of PICKER_VARIATION_ORDER) {
    const count = counts.get(code) ?? 0;
    items.push({
      id: code,
      label: variationLabels[code] ?? code,
      count,
      disabled: count === 0,
      indent: true,
    });
  }
  return items;
}

export function pickerCatalogFilterSummary(
  isEs: boolean,
  state: {
    section: PickerCatalogSection;
    catalogGrupo: CatalogGrupoFilter;
    muscle: MuscleGroupFilter;
    variation: PickerVariationFilter;
  },
): string {
  const parts: string[] = [];
  if (state.section !== 'all') {
    const sec = PICKER_CATALOG_SECTIONS.find((s) => s.id === state.section);
    if (sec) parts.push(isEs ? sec.es : sec.en);
  }
  if (state.catalogGrupo !== 'all') {
    const label = WL_CATALOG_GROUP_LABELS[state.catalogGrupo];
    if (label) parts.push(isEs ? label.chipEs : label.chipEn);
  }
  if (state.muscle !== 'all') {
    parts.push(isEs ? MUSCLE_LABELS[state.muscle].es : MUSCLE_LABELS[state.muscle].en);
  }
  if (state.variation !== 'all') {
    parts.push(state.variation);
  }
  return parts.join(' · ');
}
