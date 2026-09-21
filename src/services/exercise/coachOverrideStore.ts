import type { CoachExerciseOverride } from '../../models/exercise';

const STORAGE_KEY = 'wolf_coach_exercise_overrides_v1';

type Listener = () => void;
const listeners = new Set<Listener>();

export function readCoachExerciseOverrides(): CoachExerciseOverride[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CoachExerciseOverride[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCoachExerciseOverrides(overrides: CoachExerciseOverride[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    listeners.forEach((fn) => fn());
  } catch {
    /* ignore */
  }
}

export function subscribeCoachExerciseOverrides(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Fusiona overrides del API encima de los locales (mismo coach + baseDefinitionId). */
export function mergeCoachExerciseOverrides(
  local: CoachExerciseOverride[],
  fromApi: CoachExerciseOverride[],
  coachId: string,
): CoachExerciseOverride[] {
  const byKey = new Map<string, CoachExerciseOverride>();
  for (const item of local) {
    if (item.coachId !== coachId) byKey.set(`${item.coachId}:${item.baseDefinitionId}`, item);
  }
  for (const item of local) {
    if (item.coachId === coachId) byKey.set(`${item.coachId}:${item.baseDefinitionId}`, item);
  }
  for (const item of fromApi) {
    if (item.coachId === coachId) byKey.set(`${item.coachId}:${item.baseDefinitionId}`, item);
  }
  return [...byKey.values()];
}
