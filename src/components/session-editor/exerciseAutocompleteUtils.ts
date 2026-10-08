import {
  catalogGrupoFromPickerTags,
  WL_CATALOG_GROUP_LABELS,
  WL_CATALOG_GROUP_ORDER,
  type CatalogGrupoFilter,
} from '../../data/wlCatalogGroups';
import type { ExerciseFamilyCode, ExerciseVariationCode } from '../../models/exercise';
import type { SessionPickerOption } from '../../services/exercise';
import { MUSCLE_CHIP_ORDER, MUSCLE_LABELS, type MuscleGroupFilter } from '../wl-exercises/exerciseListUtils';
import { PICKER_VARIATION_ORDER, pickerMuscleGroupForOption } from './ExercisePickerFamilyFilters';

/** Umbral para mostrar atajo al modal de búsqueda completa. */
export const DROPDOWN_BROWSE_THRESHOLD = 40;
export const SEARCH_DEBOUNCE_MS = 150;
export const HOVER_PREVIEW_MS = 500;

export type DropdownSectionKind = 'favorites' | 'recents' | 'all';

export interface DropdownSection {
  kind: DropdownSectionKind;
  key?: string;
  labelEs: string;
  labelEn: string;
  items: SessionPickerOption[];
}

const PICKER_GROUP_ORDER = [
  'snatch',
  'clean',
  'jerk',
  'pull',
  'squat',
  'press',
  'foam',
  'warmup',
  'strength',
  'bodyweight',
  'accessory',
] as const;

const PICKER_GROUP_LABEL: Record<string, { es: string; en: string }> = {
  snatch: { es: 'Snatch', en: 'Snatch' },
  clean: { es: 'Clean', en: 'Clean' },
  jerk: { es: 'Jerk', en: 'Jerk' },
  pull: { es: 'Pull', en: 'Pull' },
  squat: { es: 'Squat', en: 'Squat' },
  press: { es: 'Press', en: 'Press' },
  foam: { es: 'Foam roller', en: 'Foam roller' },
  warmup: { es: 'Calentamiento', en: 'Warm-up' },
  strength: { es: 'Fuerza', en: 'Strength' },
  bodyweight: { es: 'Peso corporal', en: 'Bodyweight' },
  accessory: { es: 'Accesorios', en: 'Accessories' },
};

export function pickerCatalogGroupLabel(group: string, isEs: boolean): string {
  const label = PICKER_GROUP_LABEL[group];
  if (!label) return group;
  return isEs ? label.es : label.en;
}

export function pickerCatalogGroup(opt: SessionPickerOption): string {
  const tags = opt.tags ?? [];
  if (tags.includes('foam')) return 'foam';
  if (tags.includes('warmup')) return 'warmup';
  if (tags.includes('bodyweight')) return 'bodyweight';
  if (tags.includes('concentrado') && tags.includes('strength')) return 'strength';
  if (opt.family && opt.family !== 'accessory') return opt.family;
  return 'accessory';
}

export type NavigableRow =
  | { kind: 'option'; id: string; opt: SessionPickerOption; section: DropdownSectionKind }
  | { kind: 'more'; id: string; hiddenCount: number }
  | { kind: 'create'; id: string; query: string };

export interface DropdownBuildResult {
  sections: DropdownSection[];
  navigable: NavigableRow[];
  totalMatches: number;
  hiddenCount: number;
  showCreate: boolean;
}

function partitionMatches(
  matched: SessionPickerOption[],
  favoriteIds: Set<string>,
  recentIds: string[],
): { favorites: SessionPickerOption[]; recents: SessionPickerOption[]; rest: SessionPickerOption[] } {
  const recentOrder = new Map(recentIds.map((id, index) => [id, index]));
  const favorites: SessionPickerOption[] = [];
  const recents: SessionPickerOption[] = [];
  const rest: SessionPickerOption[] = [];
  const used = new Set<string>();

  for (const opt of matched) {
    if (favoriteIds.has(opt.id) || favoriteIds.has(opt.definitionId)) {
      favorites.push(opt);
      used.add(opt.id);
    }
  }

  const recentSorted = matched
    .filter((opt) => !used.has(opt.id))
    .filter((opt) => recentOrder.has(opt.id) || recentOrder.has(opt.definitionId))
    .sort((a, b) => {
      const ai = recentOrder.get(a.id) ?? recentOrder.get(a.definitionId) ?? 999;
      const bi = recentOrder.get(b.id) ?? recentOrder.get(b.definitionId) ?? 999;
      return ai - bi;
    });
  for (const opt of recentSorted) {
    recents.push(opt);
    used.add(opt.id);
  }

  for (const opt of matched) {
    if (!used.has(opt.id)) rest.push(opt);
  }

  return { favorites, recents, rest };
}

