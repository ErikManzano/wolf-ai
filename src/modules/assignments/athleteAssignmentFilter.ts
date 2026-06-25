import type { Athlete, ProgramAssignment, WolfUser } from '../../models/training';

/** Client filter aligned with `getAssignmentsForAthleteUser` in postgresStore / listAssignmentsForActor. */
export function filterAssignmentsForAthlete(
  assignments: ProgramAssignment[],
  athleteUser: WolfUser | undefined,
  rosterProfiles: Pick<Athlete, 'id' | 'name'>[] = [],
): ProgramAssignment[] {
  if (!athleteUser) return [];

  const profileIds = new Set<string>();
  if (athleteUser.linkedAthleteId) profileIds.add(athleteUser.linkedAthleteId);

  for (const assignment of assignments) {
    if (assignment.athleteUserId === athleteUser.id) {
      profileIds.add(assignment.athleteProfileId);
    }
  }

  if (athleteUser.coachId && rosterProfiles.length > 0) {
    const nameKey = athleteUser.name.trim().toLowerCase();
    const username = (athleteUser.username ?? '').trim().toLowerCase();
    const emailLocal = (athleteUser.email ?? '').split('@')[0]?.trim().toLowerCase() ?? '';
    const userKey = username || emailLocal;
    for (const profile of rosterProfiles) {
      const profileName = profile.name.trim().toLowerCase();
      if (profileName === nameKey || (userKey && profileName.includes(userKey))) {
        profileIds.add(profile.id);
      }
    }
  }

  return assignments.filter(
    (a) => a.athleteUserId === athleteUser.id || profileIds.has(a.athleteProfileId),
  );
}
