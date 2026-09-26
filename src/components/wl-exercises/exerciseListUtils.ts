import type { CoachProgramRow } from '../../models/coach-architecture';
import type {
  ExerciseDefinitionInput,
  ExerciseFamilyCode,
  ExerciseLoadAnchorCode,
  MergedDefinitionView,
  TrainingObjectiveCode,
} from '../../models/exercise';
import {
  customFamilyFilterKey,
  customFamilyIdFromTags,
  isCustomFamilyFilter,
  parseCustomFamilyFilterKey,
} from '../../models/exercise/coachFamily';
import { isSingleComposition } from '../../models/exercise';
import type { Exercise } from '../../models/training';
import type {
  ExerciseFamilyId,
  ExerciseListItem,
  ExerciseListNode,
  ExerciseListSortState,
  ExerciseQuickFilter,
  ExerciseSortColumn,
  ExerciseSortDirection,
} from './types';

export type ExerciseFamilyFilter = ExerciseFamilyCode | 'all' | `folder:${string}`;
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
export type ExerciseSortId = 'created_desc' | 'name_asc' | 'usage_desc' | 'recent' | 'family';

export const DEFAULT_EXERCISE_SORT: ExerciseSortId = 'created_desc';
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

/** Nombres de familia en inglés de coaching — no mezclar con español. */
export const FAMILY_DISPLAY_LABEL: Record<ExerciseFamilyId, string> = {
  snatch: 'Snatch',
  clean: 'Clean',
  jerk: 'Jerk',
  pull: 'Pull',
  squat: 'Squat',
  press: 'Press',
  accessory: 'Accessory',
  core: 'Core',
};

export const INTENSITY_REF_LABEL: Record<ExerciseLoadAnchorCode, string | null> = {
  auto: null,
  snatch: 'Snatch',
  clean_jerk: 'C&J',
  back_squat: 'Back squat',
  front_squat: 'Front squat',
};

/** Colores de punto por objetivo de entrenamiento. */
export const OBJECTIVE_DOT_COLOR: Record<TrainingObjectiveCode, string> = {
  technique: '#ea580c',
  strength: '#2563eb',
  speed: '#7c3aed',
  positional: '#d97706',
  pulling_strength: '#15803d',
  recovery: '#71717a',
};

