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

export type DeepLinkTarget = {
  view: AppViewId | 'legal-terms' | 'legal-privacy';
  programId?: string;
  week?: number;
  day?: number;
};

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

  const parts = raw.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  if (parts[0] === 'legal' && parts[1] === 'terms') return { view: 'legal-terms' };
  if (parts[0] === 'legal' && parts[1] === 'privacy') return { view: 'legal-privacy' };

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
  if (target.view === 'programs' && target.programId) {
    let path = `#/programs/${encodeURIComponent(target.programId)}`;
    if (target.week != null) {
      path += `/week/${target.week}`;
      if (target.day != null) path += `/day/${target.day}`;
    }
    return path;
  }
  return `#/${target.view}`;
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
