import type { Athlete, ProgramAssignment, SessionCompletion, WolfUser } from '../models/training';
import { buildWlAssignmentRows, wlLastCompletionDate } from './dashboardStats';

export type AthleteActiveProgram = {
  assignmentId: string;
  coachProgramId?: string;
  programName: string;
  completionPct: number;
  assignedAt: string;
};

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
  activePrograms: AthleteActiveProgram[];
  programName: string | null;
  completionPct: number | null;
  assignedAt: string | null;
  lastActivityAt: string | null;
  sessionsDone: number;
  sessionSlots: number;
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
  const assignmentByProfile = new Map<string, typeof assignmentRows>();
  for (const row of assignmentRows) {
    const list = assignmentByProfile.get(row.athleteProfileId) ?? [];
    list.push(row);
    assignmentByProfile.set(row.athleteProfileId, list);
  }

  return athletes.map((a) => {
    const linked = userByProfileId.get(a.id);
    const athleteRows = assignmentByProfile.get(a.id) ?? [];
    const assignment = athleteRows[0];
    const programName =
      athleteRows.length === 0
        ? null
        : athleteRows.length === 1
          ? athleteRows[0].programName
          : athleteRows.map((r) => r.programName).join(' · ');
    const activePrograms: AthleteActiveProgram[] = athleteRows.map((r) => ({
      assignmentId: r.assignmentId,
      coachProgramId: r.coachProgramId,
      programName: r.programName,
      completionPct: r.completionPct,
      assignedAt: r.assignedAt,
    }));
    const lastActivityDates = athleteRows
      .map((r) => wlLastCompletionDate(r.assignmentId, completions))
      .filter((d): d is string => Boolean(d));
    const lastActivityAt =
      lastActivityDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    return {
      profileId: a.id,
      name: a.name,
      level: a.level,
      snatch: a.oneRM.snatch,
      cleanJerk: a.oneRM.cleanJerk,
      backSquat: a.oneRM.backSquat,
      hasPlatformAccount: Boolean(linked),
      loginLabel: linked ? (linked.username ?? linked.email ?? linked.id) : null,
      assignmentStatus: athleteRows.length > 0 ? 'active' : 'none',
      activePrograms,
      programName,
      completionPct: assignment?.completionPct ?? null,
      assignedAt: assignment?.assignedAt ?? null,
      lastActivityAt,
      sessionsDone: athleteRows.reduce((sum, r) => sum + r.sessionsDone, 0),
      sessionSlots: athleteRows.reduce((sum, r) => sum + r.sessionSlots, 0),
    };
  });
}