export const GROUP_HEADER_HEIGHT = 32;
export const LIST_ROW_HEIGHT_COMPACT = 46;
export const LIST_ROW_HEIGHT_DETAILED = 56;
export const EXERCISES_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export type ExercisesPageSize = (typeof EXERCISES_PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_EXERCISES_PAGE_SIZE: ExercisesPageSize = 25;

export function isExercisesPageSize(value: number): value is ExercisesPageSize {
  return (EXERCISES_PAGE_SIZE_OPTIONS as readonly number[]).includes(value);
}

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

export const SORT_OPTIONS: {
  id: ExerciseSortId;
  labelEs: string;
  labelEn: string;
  shortEs: string;
  shortEn: string;
}[] = [
  { id: 'created_desc', labelEs: 'Más recientes', labelEn: 'Newest first', shortEs: 'Reciente', shortEn: 'Newest' },
  { id: 'name_asc', labelEs: 'A–Z', labelEn: 'A–Z', shortEs: 'A–Z', shortEn: 'A–Z' },
  { id: 'usage_desc', labelEs: 'Más usados', labelEn: 'Most used', shortEs: 'Uso', shortEn: 'Usage' },
  { id: 'recent', labelEs: 'Recientes', labelEn: 'Recent', shortEs: 'Reciente', shortEn: 'Recent' },
  { id: 'family', labelEs: 'Familia', labelEn: 'Family', shortEs: 'Familia', shortEn: 'Family' },
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

/** True si el input cambia composición u objetivo respecto al ejercicio base (no solo carpeta). */
export function hasExerciseDefinitionChanged(
  initial: MergedDefinitionView,
  input: ExerciseDefinitionInput,
): boolean {
  if (input.objective !== initial.objective) return true;
  if (input.loadAnchor !== initial.loadAnchor) return true;
  if (input.kind !== initial.kind) return true;
  if (input.kind === 'complex' || initial.kind === 'complex') {
    return JSON.stringify(input.composition) !== JSON.stringify(initial.composition);
  }
  if (!isSingleComposition(input.composition) || !isSingleComposition(initial.composition)) return true;
  const next = input.composition;
  const seed = initial.composition;
  return (
    next.family !== seed.family ||
    next.variation !== seed.variation ||
    next.startPosition !== seed.startPosition ||
    JSON.stringify(next.modifiers) !== JSON.stringify(seed.modifiers)
  );
}

export function filterExerciseDefinitions(
  definitions: MergedDefinitionView[],
  opts: {
    search: string;
    family: ExerciseFamilyFilter;
    muscleGroup?: MuscleGroupFilter;
    origin: ExerciseOriginFilter;
    discipline: ExerciseDisciplineFilter;
    minUsage?: number;
    usageById?: Map<string, number>;
    quickFilter?: ExerciseQuickFilter;
    favoriteIds?: Set<string>;
    recentIds?: Set<string>;
    accessorySubFilter?: 'all' | 'unfiled';
  },
): MergedDefinitionView[] {
  const q = opts.search.trim().toLowerCase();
  const minUsage = opts.minUsage ?? 0;
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

    if (opts.quickFilter === 'favorites' && !opts.favoriteIds?.has(def.id)) return false;
    if (opts.quickFilter === 'recent' && !opts.recentIds?.has(def.id)) return false;

    if (opts.family !== 'all') {
      const customFilterId = parseCustomFamilyFilterKey(opts.family);
      if (customFilterId) {
        if (customFamilyIdFromTags(def.tags) !== customFilterId) return false;
      } else if (definitionFamily(def) !== opts.family) {
        return false;
      }
    }

    if (opts.family === 'accessory' && opts.accessorySubFilter === 'unfiled') {
      if (customFamilyIdFromTags(def.tags)) return false;
    }

    if (minUsage > 0) {
      const used = opts.usageById?.get(def.id) ?? 0;
      if (used < minUsage) return false;
    }

    if (!q) return true;
    return (
      def.effectiveDisplayName.toLowerCase().includes(q) ||
      def.searchText.toLowerCase().includes(q) ||
      def.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });
}

export function sortStateToSortId(state: ExerciseListSortState): ExerciseSortId {
  if (state.column === 'recent') return 'recent';
  if (state.column === 'created' && state.direction === 'desc') return 'created_desc';
  if (state.column === 'usage' && state.direction === 'desc') return 'usage_desc';
  if (state.column === 'family' && state.direction === 'asc') return 'family';
  if (state.column === 'name' && state.direction === 'asc') return 'name_asc';
  return DEFAULT_EXERCISE_SORT;
}

export function sortIdToSortState(sort: ExerciseSortId): ExerciseListSortState {
  switch (sort) {
    case 'created_desc':
      return { column: 'created', direction: 'desc' };
    case 'usage_desc':
      return { column: 'usage', direction: 'desc' };
    case 'recent':
      return { column: 'recent', direction: 'desc' };
    case 'family':
      return { column: 'family', direction: 'asc' };
    default:
      return { column: 'name', direction: 'asc' };
  }
}

export function toggleColumnSort(
  current: ExerciseListSortState,
  column: ExerciseSortColumn,
): ExerciseListSortState {
  if (current.column === column) {
    return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  const defaultDir: ExerciseSortDirection =
    column === 'usage' || column === 'recent' || column === 'created' || column === 'updated'
      ? 'desc'
      : 'asc';
  return { column, direction: defaultDir };
}

export function sortExerciseDefinitions(
  definitions: MergedDefinitionView[],
  sort: ExerciseSortId,
  extra?: {
    usageById?: Map<string, number>;
    recentOrder?: string[];
  },
): MergedDefinitionView[] {
  return sortExerciseDefinitionsByState(definitions, sortIdToSortState(sort), extra);
}

export function sortExerciseDefinitionsByState(
  definitions: MergedDefinitionView[],
  state: ExerciseListSortState,
  extra?: {
    usageById?: Map<string, number>;
    recentOrder?: string[];
  },
): MergedDefinitionView[] {
  const copy = [...definitions];
  const dir = state.direction === 'asc' ? 1 : -1;

  const compareName = (a: MergedDefinitionView, b: MergedDefinitionView) =>
    a.effectiveDisplayName.localeCompare(b.effectiveDisplayName, 'es');

  if (state.column === 'recent') {
    const order = extra?.recentOrder;
    if (order && order.length > 0) {
      const rank = new Map(order.map((id, index) => [id, index]));
      copy.sort((a, b) => {
        const aRank = rank.get(a.id);
        const bRank = rank.get(b.id);
        if (aRank != null && bRank != null) return (aRank - bRank) * dir;
        if (aRank != null) return -1;
        if (bRank != null) return 1;
        const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? '') || 0;
        const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? '') || 0;
        return (bTime - aTime) * dir;
      });
      return copy;
    }
    copy.sort((a, b) => {
      const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? '') || 0;
      const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? '') || 0;
      return (bTime - aTime) * dir;
    });
    return copy;
  }

  if (state.column === 'usage') {
    const usage = extra?.usageById;
    copy.sort((a, b) => {
      const diff = (usage?.get(a.id) ?? 0) - (usage?.get(b.id) ?? 0);
      if (diff !== 0) return diff * dir;
      return compareName(a, b);
    });
    return copy;
  }

  if (state.column === 'family') {
    copy.sort((a, b) => {
      const aFam = definitionFamily(a) ?? 'accessory';
      const bFam = definitionFamily(b) ?? 'accessory';
      const aIdx = FAMILY_CHIP_ORDER.indexOf(aFam);
      const bIdx = FAMILY_CHIP_ORDER.indexOf(bFam);
      const famDiff = (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
      if (famDiff !== 0) return famDiff * dir;
      return compareName(a, b);
    });
    return copy;
  }

  if (state.column === 'type') {
    copy.sort((a, b) => {
      const diff = a.objective.localeCompare(b.objective, 'es');
      if (diff !== 0) return diff * dir;
      return compareName(a, b);
    });
    return copy;
  }

  if (state.column === 'ref') {
    copy.sort((a, b) => {
      const diff = a.loadAnchor.localeCompare(b.loadAnchor, 'es');
      if (diff !== 0) return diff * dir;
      return compareName(a, b);
    });
    return copy;
  }

  if (state.column === 'created') {
    const createdTime = (def: MergedDefinitionView) =>
      Date.parse(def.createdAt ?? def.updatedAt ?? '') || 0;
    copy.sort((a, b) => {
      const aTime = createdTime(a);
      const bTime = createdTime(b);
      if (aTime !== bTime) return (aTime - bTime) * dir;
      return compareName(a, b);
    });
    return copy;
  }

  if (state.column === 'updated') {
    copy.sort((a, b) => {
      const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? '') || 0;
      const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? '') || 0;
      if (aTime !== bTime) return (aTime - bTime) * dir;
      return compareName(a, b);
    });
    return copy;
  }

  copy.sort((a, b) => compareName(a, b) * dir);
  return copy;
}