export function buildDropdownSections(opts: {
  matched: SessionPickerOption[];
  favoriteIds: string[];
  recentIds: string[];
  query: string;
  isEs: boolean;
  quickFilter?: 'none' | 'favorites' | 'recent';
  catalogNavigate?: {
    section: BrowseModalSectionFilter;
    familyFilter: ExerciseFamilyCode | 'all';
    catalogGrupoFilter?: CatalogGrupoFilter;
    variationLabel: (code: ExerciseVariationCode) => string;
  };
}): DropdownBuildResult {
  const favoriteSet = new Set(opts.favoriteIds);
  const skipFavRecentSections =
    opts.quickFilter === 'favorites' ||
    opts.quickFilter === 'recent' ||
    (opts.catalogNavigate != null && opts.catalogNavigate.section !== 'all');
  const { favorites, recents, rest } = partitionMatches(opts.matched, favoriteSet, opts.recentIds);

  const sections: DropdownSection[] = [];
  if (!skipFavRecentSections && favorites.length > 0) {
    sections.push({
      kind: 'favorites',
      labelEs: 'Favoritos',
      labelEn: 'Favorites',
      items: favorites,
    });
  }
  if (!skipFavRecentSections && recents.length > 0) {
    sections.push({
      kind: 'recents',
      labelEs: 'Recientes',
      labelEn: 'Recent',
      items: recents,
    });
  }
  const restItems = rest.length > 0 ? rest : sections.length === 0 ? opts.matched : [];
  if (opts.query.trim()) {
    if (restItems.length > 0 || sections.length === 0) {
      sections.push({
        kind: 'all',
        key: 'all',
        labelEs: 'Todos los resultados',
        labelEn: 'All results',
        items: restItems,
      });
    }
  } else if (restItems.length > 0) {
    const nav = opts.catalogNavigate;
    const useSectionGrouping = nav && nav.section !== 'all';
    if (useSectionGrouping) {
      const grouped = buildBrowseModalSections(restItems, '', {
        section: nav.section,
        familyFilter: nav.familyFilter,
        catalogGrupoFilter: nav.catalogGrupoFilter,
        muscleKey: pickerMuscleGroupForOption,
        variationLabel: nav.variationLabel,
      });
      for (const group of grouped) {
        sections.push({
          kind: 'all',
          key: group.key,
          labelEs: group.labelEs,
          labelEn: group.labelEn,
          items: group.items,
        });
      }
    } else {
      const buckets = new Map<string, SessionPickerOption[]>();
      for (const opt of restItems) {
        const group = pickerCatalogGroup(opt);
        const list = buckets.get(group) ?? [];
        list.push(opt);
        buckets.set(group, list);
      }
      const ordered = [
        ...PICKER_GROUP_ORDER.filter((id) => buckets.has(id)),
        ...[...buckets.keys()].filter((id) => !PICKER_GROUP_ORDER.includes(id as (typeof PICKER_GROUP_ORDER)[number])),
      ];
      for (const id of ordered) {
        const items = buckets.get(id) ?? [];
        if (items.length === 0) continue;
        const label = PICKER_GROUP_LABEL[id] ?? { es: id, en: id };
        sections.push({
          kind: 'all',
          key: `group:${id}`,
          labelEs: label.es,
          labelEn: label.en,
          items,
        });
      }
    }
  }

  const flatOptions = sections.flatMap((section) =>
    section.items.map((opt) => ({ opt, section: section.kind })),
  );

  const navigable: NavigableRow[] = flatOptions.map(({ opt, section }) => ({
    kind: 'option',
    id: `opt-${opt.id}`,
    opt,
    section,
  }));

  const hiddenCount = Math.max(0, flatOptions.length - DROPDOWN_BROWSE_THRESHOLD);
  if (flatOptions.length > DROPDOWN_BROWSE_THRESHOLD) {
    navigable.push({ kind: 'more', id: 'more', hiddenCount });
  }

  const normalizedQuery = opts.query.trim().toLowerCase();
  const exactMatch =
    normalizedQuery.length > 0 &&
    opts.matched.some((opt) => opt.name.trim().toLowerCase() === normalizedQuery);
  const showCreate = normalizedQuery.length > 0 && !exactMatch;
  if (showCreate) {
    navigable.push({ kind: 'create', id: 'create', query: opts.query.trim() });
  }

  return {
    sections,
    navigable,
    totalMatches: opts.matched.length,
    hiddenCount,
    showCreate,
  };
}

export type BrowseModalSectionFilter =
  | 'all'
  | 'weightlifting'
  | 'foam'
  | 'warmup'
  | 'strength'
  | 'bodyweight';

