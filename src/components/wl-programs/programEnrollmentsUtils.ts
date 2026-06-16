import type { ProgramEnrollment } from '../../models/coach-architecture';
import type { Athlete, ProgramAssignment } from '../../models/training';
import { getOtherActivePrograms } from '../../utils/wlAssignmentRules';

export type EnrollmentFilterId = 'all' | 'enrolled' | 'not_enrolled' | 'parallel';

export type ProgramEnrollmentRow = {
  athlete: Athlete;
  enrollment?: ProgramEnrollment;
  otherPrograms: ProgramAssignment[];
  otherProgramNames: string[];
};

export function buildProgramEnrollmentRows(
  roster: Athlete[],
  programId: string,
  enrolledByProfileId: Map<string, ProgramEnrollment>,
  assignments: ProgramAssignment[],
): ProgramEnrollmentRow[] {
  return roster.map((athlete) => {
    const enrollment = enrolledByProfileId.get(athlete.id);
    const otherPrograms = getOtherActivePrograms(programId, athlete.id, assignments);
    return {
      athlete,
      enrollment,
      otherPrograms,
      otherProgramNames: otherPrograms.map((a) => a.program.name),
    };
  });
}

export function filterEnrollmentRows(
  rows: ProgramEnrollmentRow[],
  filter: EnrollmentFilterId,
  search: string,
): ProgramEnrollmentRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter(({ athlete, enrollment, otherProgramNames }) => {
    if (filter === 'enrolled' && !enrollment) return false;
    if (filter === 'not_enrolled' && enrollment) return false;
    if (filter === 'parallel' && (enrollment || otherProgramNames.length === 0)) return false;
    if (!q) return true;
    return (
      athlete.name.toLowerCase().includes(q) ||
      athlete.level.toLowerCase().includes(q) ||
      enrollment?.athleteName.toLowerCase().includes(q) ||
      otherProgramNames.some((name) => name.toLowerCase().includes(q))
    );
  });
}

export function athleteInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
