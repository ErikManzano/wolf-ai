import type { CoachProgramRow } from '../../models/coach-architecture';
import type {
  ExerciseFamilyCode,
  MergedDefinitionView,
} from '../../models/exercise';
import { isSingleComposition } from '../../models/exercise';

export type ExerciseFamilyFilter = ExerciseFamilyCode | 'all';
export type MuscleGroupFilter =
  | 'all'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'forearms'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'full_body';
export type ExerciseOriginFilter = 'all' | 'official' | 'mine' | 'archived';
export type ExerciseSortId = 'name_asc' | 'recent';
export type ExerciseDisciplineFilter =
  | 'all'
  | 'weightlifting'
  | 'accessory'
  | 'powerlifting'
  | 'streetlifting'
  | 'bodybuilding'
  | 'running'
  | 'high_performance';

export const MUSCLE_CHIP_ORDER: Exclude<MuscleGroupFilter, 'all'>[] = [
  'chest',
  'back',
  'shoulders',
  'forearms',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'full_body',
];

export const MUSCLE_LABELS: Record<Exclude<MuscleGroupFilter, 'all'>, { es: string; en: string }> = {
  chest: { es: 'Pecho', en: 'Chest' },
  back: { es: 'Espalda', en: 'Back' },
  shoulders: { es: 'Hombros', en: 'Shoulders' },
  forearms: { es: 'Antebrazos', en: 'Forearms' },
  triceps: { es: 'Tríceps', en: 'Triceps' },
  quads: { es: 'Piernas', en: 'Legs' },
  hamstrings: { es: 'Isquios', en: 'Hamstrings' },
  glutes: { es: 'Glúteos', en: 'Glutes' },
  calves: { es: 'Pantorrillas', en: 'Calves' },
  core: { es: 'Abdomen', en: 'Core' },
  full_body: { es: 'Cuerpo completo', en: 'Full body' },
};

export const FAMILY_CHIP_ORDER: ExerciseFamilyCode[] = [
  'snatch',
  'clean',
  'jerk',
  'pull',
  'squat',
  'press',
  'accessory',
];

export const DISCIPLINE_OPTIONS: {
  id: ExerciseDisciplineFilter;
  labelEs: string;
  labelEn: string;
  hasCatalog: boolean;
}[] = [
  { id: 'all', labelEs: 'Todas', labelEn: 'All', hasCatalog: true },
  { id: 'weightlifting', labelEs: 'Halterofilia', labelEn: 'Weightlifting', hasCatalog: true },
  { id: 'accessory', labelEs: 'Accesorios', labelEn: 'Accessories', hasCatalog: true },
  { id: 'powerlifting', labelEs: 'Powerlifting', labelEn: 'Powerlifting', hasCatalog: false },
  { id: 'streetlifting', labelEs: 'Streetlifting', labelEn: 'Streetlifting', hasCatalog: false },
  { id: 'bodybuilding', labelEs: 'Culturismo', labelEn: 'Bodybuilding', hasCatalog: true },
  { id: 'running', labelEs: 'Running', labelEn: 'Running', hasCatalog: false },
  { id: 'high_performance', labelEs: 'Alto rendimiento', labelEn: 'High performance', hasCatalog: false },
];

export const ORIGIN_OPTIONS: { id: ExerciseOriginFilter; labelEs: string; labelEn: string }[] = [
  { id: 'all', labelEs: 'Todos', labelEn: 'All' },
  { id: 'official', labelEs: 'Oficial', labelEn: 'Official' },
  { id: 'mine', labelEs: 'Míos', labelEn: 'Mine' },
  { id: 'archived', labelEs: 'Archivados', labelEn: 'Archived' },
];

export const SORT_OPTIONS: { id: ExerciseSortId; labelEs: string; labelEn: string }[] = [
  { id: 'name_asc', labelEs: 'A–Z', labelEn: 'A–Z' },
  { id: 'recent', labelEs: 'Recientes', labelEn: 'Recent' },
];

export function inferExerciseDiscipline(def: MergedDefinitionView): 'weightlifting' | 'accessory' {
  const family =
    def.family ?? (isSingleComposition(def.composition) ? def.composition.family : null);
  return family === 'accessory' ? 'accessory' : 'weightlifting';
}

export function muscleGroupFromTags(tags: string[]): MuscleGroupFilter | null {
  const hit = tags.find((tag) => tag.startsWith('muscle:'));
  if (!hit) return null;
  const code = hit.slice('muscle:'.length) as MuscleGroupFilter;
  return MUSCLE_CHIP_ORDER.includes(code as Exclude<MuscleGroupFilter, 'all'>) ? code : null;
}

