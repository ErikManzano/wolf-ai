import Fuse from 'fuse.js';
import type {
  ExerciseDefinitionKind,
  ExerciseLifecycleStatus,
  ExerciseTaxonomyBundle,
  MergedDefinitionView,
} from '../../models/exercise';
import type { ExerciseCategory } from '../../models/training';
import { toLegacyExercise } from './toLegacyExercise';

export interface SessionPickerOption {
  id: string;
  definitionId: string;
  name: string;
  searchText: string;
  category: ExerciseCategory;
  lifecycleStatus: ExerciseLifecycleStatus;
  kind: ExerciseDefinitionKind;
  tags?: string[];
  catalogGroup?: string;
}

const GROUP_SHORT: Record<string, string> = {
  grupo_1: 'G1',
  grupo_2: 'G2',
  grupo_3: 'G3',
  grupo_4: 'G4',
  grupo_5: 'G5',
  grupo_6: 'G6',
  grupo_7: 'G7',
  grupo_8: 'G8',
  grupo_9: 'G9',
  grupo_10: 'G10',
  grupo_11: 'G11',
  grupo_12: 'G12',
  grupo_13: 'G13',
  grupo_14: 'G14',
  grupo_15: 'G15',
};

export function catalogGroupLabel(tags?: string[], catalogGroup?: string): string | null {
  const g = catalogGroup ?? tags?.find((t) => /^grupo_\d+$/.test(t));
  return g ? (GROUP_SHORT[g] ?? g.replace('grupo_', 'G')) : null;
}

function tokenizeQuery(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/[\s,+/&]+/)
    .filter((t) => t.length > 0);
}

export function matchesCatalogQuery(
  item: { displayName: string; searchText: string; tags: string[] },
  q: string,
): boolean {
  const tokens = tokenizeQuery(q);
  if (tokens.length === 0) return true;
  const name = item.displayName.toLowerCase();
  const search = item.searchText.toLowerCase();
  return tokens.every(
    (t) => name.includes(t) || search.includes(t) || item.tags.some((tag) => tag.toLowerCase().includes(t)),
  );
}

