import type { ProgramEnrollment } from '../models/coach-architecture';
import type { ProgramAssignment, SessionCompletion } from '../models/training';

/** Assignments for one athlete, newest first. */
export function getAssignmentsForProfile(
  assignments: ProgramAssignment[],
  athleteProfileId: string,
): ProgramAssignment[] {
  return assignments
    .filter((a) => a.athleteProfileId === athleteProfileId)
    .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
}

/** Most recent assignment (legacy helper for single-plan surfaces). */
export function getActiveAssignmentForProfile(
  assignments: ProgramAssignment[],
  athleteProfileId: string,
): ProgramAssignment | undefined {
  return getAssignmentsForProfile(assignments, athleteProfileId)[0];
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

/** True when replacing the same athlete + coach program slot (or legacy slot without coachProgramId). */
export function assignmentSameSlot(
  assignment: ProgramAssignment,
  athleteProfileId: string,
  coachProgramId?: string,
): boolean {
  if (assignment.athleteProfileId !== athleteProfileId) return false;
  if (coachProgramId) return assignment.coachProgramId === coachProgramId;
  return !assignment.coachProgramId;
}

export function upsertAssignmentInList(
  assignments: ProgramAssignment[],
  next: ProgramAssignment,
): ProgramAssignment[] {
  const filtered = assignments.filter(
    (a) => !assignmentSameSlot(a, next.athleteProfileId, next.coachProgramId),
  );
  return [...filtered, next];
}

export function getEnrollmentsForCoachProgram(
  programId: string,
  assignments: ProgramAssignment[],
  completions: SessionCompletion[],
  nameByProfileId: Record<string, string>,
): ProgramEnrollment[] {
  const enrolled: ProgramEnrollment[] = [];

  for (const assignment of assignments) {
    if (assignment.coachProgramId !== programId) continue;

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
  const toAssign: string[] = [];
  const skippedAlreadyOnProgram: string[] = [];

  for (const athleteProfileId of [...new Set(athleteProfileIds)]) {
    const alreadyOnProgram = assignments.some(
      (a) => a.athleteProfileId === athleteProfileId && a.coachProgramId === programId,
    );
    if (alreadyOnProgram) {
      skippedAlreadyOnProgram.push(athleteProfileId);
      continue;
    }
    toAssign.push(athleteProfileId);
  }

  return { toAssign, skippedAlreadyOnProgram };
}

/** Other active coach programs for this athlete (parallel training blocks). */
export function getOtherActivePrograms(
  programId: string,
  athleteProfileId: string,
  assignments: ProgramAssignment[],
): ProgramAssignment[] {
  return getAssignmentsForProfile(assignments, athleteProfileId).filter(
    (a) => a.coachProgramId && a.coachProgramId !== programId,
  );
}

/** @deprecated Use getOtherActivePrograms — kept for gradual migration. */
export function athleteHasOtherActiveProgram(
  programId: string,
  athleteProfileId: string,
  assignments: ProgramAssignment[],
): ProgramAssignment | undefined {
  return getOtherActivePrograms(programId, athleteProfileId, assignments)[0];
}
