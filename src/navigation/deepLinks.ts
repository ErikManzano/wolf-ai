/**
 * Hash-based deep links for the SPA (Sprint 3).
 * Examples:
 *   #/dashboard
 *   #/programs
 *   #/programs/<programId>/week/2/day/1
 *   #/athletes
 *   #/account
 *   #/legal/terms
 *   #/legal/privacy
 */

import type { AppViewId } from '../navigation/appNavigation';
export type ProgramsKindFilter = 'all' | 'templates' | 'individuals';

export type DeepLinkTarget = {
  view: AppViewId | 'legal-terms' | 'legal-privacy';
  programId?: string;
  assignmentId?: string;
  week?: number;
  day?: number;
  /** Hub de programas (lista unificada) */
  programsKindFilter?: ProgramsKindFilter;
  athleteProfileId?: string;
  coachProgramFilterId?: string;
};

function parseHashQuery(queryPart: string | undefined): Record<string, string> {
  if (!queryPart) return {};
  const out: Record<string, string> = {};
  for (const pair of queryPart.split('&')) {
    const [k, v] = pair.split('=');
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }
  return out;
}

function isProgramsKindFilter(value: string): value is ProgramsKindFilter {
  return value === 'all' || value === 'templates' || value === 'individuals';
}

const VIEW_ALIASES: Record<string, DeepLinkTarget['view']> = {
  dashboard: 'dashboard',
  home: 'dashboard',
  programs: 'programs',
  athletes: 'athletes',
  praxiogram: 'praxiogram',
  exercises: 'exercise-intelligence',
  'exercise-intelligence': 'exercise-intelligence',
  'my-wl-plan': 'my-wl-plan',
  calendar: 'global-calendar',
  'global-calendar': 'global-calendar',
  account: 'account',
  'admin-users': 'admin-users',
  'legal/terms': 'legal-terms',
  'legal/privacy': 'legal-privacy',
  terms: 'legal-terms',
  privacy: 'legal-privacy',
};

export function parseHashDeepLink(hash: string = window.location.hash): DeepLinkTarget | null {
  const raw = hash.replace(/^#\/?/, '').trim();
  if (!raw) return null;

  const [pathPart, queryPart] = raw.split('?');
  const query = parseHashQuery(queryPart);
  const parts = pathPart.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  if (parts[0] === 'programs' && parts[1] === 'list') {
    const filterRaw = parts[2] ?? query.filter;
    const programsKindFilter = filterRaw && isProgramsKindFilter(filterRaw) ? filterRaw : undefined;
    return {
      view: 'programs',
      ...(programsKindFilter ? { programsKindFilter } : {}),
      athleteProfileId: query.athlete || undefined,
      coachProgramFilterId: query.fromTemplate || undefined,
    };
  }

  if (parts[0] === 'programs' && !parts[1]) {
    const filterRaw = query.filter;
    const programsKindFilter = filterRaw && isProgramsKindFilter(filterRaw) ? filterRaw : undefined;
    return {
      view: 'programs',
      ...(programsKindFilter ? { programsKindFilter } : {}),
      athleteProfileId: query.athlete || undefined,
      coachProgramFilterId: query.fromTemplate || undefined,
    };
  }

  if (parts[0] === 'athletes' && parts[1]) {
    return { view: 'athletes', athleteProfileId: decodeURIComponent(parts[1]) };
  }

  if (parts[0] === 'legal' && parts[1] === 'terms') return { view: 'legal-terms' };
  if (parts[0] === 'legal' && parts[1] === 'privacy') return { view: 'legal-privacy' };

  if (parts[0] === 'assignments' && parts[1]) {
    const assignmentId = decodeURIComponent(parts[1]);
    let week: number | undefined;
    let day: number | undefined;
    if (parts[2] === 'week' && parts[3]) week = Number(parts[3]);
    if (parts[4] === 'day' && parts[5]) day = Number(parts[5]);
    return {
      view: 'programs',
      assignmentId,
      week: Number.isFinite(week) ? week : undefined,
      day: Number.isFinite(day) ? day : undefined,
    };
  }

  if (parts[0] === 'programs' && parts[1]) {
    const programId = decodeURIComponent(parts[1]);
    let week: number | undefined;
    let day: number | undefined;
    if (parts[2] === 'week' && parts[3]) week = Number(parts[3]);
    if (parts[4] === 'day' && parts[5]) day = Number(parts[5]);
    return {
      view: 'programs',
      programId,
      week: Number.isFinite(week) ? week : undefined,
      day: Number.isFinite(day) ? day : undefined,
    };
  }

  const key = parts[0]!;
  const view = VIEW_ALIASES[key];
  if (!view) return null;
  return { view };
}

export function buildHashDeepLink(target: DeepLinkTarget): string {
  if (target.view === 'legal-terms') return '#/legal/terms';
  if (target.view === 'legal-privacy') return '#/legal/privacy';
  if (target.view === 'programs' && target.assignmentId) {
    let path = `#/assignments/${encodeURIComponent(target.assignmentId)}`;
    if (target.week != null) {
      path += `/week/${target.week}`;
      if (target.day != null) path += `/day/${target.day}`;
    }
    return path;
  }
  if (target.view === 'programs' && target.programId) {
    let path = `#/programs/${encodeURIComponent(target.programId)}`;
    if (target.week != null) {
      path += `/week/${target.week}`;
      if (target.day != null) path += `/day/${target.day}`;
    }
    return path;
  }
  if (target.view === 'programs' && (target.programsKindFilter || target.athleteProfileId || target.coachProgramFilterId)) {
    const filter = target.programsKindFilter ?? 'all';
    const q = new URLSearchParams();
    if (filter !== 'all') q.set('filter', filter);
    if (target.athleteProfileId) q.set('athlete', target.athleteProfileId);
    if (target.coachProgramFilterId) q.set('fromTemplate', target.coachProgramFilterId);
    const qs = q.toString();
    return qs ? `#/programs/list/${filter}?${qs}` : `#/programs/list/${filter}`;
  }
  if (target.view === 'athletes' && target.athleteProfileId) {
    return `#/athletes/${encodeURIComponent(target.athleteProfileId)}`;
  }
  return `#/${target.view}`;
}

export function writeProgramsHubHash(params: {
  kindFilter: ProgramsKindFilter;
  athleteProfileId?: string;
  coachProgramFilterId?: string;
  replace?: boolean;
}): void {
  writeHashDeepLink(
    {
      view: 'programs',
      programsKindFilter: params.kindFilter,
      athleteProfileId: params.athleteProfileId,
      coachProgramFilterId: params.coachProgramFilterId,
    },
    params.replace ?? true,
  );
}

export function isAppViewId(view: DeepLinkTarget['view']): view is AppViewId {
  return view !== 'legal-terms' && view !== 'legal-privacy';
}

export function writeHashDeepLink(target: DeepLinkTarget, replace = false): void {
  const next = buildHashDeepLink(target);
  if (replace) {
    window.history.replaceState(null, '', next);
  } else if (window.location.hash !== next) {
    window.location.hash = next;
  }
}
