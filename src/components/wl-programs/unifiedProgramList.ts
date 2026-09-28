import type { CoachProgramRow, CoachProgramStatus } from '../../models/coach-architecture';
import type { ProgramAssignment, SessionCompletion } from '../../models/training';
import { formatProgramDateRange } from '../../utils/programSchedule';

import type { ProgramsKindFilter } from '../../navigation/deepLinks';

export type UnifiedKindFilter = ProgramsKindFilter;

export type ProgramStatusFilterId = 'all' | 'published' | 'draft' | 'without_athletes';

export type IndividualOrigin = 'from_template' | 'standalone';

export type UnifiedProgramRow =
  | {
      kind: 'template';
      id: string;
      sortAt: string;
      template: CoachProgramRow;
      displayName: string;
      dateRange: string | null;
      weekCount: number;
      assignmentCount: number;
      adherencePct: number | undefined;
    }
  | {
      kind: 'individual';
      id: string;
      sortAt: string;
      assignment: ProgramAssignment;
      athleteProfileId: string;
      athleteName: string;
      displayName: string;
      dateRange: string | null;
      origin: IndividualOrigin;
      templateCoachProgramId?: string;
      templateName?: string;
      originLabel: string;
      weekCount: number;
      adherencePct: number | undefined;
    };

function assignmentAdherencePct(
  assignment: ProgramAssignment,
  completions: SessionCompletion[],
): number | undefined {
  const slotCompletions = completions.filter((c) => c.assignmentId === assignment.id);
  const totalDays = assignment.program.weeks.reduce((s, w) => s + w.days.length, 0);
  if (totalDays <= 0) return undefined;
  const completedDays = new Set(
    slotCompletions.filter((c) => c.exerciseIndex == null).map((c) => `${c.weekNumber}-${c.dayNumber}`),
  ).size;
  return Math.round((completedDays / totalDays) * 100);
}

export function buildUnifiedProgramRows(params: {
  coachPrograms: CoachProgramRow[];
  assignments: ProgramAssignment[];
  completions: SessionCompletion[];
  athleteNameById: Record<string, string>;
  isEs: boolean;
}): UnifiedProgramRow[] {
  const { coachPrograms, assignments, completions, athleteNameById, isEs } = params;
  const templateNameById = new Map(coachPrograms.map((p) => [p.id, p.name]));

  const templateRows: UnifiedProgramRow[] = coachPrograms
    .filter((p) => p.status !== 'archived')
    .map((template) => ({
      kind: 'template' as const,
      id: `tpl-${template.id}`,
      sortAt: template.updatedAt,
      template,
      displayName: template.name,
      dateRange: formatProgramDateRange(template.program, isEs),
      weekCount: template.program.totalWeeks ?? template.program.weeks?.length ?? 0,
      assignmentCount: template.enrolledAthletes.length,
      adherencePct: template.avgAdherencePct,
    }));

  const individualRows: UnifiedProgramRow[] = assignments.map((assignment) => {
    const athleteName =
      athleteNameById[assignment.athleteProfileId]?.trim() || assignment.athleteProfileId;
    const coachProgramId = assignment.coachProgramId;
    const fromTemplate = Boolean(coachProgramId);
    const templateName = coachProgramId ? templateNameById.get(coachProgramId) : undefined;
    const displayName = assignment.program.name?.trim() || templateName || athleteName;
    const originLabel = fromTemplate
      ? isEs
        ? `desde plantilla${templateName ? ` · ${templateName}` : ''}`
        : `from template${templateName ? ` · ${templateName}` : ''}`
      : isEs
        ? 'individual'
        : 'standalone';

    return {
      kind: 'individual' as const,
      id: `asg-${assignment.id}`,
      sortAt: assignment.assignedAt,
      assignment,
      athleteProfileId: assignment.athleteProfileId,
      athleteName,
      displayName,
      dateRange: formatProgramDateRange(assignment.program, isEs),
      origin: fromTemplate ? 'from_template' : 'standalone',
      templateCoachProgramId: coachProgramId,
      templateName,
      originLabel,
      weekCount: assignment.program.weeks?.length ?? assignment.program.totalWeeks ?? 0,
      adherencePct: assignmentAdherencePct(assignment, completions),
    };
  });

  return [...templateRows, ...individualRows].sort(
    (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime(),
  );
}

export function filterUnifiedRows(
  rows: UnifiedProgramRow[],
  params: {
    search: string;
    kindFilter: UnifiedKindFilter;
    athleteProfileId?: string;
    coachProgramId?: string;
    statusFilter: ProgramStatusFilterId;
  },
): UnifiedProgramRow[] {
  const q = params.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (params.kindFilter === 'templates' && row.kind !== 'template') return false;
    if (params.kindFilter === 'individuals' && row.kind !== 'individual') return false;

    if (params.coachProgramId) {
      if (row.kind === 'template') return row.template.id === params.coachProgramId;
      return row.templateCoachProgramId === params.coachProgramId;
    }

    if (params.athleteProfileId) {
      if (row.kind !== 'individual') return false;
      if (row.athleteProfileId !== params.athleteProfileId) return false;
    }

    if (q) {
      if (row.kind === 'template') {
        const t = row.template;
        const match =
          t.name.toLowerCase().includes(q) ||
          t.enrolledAthletes.some((e) => e.athleteName.toLowerCase().includes(q));
        if (!match) return false;
      } else {
        const match =
          row.displayName.toLowerCase().includes(q) ||
          row.athleteName.toLowerCase().includes(q) ||
          (row.templateName?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
    }

    if (params.statusFilter !== 'all' && row.kind === 'template') {
      const status: CoachProgramStatus = row.template.status;
      if (params.statusFilter === 'published' && status !== 'published') return false;
      if (params.statusFilter === 'draft' && status !== 'draft') return false;
      if (params.statusFilter === 'without_athletes' && row.assignmentCount > 0) return false;
    }

    return true;
  });
}
