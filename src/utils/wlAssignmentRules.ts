import type { ProgramEnrollment } from '../models/coach-architecture';
import type { ProgramAssignment, SessionCompletion } from '../models/training';

/** Each athlete may have at most one active WL assignment. Re-assigning moves them to the new program. */
export function getActiveAssignmentForProfile(
  assignments: ProgramAssignment[],
  athleteProfileId: string,
): ProgramAssignment | undefined {
  const matches = assignments.filter((a) => a.athleteProfileId === athleteProfileId);
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  return matches.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0];
}

export function buildActiveAssignmentMap(
  assignments: ProgramAssignment[],
): Map<string, ProgramAssignment> {
  const map = new Map<string, ProgramAssignment>();
  for (const assignment of assignments) {
    const prev = map.get(assignment.athleteProfileId);
    if (!prev || new Date(assignment.assignedAt).getTime() > new Date(prev.assignedAt).getTime()) {
      map.set(assignment.athleteProfileId, assignment);
    }
  }
  return map;
}

export function getEnrollmentsForCoachProgram(
  programId: string,
  assignments: ProgramAssignment[],
  completions: SessionCompletion[],
  nameByProfileId: Record<string, string>,
): ProgramEnrollment[] {
  const activeByProfile = buildActiveAssignmentMap(assignments);
  const enrolled: ProgramEnrollment[] = [];

  for (const assignment of assignments) {
    if (assignment.coachProgramId !== programId) continue;
    const active = activeByProfile.get(assignment.athleteProfileId);
    if (!active || active.id !== assignment.id) continue;

    const slotCompletions = completions.filter((c) => c.assignmentId === assignment.id);
    const totalDays = assignment.program.weeks.reduce((s, w) => s + w.days.length, 0);
    const completedDays = new Set(
      slotCompletions.filter((c) => c.exerciseIndex == null).map((c) => `${c.weekNumber}-${c.dayNumber}`),
    ).size;
    const completionPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : undefined;

    enrolled.push({
      athleteProfileId: assignment.athleteProfileId,
      athleteName: nameByProfileId[assignment.athleteProfileId] ?? assignment.athleteProfileId,
      assignmentId: assignment.id,
      assignedAt: assignment.assignedAt,
      completionPct,
    });
  }

  return enrolled;
}

export function filterAthletesForProgramAssign(
  programId: string,
  athleteProfileIds: string[],
  assignments: ProgramAssignment[],
): {
  toAssign: string[];
  skippedAlreadyOnProgram: string[];
} {
  const activeByProfile = buildActiveAssignmentMap(assignments);
  const toAssign: string[] = [];
  const skippedAlreadyOnProgram: string[] = [];

  for (const athleteProfileId of [...new Set(athleteProfileIds)]) {
    const active = activeByProfile.get(athleteProfileId);
    if (active?.coachProgramId === programId) {
      skippedAlreadyOnProgram.push(athleteProfileId);
      continue;
    }
    toAssign.push(athleteProfileId);
  }

  return { toAssign, skippedAlreadyOnProgram };
}

export function athleteHasOtherActiveProgram(
  programId: string,
  athleteProfileId: string,
  assignments: ProgramAssignment[],
): ProgramAssignment | undefined {
  const active = getActiveAssignmentForProfile(assignments, athleteProfileId);
  if (!active?.coachProgramId || active.coachProgramId === programId) return undefined;
  return active;
}