export function usesMuscleGroupChips(discipline: ExerciseDisciplineFilter): boolean {
  return discipline === 'accessory' || discipline === 'bodybuilding';
}

export function definitionFamily(def: MergedDefinitionView): ExerciseFamilyCode | null {
  if (def.family) return def.family;
  if (isSingleComposition(def.composition)) return def.composition.family;
  return def.composition.segments[0]?.family ?? null;
}

export function filterExerciseDefinitions(
  definitions: MergedDefinitionView[],
  opts: {
    search: string;
    family: ExerciseFamilyFilter;
    muscleGroup?: MuscleGroupFilter;
    origin: ExerciseOriginFilter;
    discipline: ExerciseDisciplineFilter;
  },
): MergedDefinitionView[] {
  const q = opts.search.trim().toLowerCase();
  return definitions.filter((def) => {
    if (opts.origin === 'official' && def.coachId) return false;
    if (opts.origin === 'mine' && !def.coachId) return false;
    if (opts.origin === 'archived') {
      if (def.lifecycleStatus !== 'deprecated' && !def.hiddenByCoach) return false;
    } else if (def.lifecycleStatus === 'deprecated') {
      return false;
    }

    const inferred = inferExerciseDiscipline(def);
    if (
      (opts.discipline === 'accessory' || opts.discipline === 'bodybuilding') &&
      inferred !== 'accessory'
    ) {
      return false;
    }
    if (opts.discipline === 'weightlifting' && inferred !== 'weightlifting') return false;
    if (
      opts.discipline !== 'all' &&
      opts.discipline !== 'accessory' &&
      opts.discipline !== 'weightlifting' &&
      opts.discipline !== 'bodybuilding'
    ) {
      return false;
    }

    if (opts.muscleGroup && opts.muscleGroup !== 'all') {
      const group = muscleGroupFromTags(def.tags);
      if (group !== opts.muscleGroup) return false;
    }

    if (opts.family !== 'all' && definitionFamily(def) !== opts.family) return false;

    if (!q) return true;
    return (
      def.effectiveDisplayName.toLowerCase().includes(q) ||
      def.searchText.toLowerCase().includes(q) ||
      def.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });
}

export function sortExerciseDefinitions(
  definitions: MergedDefinitionView[],
  sort: ExerciseSortId,
): MergedDefinitionView[] {
  const copy = [...definitions];
  if (sort === 'recent') {
    copy.sort((a, b) => {
      const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? '') || 0;
      const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? '') || 0;
      return bTime - aTime;
    });
    return copy;
  }
  copy.sort((a, b) => a.effectiveDisplayName.localeCompare(b.effectiveDisplayName, 'es'));
  return copy;
}

export function familyCounts(definitions: MergedDefinitionView[]): Record<string, number> {
  const counts: Record<string, number> = { all: definitions.length };
  for (const def of definitions) {
    const family = definitionFamily(def) ?? 'accessory';
    counts[family] = (counts[family] ?? 0) + 1;
  }
  return counts;
}

export function muscleGroupCounts(definitions: MergedDefinitionView[]): Record<string, number> {
  const counts: Record<string, number> = { all: definitions.length };
  for (const def of definitions) {
    const group = muscleGroupFromTags(def.tags) ?? 'full_body';
    counts[group] = (counts[group] ?? 0) + 1;
  }
  return counts;
}

export function countExerciseUsage(programs: CoachProgramRow[], def: MergedDefinitionView): number {
  const ids = new Set([def.id, def.legacyExerciseId].filter((id): id is string => Boolean(id)));
  let n = 0;
  for (const row of programs) {
    let used = false;
    for (const week of row.program.weeks ?? []) {
      for (const day of week.days ?? []) {
        for (const block of day.session?.exercises ?? []) {
          if (ids.has(block.exerciseId)) {
            used = true;
            break;
          }
          if (block.segments?.some((seg) => ids.has(seg.exerciseId))) {
            used = true;
            break;
          }
        }
        if (used) break;
      }
      if (used) break;
    }
    if (used) n += 1;
  }
  return n;
}

export function taxonomyLabel(
  items: { code: string; labelEs: string; labelEn: string }[],
  code: string | null | undefined,
  isEs: boolean,
): string {
  if (!code) return '—';
  const item = items.find((entry) => entry.code === code);
  if (!item) return code;
  return isEs ? item.labelEs : item.labelEn;
}
