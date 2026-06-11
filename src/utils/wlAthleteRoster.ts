import type { Athlete, ProgramAssignment, SessionCompletion, WolfUser } from '../models/training';
import { buildWlAssignmentRows } from './dashboardStats';

export type WlAthleteRosterRow = {
  profileId: string;
  name: string;
  level: Athlete['level'];
  snatch: number;
  cleanJerk: number;
  backSquat: number;
  hasPlatformAccount: boolean;
  loginLabel: string | null;
  assignmentStatus: 'none' | 'active';
  programName: string | null;
  completionPct: number | null;
  assignedAt: string | null;
};

export function buildWlAthleteRosterRows(
  athletes: Athlete[],
  users: WolfUser[],
  assignments: ProgramAssignment[],
  completions: SessionCompletion[],
  coachId: string | undefined,
): WlAthleteRosterRow[] {
  const scopedUsers = coachId
    ? users.filter((u) => u.role === 'athlete' && u.coachId === coachId)
    : users.filter((u) => u.role === 'athlete');

  const userByProfileId = new Map<string, WolfUser>();
  for (const u of scopedUsers) {
    if (u.linkedAthleteId) userByProfileId.set(u.linkedAthleteId, u);
  }

  const nameByProfileId = Object.fromEntries(athletes.map((a) => [a.id, a.name] as const));
  const assignmentRows = buildWlAssignmentRows(assignments, completions, nameByProfileId);
  const assignmentByProfile = new Map(
    assignmentRows.map((r) => [r.athleteProfileId, r] as const),
  );

  return athletes.map((a) => {
    const linked = userByProfileId.get(a.id);
    const asg = assignmentByProfile.get(a.id);
    return {
      profileId: a.id,
      name: a.name,
      level: a.level,
      snatch: a.oneRM.snatch,
      cleanJerk: a.oneRM.cleanJerk,
      backSquat: a.oneRM.backSquat,
      hasPlatformAccount: Boolean(linked),
      loginLabel: linked ? (linked.username ?? linked.email ?? linked.id) : null,
      assignmentStatus: asg ? 'active' : 'none',
      programName: asg?.programName ?? null,
      completionPct: asg?.completionPct ?? null,
      assignedAt: asg?.assignedAt ?? null,
    };
  });
}
