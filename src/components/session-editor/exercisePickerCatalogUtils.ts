import {
  catalogGrupoFromPickerTags,
  type CatalogGrupoFilter,
} from '../../data/wlCatalogGroups';
import type { SessionPickerOption } from '../../services/exercise';
import { catalogSectionUsesMuscles } from '../wl-exercises/exerciseListUtils';
import { pickerCatalogGroup } from './exerciseAutocompleteUtils';
import {
  filterPickerByFamily,
  filterPickerByMuscleGroup,
  filterPickerByVariation,
  type PickerFamilyFilter,
  type PickerVariationFilter,
} from './ExercisePickerFamilyFilters';
import type { MuscleGroupFilter } from '../wl-exercises/exerciseListUtils';
import type { BrowseModalSectionFilter } from './exerciseAutocompleteUtils';

export type PickerCatalogSection = BrowseModalSectionFilter;

export const PICKER_CATALOG_SECTIONS: { id: PickerCatalogSection; es: string; en: string }[] = [
  { id: 'all', es: 'Todos', en: 'All' },
  { id: 'weightlifting', es: 'Halterofilia', en: 'Weightlifting' },
  { id: 'foam', es: 'Foam roller', en: 'Foam roller' },
  { id: 'warmup', es: 'Calentamiento', en: 'Warm-up' },
  { id: 'strength', es: 'Fuerza', en: 'Strength' },
  { id: 'bodyweight', es: 'Peso corporal', en: 'Bodyweight' },
];

export const WL_PICKER_FAMILY_GROUPS = new Set(['snatch', 'clean', 'jerk', 'pull', 'squat', 'press']);

function pickerCatalogGrupoTag(opt: SessionPickerOption): string | null {
  const grupo = catalogGrupoFromPickerTags(opt.tags, opt.id) ?? opt.catalogGroup ?? null;
  return grupo && /^grupo_\d+$/.test(grupo) ? grupo : null;
}

/** Halterofilia = familias olímpicas o movimientos del catálogo búlgaro (grupo_1…15). */
export function pickerOptionInWeightliftingSection(opt: SessionPickerOption): boolean {
  if (pickerCatalogGrupoTag(opt)) return true;
  return WL_PICKER_FAMILY_GROUPS.has(pickerCatalogGroup(opt));
}

export function filterPickerOptionsBySection(
  options: SessionPickerOption[],
  section: PickerCatalogSection,
): SessionPickerOption[] {
  if (section === 'all') return options;
  return options.filter((opt) => {
    if (section === 'weightlifting') return pickerOptionInWeightliftingSection(opt);
    return pickerCatalogGroup(opt) === section;
  });
}

export function buildPickerSectionCounts(options: SessionPickerOption[]): Record<string, number> {
  const counts: Record<string, number> = { all: options.length };
  for (const opt of options) {
    if (pickerOptionInWeightliftingSection(opt)) {
      counts.weightlifting = (counts.weightlifting ?? 0) + 1;
    }
    const group = pickerCatalogGroup(opt);
    if (group === 'foam' || group === 'warmup' || group === 'strength' || group === 'bodyweight') {
      counts[group] = (counts[group] ?? 0) + 1;
    }
  }
  return counts;
}

export function buildPickerCatalogGrupoCounts(options: SessionPickerOption[]): Record<string, number> {
  const counts: Record<string, number> = { all: options.length };
  for (const opt of options) {
    const grupo = catalogGrupoFromPickerTags(opt.tags, opt.id) ?? opt.catalogGroup ?? null;
    if (grupo && /^grupo_\d+$/.test(grupo)) {
      counts[grupo] = (counts[grupo] ?? 0) + 1;
    }
  }
  return counts;
}

export function filterPickerByCatalogGrupo(
  options: SessionPickerOption[],
  catalogGrupo: CatalogGrupoFilter,
): SessionPickerOption[] {
  if (catalogGrupo === 'all') return options;
  return options.filter((opt) => {
    const grupo = catalogGrupoFromPickerTags(opt.tags, opt.id) ?? opt.catalogGroup ?? null;
    return grupo === catalogGrupo;
  });
}

export interface PickerCatalogFilterState {
  section: PickerCatalogSection;
  familyFilter: PickerFamilyFilter;
  muscleFilter: MuscleGroupFilter;
  variationFilter: PickerVariationFilter;
  catalogGrupoFilter: CatalogGrupoFilter;
}

export function computePickerOptionPool(
  options: SessionPickerOption[],
  filters: PickerCatalogFilterState,
): SessionPickerOption[] {
  const sectionPool = filterPickerOptionsBySection(options, filters.section);

  if (filters.section === 'weightlifting') {
    const afterGrupo = filterPickerByCatalogGrupo(sectionPool, filters.catalogGrupoFilter);
    if (filters.catalogGrupoFilter !== 'all') {
      return filterPickerByVariation(afterGrupo, filters.variationFilter);
    }
    return afterGrupo;
  }

  const afterFamily = filterPickerByFamily(
    sectionPool,
    filters.section === 'all' ? filters.familyFilter : 'all',
  );

  const afterMuscle = catalogSectionUsesMuscles(filters.section)
    ? filterPickerByMuscleGroup(afterFamily, filters.muscleFilter)
    : afterFamily;

  return afterMuscle;
}