export function accessoryFolderCounts(definitions: MergedDefinitionView[]): {
  unfiled: number;
  folders: Record<string, number>;
} {
  let unfiled = 0;
  const folders: Record<string, number> = {};
  for (const def of definitions) {
    if (definitionFamily(def) !== 'accessory') continue;
    const folderId = customFamilyIdFromTags(def.tags);
    if (folderId) {
      const key = customFamilyFilterKey(folderId);
      folders[key] = (folders[key] ?? 0) + 1;
    } else {
      unfiled += 1;
    }
  }
  return { unfiled, folders };
}

export function familyCounts(definitions: MergedDefinitionView[]): Record<string, number> {
  const counts: Record<string, number> = { all: definitions.length };
  for (const def of definitions) {
    const customId = customFamilyIdFromTags(def.tags);
    if (customId) {
      const key = customFamilyFilterKey(customId);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const family = definitionFamily(def) ?? 'accessory';
    counts[family] = (counts[family] ?? 0) + 1;
  }
  return counts;
}

export function isExerciseFamilyFilter(value: string): value is ExerciseFamilyFilter {
  if (value === 'all') return true;
  if (isCustomFamilyFilter(value)) return true;
  return FAMILY_CHIP_ORDER.includes(value as ExerciseFamilyCode);
}

export function muscleGroupCounts(definitions: MergedDefinitionView[]): Record<string, number> {
  const counts: Record<string, number> = { all: definitions.length };
  for (const def of definitions) {
    const group = muscleGroupFromTags(def.tags) ?? 'full_body';
    counts[group] = (counts[group] ?? 0) + 1;
  }
  return counts;
}

export function collectProgramExerciseIds(programs: CoachProgramRow[]): Set<string>[] {
  return programs.map((row) => {
    const ids = new Set<string>();
    for (const week of row.program.weeks ?? []) {
      for (const day of week.days ?? []) {
        for (const block of day.session?.exercises ?? []) {
          if (block.exerciseId) ids.add(block.exerciseId);
          for (const seg of block.segments ?? []) {
            if (seg.exerciseId) ids.add(seg.exerciseId);
          }
        }
      }
    }
    return ids;
  });
}

export function usageCountsByDefinition(
  programs: CoachProgramRow[],
  definitions: MergedDefinitionView[],
): Map<string, number> {
  const usedSets = collectProgramExerciseIds(programs);
  const map = new Map<string, number>();
  for (const def of definitions) {
    const keys = [def.id, def.legacyExerciseId].filter((id): id is string => Boolean(id));
    let n = 0;
    for (const used of usedSets) {
      if (keys.some((key) => used.has(key))) n += 1;
    }
    map.set(def.id, n);
  }
  return map;
}

export function countExerciseUsage(programs: CoachProgramRow[], def: MergedDefinitionView): number {
  const ids = new Set([def.id, def.legacyExerciseId].filter((id): id is string => Boolean(id)));
  let n = 0;
  for (const used of collectProgramExerciseIds(programs)) {
    if (ids.size > 0 && [...ids].some((id) => used.has(id))) n += 1;
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

export function familyDisplayLabel(family: ExerciseFamilyId | null): string {
  if (!family) return '—';
  return FAMILY_DISPLAY_LABEL[family] ?? family;
}

export function intensityRefLabel(anchor: ExerciseLoadAnchorCode | null | undefined): string | null {
  if (!anchor) return null;
  return INTENSITY_REF_LABEL[anchor] ?? null;
}

/** Etiqueta de referencia de intensidad; `auto` → Propio/Self. */
export function intensityRefDisplayLabel(
  anchor: ExerciseLoadAnchorCode | null | undefined,
  isEs: boolean,
): string {
  if (!anchor || anchor === 'auto') return isEs ? 'Propio' : 'Self';
  return INTENSITY_REF_LABEL[anchor] ?? anchor;
}

export function isDefinitionArchived(def: MergedDefinitionView): boolean {
  return Boolean(def.hiddenByCoach) || def.lifecycleStatus === 'deprecated';
}

/** Multiplicador 1RM desde catálogo legacy; null si es 1.0 o no existe. */
export function loadScaleForDefinition(motorExercises: Exercise[], def: MergedDefinitionView): number | null {
  const keys = new Set([def.id, def.legacyExerciseId].filter((id): id is string => Boolean(id)));
  for (const ex of motorExercises) {
    if (!keys.has(ex.id)) continue;
    const scale = ex.loadScale;
    if (scale != null && Number.isFinite(scale) && scale !== 1) {
      return Math.round(scale * 1000) / 1000;
    }
  }
  return null;
}

export function buildExerciseListNodes(
  items: ExerciseListItem[],
  groupByFamily: boolean,
  familyFilter: ExerciseFamilyFilter,
): ExerciseListNode[] {
  if (!groupByFamily || familyFilter !== 'all') {
    return items.map((item) => ({ kind: 'row' as const, id: item.id, item }));
  }

  const buckets = new Map<ExerciseFamilyId, ExerciseListItem[]>();
  for (const item of items) {
    const list = buckets.get(item.family) ?? [];
    list.push(item);
    buckets.set(item.family, list);
  }

  const nodes: ExerciseListNode[] = [];
  for (const code of FAMILY_CHIP_ORDER) {
    const groupItems = buckets.get(code);
    if (!groupItems?.length) continue;
    nodes.push({
      kind: 'group',
      id: `group-${code}`,
      family: code,
      label: FAMILY_DISPLAY_LABEL[code].toUpperCase(),
      count: groupItems.length,
    });
    for (const item of groupItems) {
      nodes.push({ kind: 'row', id: item.id, item });
    }
    buckets.delete(code);
  }

  for (const [family, groupItems] of buckets) {
    if (!groupItems.length) continue;
    nodes.push({
      kind: 'group',
      id: `group-${family}`,
      family,
      label: FAMILY_DISPLAY_LABEL[family].toUpperCase(),
      count: groupItems.length,
    });
    for (const item of groupItems) {
      nodes.push({ kind: 'row', id: item.id, item });
    }
  }

  return nodes;
}

export function listNodeHeight(
  node: ExerciseListNode,
  density: import('./types').ExerciseListDensity,
): number {
  if (node.kind === 'group') return GROUP_HEADER_HEIGHT;
  return density === 'detailed' ? LIST_ROW_HEIGHT_DETAILED : LIST_ROW_HEIGHT_COMPACT;
}

export function listNodesTotalHeight(
  nodes: ExerciseListNode[],
  density: import('./types').ExerciseListDensity,
): number {
  return nodes.reduce((sum, node) => sum + listNodeHeight(node, density), 0);
}

export function findNodeOffset(
  nodes: ExerciseListNode[],
  startIndex: number,
  density: import('./types').ExerciseListDensity,
): number {
  let offset = 0;
  for (let i = 0; i < startIndex; i += 1) {
    offset += listNodeHeight(nodes[i]!, density);
  }
  return offset;
}

export function formatExerciseMetaLine(opts: {
  familyLabel: string;
  typeLabel: string;
  intensityLabel: string | null;
  usageCount: number;
  isEs: boolean;
}): string {
  const parts = [opts.familyLabel, opts.typeLabel];
  if (opts.intensityLabel) parts.push(`Ref: ${opts.intensityLabel}`);
  if (opts.usageCount > 0) {
    const label = opts.isEs
      ? opts.usageCount === 1
        ? '1 programa'
        : `${opts.usageCount} programas`
      : opts.usageCount === 1
        ? '1 program'
        : `${opts.usageCount} programs`;
    parts.push(label);
  }
  return parts.join(' · ');
}

export function formatExerciseListDate(iso: string | undefined, isEs: boolean): string {
  if (!iso?.trim()) return '—';
  const raw = iso.trim();
  const d = raw.includes('T') ? new Date(raw) : new Date(`${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function toExerciseListItem(
  def: MergedDefinitionView,
  opts: {
    isEs: boolean;
    typeLabel: string;
    usageCount: number;
    isFavorite: boolean;
    loadScale?: number | null;
    lastUsedAt?: string;
    familyLabel?: string;
  },
): ExerciseListItem {
  const family = (definitionFamily(def) ?? 'accessory') as ExerciseFamilyId;
  return {
    id: def.id,
    name: def.effectiveDisplayName,
    family,
    familyLabel: opts.familyLabel ?? familyDisplayLabel(family),
    type: def.objective,
    typeLabel: opts.typeLabel,
    intensityRef: intensityRefDisplayLabel(def.loadAnchor, opts.isEs),
    intensityBasis: def.loadAnchor,
    loadScale: opts.loadScale ?? null,
    usageCount: opts.usageCount,
    isOfficial: !def.coachId,
    isFavorite: opts.isFavorite,
    isArchived: isDefinitionArchived(def),
    lastUsedAt: opts.lastUsedAt,
    mediaUrl: def.coachOverride?.override.videoUrl ?? null,
    createdAt: def.createdAt,
    updatedAt: def.updatedAt,
  };
}
