import type { Athlete, WolfUser } from '../models/training';

/**
 * Filtra atletas WL del roster del coach.
 * Prefer `useWolfAssign().rosterForCoach(coach)` en componentes React (datos API).
 */
export function athletesForCoach(
  coach: WolfUser | undefined,
  users: WolfUser[],
  allAthletes: Athlete[],
): Athlete[] {
  if (!coach) return allAthletes;
  if (coach.role === 'super_admin') return allAthletes;
  if (coach.role !== 'coach') return allAthletes;

  const profileIds = users
    .filter((u) => u.role === 'athlete' && u.coachId === coach.id && u.linkedAthleteId)
    .map((u) => u.linkedAthleteId!);

  if (profileIds.length === 0) return allAthletes;

  const roster = allAthletes.filter((a) => profileIds.includes(a.id));
  return roster.length > 0 ? roster : allAthletes;
}