function scorePickerOption(opt: SessionPickerOption, tokens: string[]): number {
  if (tokens.length === 0) {
    let base = 0;
    if (opt.kind === 'single') base += 20;
    else base += 5;
    if (opt.catalogGroup) base += 2;
    base -= opt.name.length * 0.02;
    return base;
  }

  const name = opt.name.toLowerCase();
  const search = opt.searchText.toLowerCase();
  let score = 0;

  for (const t of tokens) {
    if (name === t) score += 120;
    else if (name.startsWith(t)) score += 70;
    else if (new RegExp(`\\b${escapeRegExp(t)}`).test(name)) score += 45;
    else if (name.includes(t)) score += 25;
    else if (search.includes(t)) score += 12;
    else return -1;
  }

  if (opt.kind === 'single') score += 8;
  if (tokens.length === 1 && name.startsWith(tokens[0]!)) score += 15;
  score -= Math.min(12, opt.name.length * 0.04);
  return score;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function filterPickerByCatalogGroup(
  options: SessionPickerOption[],
  catalogGroup: string | null,
  exerciseIdsInGroup?: Set<string>,
): SessionPickerOption[] {
  if (!catalogGroup) return options;
  const ids = exerciseIdsInGroup;
  return options.filter((o) => {
    if (o.catalogGroup === catalogGroup || o.tags?.includes(catalogGroup)) return true;
    if (ids?.has(o.id) || ids?.has(o.definitionId)) return true;
    return false;
  });
}

export function filterPickerByCategory(
  options: SessionPickerOption[],
  category: ExerciseCategory | null,
): SessionPickerOption[] {
  if (!category) return options;
  return options.filter((o) => o.category === category);
}

/** Ranked search for coach session editor (faster assignment). */
export function searchPickerOptions(
  options: SessionPickerOption[],
  query: string,
  limit = 24,
  opts?: {
    catalogGroup?: string | null;
    exerciseIdsInGroup?: Set<string>;
    category?: ExerciseCategory | null;
    preferIds?: string[];
  },
): SessionPickerOption[] {
  let base = options;
  if (opts?.catalogGroup) {
    base = filterPickerByCatalogGroup(base, opts.catalogGroup, opts.exerciseIdsInGroup);
  }
  if (opts?.category) {
    base = filterPickerByCategory(base, opts.category);
  }

  const tokens = tokenizeQuery(query);
  const preferSet = opts?.preferIds?.length ? new Set(opts.preferIds) : null;

  const scored = base
    .map((o) => {
      let score = scorePickerOption(o, tokens);
      if (score < 0) return null;
      if (preferSet?.has(o.id)) score += 40;
      return { o, score };
    })
    .filter((x): x is { o: SessionPickerOption; score: number } => x !== null)
    .sort((a, b) => b.score - a.score || a.o.name.localeCompare(b.o.name, undefined, { sensitivity: 'base' }));

  return scored.slice(0, limit).map((x) => x.o);
}

let fuseIndexCache: { options: SessionPickerOption[]; fuse: Fuse<SessionPickerOption> } | null = null;

function fuseForOptions(options: SessionPickerOption[]): Fuse<SessionPickerOption> {
  if (fuseIndexCache?.options === options) return fuseIndexCache.fuse;
  const fuse = new Fuse(options, {
    keys: [
      { name: 'name', weight: 0.45 },
      { name: 'searchText', weight: 0.35 },
      { name: 'tags', weight: 0.2 },
    ],
    threshold: 0.38,
    ignoreLocation: true,
  });
  fuseIndexCache = { options, fuse };
  return fuse;
}

/** Fuzzy ranked search (Fuse.js) with SN/CJ/SQ/AC and catalog group pre-filters. */
export function fuzzySearchPickerOptions(
  options: SessionPickerOption[],
  query: string,
  limit = 24,
  opts?: {
    catalogGroup?: string | null;
    exerciseIdsInGroup?: Set<string>;
    category?: ExerciseCategory | null;
    preferIds?: string[];
  },
): SessionPickerOption[] {
  if (!query.trim()) {
    return searchPickerOptions(options, query, limit, opts);
  }

  let base = options;
  if (opts?.catalogGroup) {
    base = filterPickerByCatalogGroup(base, opts.catalogGroup, opts.exerciseIdsInGroup);
  }
  if (opts?.category) {
    base = filterPickerByCategory(base, opts.category);
  }

  const fuse = fuseForOptions(base);
  const preferSet = opts?.preferIds?.length ? new Set(opts.preferIds) : null;
  const results = fuse.search(query.trim(), { limit: limit * 2 });

  const ranked = results
    .map(({ item, score }) => {
      let rank = 1 - (score ?? 0);
      if (preferSet?.has(item.id)) rank += 0.4;
      return { item, rank };
    })
    .sort((a, b) => b.rank - a.rank || a.item.name.localeCompare(b.item.name, undefined, { sensitivity: 'base' }));

  return ranked.slice(0, limit).map((x) => x.item);
}

/** @deprecated Prefer searchPickerOptions for ranked results */
export function filterPickerOptions(
  options: SessionPickerOption[],
  query: string,
  limit = 24,
  catalogGroup?: string | null,
  exerciseIdsInGroup?: Set<string>,
): SessionPickerOption[] {
  return searchPickerOptions(options, query, limit, {
    catalogGroup: catalogGroup ?? null,
    exerciseIdsInGroup,
  });
}

export function pickerOptionsFromIds(
  options: SessionPickerOption[],
  ids: string[],
  limit = 8,
): SessionPickerOption[] {
  const byId = new Map(options.map((o) => [o.id, o]));
  const out: SessionPickerOption[] = [];
  for (const id of ids) {
    const o = byId.get(id);
    if (o && !out.some((x) => x.id === o.id)) out.push(o);
    if (out.length >= limit) break;
  }
  return out;
}

export function mergedViewsToPickerOptions(
  merged: MergedDefinitionView[],
  taxonomy: ExerciseTaxonomyBundle,
): SessionPickerOption[] {
  return merged
    .filter((d) => !d.hiddenByCoach && d.lifecycleStatus !== 'deprecated')
    .map((def) => {
      const legacy = toLegacyExercise(def, taxonomy);
      const catalogGroup = def.tags.find((t) => /^grupo_\d+$/.test(t));
      return {
        id: def.legacyExerciseId ?? def.id,
        definitionId: def.id,
        name: def.effectiveDisplayName,
        searchText: def.searchText,
        category: legacy.category,
        lifecycleStatus: def.lifecycleStatus,
        kind: def.kind,
        tags: def.tags.length ? [...def.tags] : undefined,
        catalogGroup,
      };
    });
}

export type SessionPickerBlockKind = 'single' | 'complexSegment';

export function browseQueryForPickerKind(kind: SessionPickerBlockKind): 'single' | 'all' {
  return kind === 'complexSegment' ? 'single' : 'all';
}
