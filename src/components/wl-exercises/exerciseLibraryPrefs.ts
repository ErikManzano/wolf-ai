import type { ExerciseListDensity, ExerciseViewMode } from './types';

const FAVORITES_KEY = 'wolf_exercise_favorites';
const RECENTS_KEY = 'wolf_exercise_recents';
const VIEW_KEY = 'wolf_exercise_view_mode';
const LIST_DENSITY_KEY = 'wolf_exercise_list_density';
const GROUP_BY_FAMILY_KEY = 'wolf_exercise_group_by_family';
const MAX_RECENTS = 30;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function readExerciseFavorites(): string[] {
  const value = readJson<unknown>(FAVORITES_KEY, []);
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

export function writeExerciseFavorites(ids: string[]) {
  writeJson(FAVORITES_KEY, ids);
}

export function toggleExerciseFavorite(id: string, current: string[]): string[] {
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
  writeExerciseFavorites(next);
  return next;
}

export function readExerciseRecents(): string[] {
  const value = readJson<unknown>(RECENTS_KEY, []);
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

export function recordExerciseRecent(id: string, current: string[]): string[] {
  const next = [id, ...current.filter((item) => item !== id)].slice(0, MAX_RECENTS);
  writeJson(RECENTS_KEY, next);
  return next;
}

export function readExerciseViewMode(): ExerciseViewMode {
  const value = readJson<unknown>(VIEW_KEY, 'list');
  return value === 'grid' ? 'grid' : 'list';
}

export function writeExerciseViewMode(mode: ExerciseViewMode) {
  writeJson(VIEW_KEY, mode);
}

export function readExerciseListDensity(): ExerciseListDensity {
  const value = readJson<unknown>(LIST_DENSITY_KEY, 'detailed');
  return value === 'compact' ? 'compact' : 'detailed';
}

export function writeExerciseListDensity(density: ExerciseListDensity) {
  writeJson(LIST_DENSITY_KEY, density);
}

export function readExerciseGroupByFamily(): boolean {
  const value = readJson<unknown>(GROUP_BY_FAMILY_KEY, true);
  return value !== false;
}

export function writeExerciseGroupByFamily(enabled: boolean) {
  writeJson(GROUP_BY_FAMILY_KEY, enabled);
}
