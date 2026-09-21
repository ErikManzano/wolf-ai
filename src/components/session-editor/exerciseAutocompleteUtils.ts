import type { SessionPickerOption } from '../../services/exercise';

/** Umbral para mostrar atajo al modal de búsqueda completa. */
export const DROPDOWN_BROWSE_THRESHOLD = 40;
export const SEARCH_DEBOUNCE_MS = 150;
export const HOVER_PREVIEW_MS = 500;

export type DropdownSectionKind = 'favorites' | 'recents' | 'all';

export interface DropdownSection {
  kind: DropdownSectionKind;
  labelEs: string;
  labelEn: string;
  items: SessionPickerOption[];
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
}): DropdownBuildResult {
  const favoriteSet = new Set(opts.favoriteIds);
  const { favorites, recents, rest } = partitionMatches(opts.matched, favoriteSet, opts.recentIds);

  const sections: DropdownSection[] = [];
  if (favorites.length > 0) {
    sections.push({
      kind: 'favorites',
      labelEs: 'Favoritos',
      labelEn: 'Favorites',
      items: favorites,
    });
  }
  if (recents.length > 0) {
    sections.push({
      kind: 'recents',
      labelEs: 'Recientes',
      labelEn: 'Recent',
      items: recents,
    });
  }
  if (rest.length > 0 || sections.length === 0) {
    sections.push({
      kind: 'all',
      labelEs: opts.query.trim() ? 'Todos los resultados' : 'Sugeridos',
      labelEn: opts.query.trim() ? 'All results' : 'Suggested',
      items: rest.length > 0 ? rest : opts.matched,
    });
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