/** Agrupa resultados del modal cuando no hay texto de búsqueda (familia, variación o músculo). */
export function buildBrowseModalSections(
  items: SessionPickerOption[],
  query: string,
  ctx: {
    section: BrowseModalSectionFilter;
    familyFilter: 'all' | ExerciseFamilyCode;
    catalogGrupoFilter?: CatalogGrupoFilter;
    muscleKey: (opt: SessionPickerOption) => MuscleGroupFilter;
    variationLabel: (code: ExerciseVariationCode) => string;
  },
): DropdownSection[] {
  if (query.trim()) {
    return [
      {
        kind: 'all',
        key: 'search',
        labelEs: 'Resultados',
        labelEn: 'Results',
        items,
      },
    ];
  }

  if (items.length === 0) return [];

  const concentradoSections = new Set<BrowseModalSectionFilter>(['foam', 'warmup', 'strength', 'bodyweight']);
  const buckets = new Map<string, SessionPickerOption[]>();

  let orderedKeys: string[] = [];
  let labelForKey: (key: string) => { es: string; en: string };

  if (concentradoSections.has(ctx.section)) {
    for (const opt of items) {
      const key = ctx.muscleKey(opt);
      const list = buckets.get(key) ?? [];
      list.push(opt);
      buckets.set(key, list);
    }
    orderedKeys = MUSCLE_CHIP_ORDER.filter((k) => buckets.has(k));
    labelForKey = (key) => MUSCLE_LABELS[key as keyof typeof MUSCLE_LABELS] ?? { es: key, en: key };
  } else if (
    ctx.section === 'weightlifting' &&
    ctx.catalogGrupoFilter &&
    ctx.catalogGrupoFilter !== 'all'
  ) {
    for (const opt of items) {
      const key = opt.variation ?? 'classic';
      const list = buckets.get(key) ?? [];
      list.push(opt);
      buckets.set(key, list);
    }
    orderedKeys = PICKER_VARIATION_ORDER.filter((k) => buckets.has(k));
    labelForKey = (key) => ({
      es: ctx.variationLabel(key as ExerciseVariationCode),
      en: ctx.variationLabel(key as ExerciseVariationCode),
    });
  } else if (ctx.section === 'weightlifting') {
    for (const opt of items) {
      const key =
        catalogGrupoFromPickerTags(opt.tags, opt.id) ?? opt.catalogGroup ?? 'unassigned';
      const list = buckets.get(key) ?? [];
      list.push(opt);
      buckets.set(key, list);
    }
    orderedKeys = [
      ...WL_CATALOG_GROUP_ORDER.filter((k) => buckets.has(k)),
      ...(buckets.has('unassigned') ? (['unassigned'] as const) : []),
    ];
    labelForKey = (key) => {
      if (key === 'unassigned') return { es: 'Sin grupo', en: 'Unassigned' };
      const meta = WL_CATALOG_GROUP_LABELS[key as keyof typeof WL_CATALOG_GROUP_LABELS];
      return meta ? { es: meta.titleEs, en: meta.titleEn } : { es: key, en: key };
    };
  } else {
    for (const opt of items) {
      const key = pickerCatalogGroup(opt);
      const list = buckets.get(key) ?? [];
      list.push(opt);
      buckets.set(key, list);
    }
    orderedKeys = [
      ...PICKER_GROUP_ORDER.filter((id) => buckets.has(id)),
      ...[...buckets.keys()].filter((id) => !PICKER_GROUP_ORDER.includes(id as (typeof PICKER_GROUP_ORDER)[number])),
    ];
    labelForKey = (key) => PICKER_GROUP_LABEL[key] ?? { es: key, en: key };
  }

  return orderedKeys
    .map((key) => {
      const groupItems = (buckets.get(key) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
      const label = labelForKey(key);
      return {
        kind: 'all' as const,
        key: `group:${key}`,
        labelEs: label.es,
        labelEn: label.en,
        items: groupItems,
      };
    })
    .filter((section) => section.items.length > 0);
}

/** Une recientes de sesión y biblioteca conservando orden. */
export function combinedRecentIds(sessionRecent: string[], libraryRecent: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...sessionRecent, ...libraryRecent]) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function highlightTokens(text: string, query: string): { text: string; match: boolean }[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/[\s,+/&]+/)
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return [{ text, match: false }];

  const lower = text.toLowerCase();
  const ranges: { start: number; end: number }[] = [];
  for (const token of tokens) {
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(token, from);
      if (idx < 0) break;
      ranges.push({ start: idx, end: idx + token.length });
      from = idx + token.length;
    }
  }
  if (ranges.length === 0) return [{ text, match: false }];

  ranges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) merged.push({ ...range });
    else last.end = Math.max(last.end, range.end);
  }

  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) {
      parts.push({ text: text.slice(cursor, range.start), match: false });
    }
    parts.push({ text: text.slice(range.start, range.end), match: true });
    cursor = range.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}

export function formatHoverPreview(opt: SessionPickerOption, isEs: boolean): string {
  const parts = [`${isEs ? 'Referencia' : 'Reference'}: ${opt.intensityRef}`];
  const usage = opt.usageCount ?? 0;
  if (usage > 0) {
    parts.push(isEs ? `${usage} programas` : `${usage} programs`);
  }
  if (opt.loadScale != null && opt.loadScale !== 1) {
    parts.push(`×${opt.loadScale}`);
  }
  return parts.join(' · ');
}

export function truncateLabel(text: string, max = 32): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
