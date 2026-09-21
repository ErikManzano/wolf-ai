import type { CoachExerciseFamily } from '../../models/exercise/coachFamily';

const STORAGE_KEY = 'wolf_coach_exercise_families_v1';

type Listener = () => void;
const listeners = new Set<Listener>();

export function readCoachExerciseFamilies(): CoachExerciseFamily[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CoachExerciseFamily[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCoachExerciseFamilies(families: CoachExerciseFamily[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(families));
    listeners.forEach((fn) => fn());
  } catch {
    /* ignore */
  }
}

export function subscribeCoachExerciseFamilies(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function slugifyFamilyLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function upsertCoachExerciseFamily(
  families: CoachExerciseFamily[],
  input: Omit<CoachExerciseFamily, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): CoachExerciseFamily[] {
  const now = new Date().toISOString();
  const slug = input.slug.trim() || slugifyFamilyLabel(input.labelEn || input.labelEs);
  if (input.id) {
    return families.map((family) =>
      family.id === input.id
        ? { ...family, ...input, slug, updatedAt: now }
        : family,
    );
  }
  const created: CoachExerciseFamily = {
    id: `cfam-${Date.now()}`,
    coachId: input.coachId,
    slug,
    labelEs: input.labelEs.trim(),
    labelEn: input.labelEn.trim(),
    color: input.color ?? null,
    icon: input.icon ?? null,
    createdAt: now,
    updatedAt: now,
  };
  return [...families, created];
}

export function deleteCoachExerciseFamily(
  families: CoachExerciseFamily[],
  id: string,
): CoachExerciseFamily[] {
  return families.filter((family) => family.id !== id);
}

export function familyLabel(
  family: CoachExerciseFamily,
  isEs: boolean,
): string {
  return isEs ? family.labelEs : family.labelEn;
}
