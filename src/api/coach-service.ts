/**
 * Coach domain service — programs, templates, assignments with clone immutability.
 */

import type { PostgresStore } from './postgresStore';
import type {
  ActiveAssignment,
  AssignCoachProgramInput,
  AssignTemplateInput,
  CoachProgram,
  CoachProgramRow,
  CreateCoachProgramInput,
  CreateProgramTemplateInput,
  ProgramEnrollment,
  ProgramTemplate,
  UpdateActiveAssignmentInput,
  UpdateCoachProgramInput,
} from '../models/coach-architecture';
import {
  cloneProgramForAthlete,
  normalizeProgramForTemplate,
  TEMPLATE_PROGRAM_ATHLETE_ID,
} from '../models/coach-architecture';
import type { GeneratedProgram, ProgramAssignment, ProgramAssignmentVersion, WolfUser } from '../models/training';
import { getEnrollmentsForCoachProgram } from '../utils/wlAssignmentRules';

type CoachServiceDeps = {
  store: PostgresStore;
  onAssignmentsChanged?: (coachId: string) => void;
  onTemplatesChanged?: (coachId: string) => void;
  onProgramsChanged?: (coachId: string) => void;
};

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function mapAssignmentRow(row: ProgramAssignment): ActiveAssignment {
  return {
    id: row.id,
    coachId: row.coachId,
    athleteProfileId: row.athleteProfileId,
    athleteUserId: row.athleteUserId,
    sourceTemplateId: row.sourceTemplateId,
    status: 'active',
    version: row.version,
    program: row.program,
    versionHistory: row.versionHistory,
    assignedAt: row.assignedAt,
  };
}

function emptyDraftProgram(name: string): GeneratedProgram {
  return {
    id: `prog-${crypto.randomUUID()}`,
    name,
    athleteId: TEMPLATE_PROGRAM_ATHLETE_ID,
    createdAt: new Date().toISOString(),
    totalWeeks: 4,
    daysPerWeek: 3,
    primaryGoal: 'strength',
    weeks: [],
  };
}

export class CoachService {
  private readonly store: PostgresStore;
  private readonly onAssignmentsChanged?: (coachId: string) => void;
  private readonly onTemplatesChanged?: (coachId: string) => void;
  private readonly onProgramsChanged?: (coachId: string) => void;

  constructor(deps: CoachServiceDeps) {
    this.store = deps.store;
    this.onAssignmentsChanged = deps.onAssignmentsChanged;
    this.onTemplatesChanged = deps.onTemplatesChanged;
    this.onProgramsChanged = deps.onProgramsChanged;
  }

  async listPrograms(coachId: string): Promise<CoachProgramRow[]> {
    const programs = await this.store.listCoachPrograms(coachId);
    const profiles = await this.store.listAthleteProfiles(coachId);
    const nameById = Object.fromEntries(profiles.map((p) => [p.id, p.name] as const));
    const coachAssignments = (await this.store.getAssignments()).filter((a) => a.coachId === coachId);
    const rows: CoachProgramRow[] = [];

    for (const program of programs) {
      const enrolledAthletes = getEnrollmentsForCoachProgram(
        program.id,
        coachAssignments,
        [],
        nameById,
      );
      const adherenceValues = enrolledAthletes
        .map((e) => e.completionPct)
        .filter((v): v is number => v != null);
      rows.push({
        ...program,
        enrolledAthletes,
        avgAdherencePct:
          adherenceValues.length > 0
            ? Math.round(adherenceValues.reduce((s, v) => s + v, 0) / adherenceValues.length)
            : undefined,
      });
    }
    return rows;
  }

  async getProgram(coachId: string, programId: string): Promise<CoachProgram | null> {
    return this.store.getCoachProgramById(coachId, programId);
  }

  async createProgram(coachId: string, input: CreateCoachProgramInput): Promise<CoachProgram> {
    const program = normalizeProgramForTemplate(input.program ?? emptyDraftProgram(input.name.trim()));
    const created = await this.store.createCoachProgram({
      id: newId('cpr'),
      coachId,
      name: input.name.trim(),
      program,
      status: input.status ?? 'draft',
    });
    this.onProgramsChanged?.(coachId);
    return created;
  }

  async updateProgram(
    coachId: string,
    programId: string,
    input: UpdateCoachProgramInput,
  ): Promise<CoachProgram> {
    const existing = await this.store.getCoachProgramById(coachId, programId);
    if (!existing) {
      throw new CoachServiceError('PROGRAM_NOT_FOUND', 'Coach program not found.');
    }
    const patch = {
      ...input,
      program: input.program ? normalizeProgramForTemplate(input.program) : undefined,
    };
    const updated = await this.store.updateCoachProgram(coachId, programId, patch);
    if (!updated) {
      throw new CoachServiceError('UPDATE_FAILED', 'Could not update coach program.');
    }
    if (patch.program) {
      const linked = await this.store.getAssignmentsByCoachProgramId(programId);
      if (linked.length > 0) {
        await Promise.all(
          linked.map(async (asg) => {
            const cloned = cloneProgramForAthlete(patch.program!, asg.athleteProfileId, {
              name: updated.name,
            });
            await this.store.updateAssignmentProgram(asg.id, cloned, { skipVersionHistory: true });
          }),
        );
        this.onAssignmentsChanged?.(coachId);
      }
    }
    this.onProgramsChanged?.(coachId);
    return updated;
  }

  async deleteProgram(coachId: string, programId: string): Promise<void> {
    const result = await this.store.deleteCoachProgram(coachId, programId);
    if (!result.ok) {
      throw new CoachServiceError(
        result.error?.includes('enrollments') ? 'PROGRAM_HAS_ENROLLMENTS' : 'PROGRAM_NOT_FOUND',
        result.error ?? 'Could not delete program.',
      );
    }
    this.onProgramsChanged?.(coachId);
  }

  async duplicateProgram(coachId: string, programId: string): Promise<CoachProgram> {
    const existing = await this.store.getCoachProgramById(coachId, programId);
    if (!existing) {
      throw new CoachServiceError('PROGRAM_NOT_FOUND', 'Coach program not found.');
    }
    return this.createProgram(coachId, {
      name: `${existing.name} (copia)`,
      program: structuredClone(existing.program),
      status: 'draft',
    });
  }

  async getProgramEnrollments(coachId: string, programId: string): Promise<ProgramEnrollment[]> {
    const program = await this.store.getCoachProgramById(coachId, programId);
    if (!program) {
      throw new CoachServiceError('PROGRAM_NOT_FOUND', 'Coach program not found.');
    }
    const assignments = await this.store.getAssignmentsByCoachProgramId(programId);
    const profiles = await this.store.listAthleteProfiles(coachId);
    const nameById = Object.fromEntries(profiles.map((p) => [p.id, p.name] as const));
    return assignments.map((a) => ({
      athleteProfileId: a.athleteProfileId,
      athleteName: nameById[a.athleteProfileId] ?? a.athleteProfileId,
      assignmentId: a.id,
      assignedAt: a.assignedAt,
    }));
  }

  async assignProgramToAthletes(
    coachId: string,
    programId: string,
    input: AssignCoachProgramInput,
    resolveAthleteUserId: (profileId: string) => string | undefined,
  ): Promise<ActiveAssignment[]> {
    // Athletes may carry multiple coach programs in parallel; re-assigning updates the same program slot.
    const coachProgram = await this.store.getCoachProgramById(coachId, programId);
    if (!coachProgram) {
      throw new CoachServiceError('PROGRAM_NOT_FOUND', 'Coach program not found.');
    }
    const ids = [...new Set(input.athleteProfileIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) {
      throw new CoachServiceError('ATHLETE_NOT_FOUND', 'No athlete profiles selected.');
    }

    const created: ActiveAssignment[] = [];
    for (const athleteProfileId of ids) {
      const profile = await this.store.getAthleteProfileById(athleteProfileId);
      if (!profile || profile.coachId !== coachId) {
        throw new CoachServiceError('ATHLETE_NOT_FOUND', `Athlete profile not found: ${athleteProfileId}`);
      }
      const clonedProgram = cloneProgramForAthlete(coachProgram.program, athleteProfileId, {
        name: coachProgram.name,
      });
      const assignment = await this.store.createOrReplaceAssignment({
        id: newId('asg'),
        coachId,
        athleteProfileId,
        athleteUserId: resolveAthleteUserId(athleteProfileId),
        program: clonedProgram,
        coachProgramId: programId,
      });
      created.push(mapAssignmentRow(assignment));
    }

    if (coachProgram.status === 'draft') {
      await this.store.updateCoachProgram(coachId, programId, { status: 'published' });
    }

    this.onAssignmentsChanged?.(coachId);
    this.onProgramsChanged?.(coachId);
    return created;
  }

  async createTemplate(coachId: string, input: CreateProgramTemplateInput): Promise<ProgramTemplate> {
    const program = normalizeProgramForTemplate(input.program);
    const created = await this.store.createCoachTemplate({
      id: newId('tpl'),
      coachId,
      name: input.name.trim(),
      program,
      sourceAssignmentId: input.sourceAssignmentId,
    });
    this.onTemplatesChanged?.(coachId);
    return created;
  }

  async assignTemplateToAthlete(
    coachId: string,
    templateId: string,
    input: AssignTemplateInput,
  ): Promise<ActiveAssignment> {
    const templates = await this.store.listCoachTemplates(coachId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      throw new CoachServiceError('TEMPLATE_NOT_FOUND', 'Program template not found.');
    }

    const profile = await this.store.getAthleteProfileById(input.athleteProfileId);
    if (!profile || profile.coachId !== coachId) {
      throw new CoachServiceError('ATHLETE_NOT_FOUND', 'Athlete profile not found for this coach.');
    }

    const clonedProgram = cloneProgramForAthlete(template.program, input.athleteProfileId, {
      name: input.programName?.trim() || template.name,
    });

    const assignment = await this.store.createOrReplaceAssignment({
      id: newId('asg'),
      coachId,
      athleteProfileId: input.athleteProfileId,
      athleteUserId: input.athleteUserId,
      program: clonedProgram,
      sourceTemplateId: templateId,
    });

    this.onAssignmentsChanged?.(coachId);
    return mapAssignmentRow(assignment);
  }

  async assignProgramToAthlete(
    coachId: string,
    athleteProfileId: string,
    program: GeneratedProgram,
    athleteUserId?: string,
    coachProgramId?: string,
  ): Promise<ActiveAssignment> {
    const profile = await this.store.getAthleteProfileById(athleteProfileId);
    if (!profile || profile.coachId !== coachId) {
      throw new CoachServiceError('ATHLETE_NOT_FOUND', 'Athlete profile not found for this coach.');
    }

    const clonedProgram = cloneProgramForAthlete(program, athleteProfileId);
    const assignment = await this.store.createOrReplaceAssignment({
      id: newId('asg'),
      coachId,
      athleteProfileId,
      athleteUserId,
      program: clonedProgram,
      coachProgramId,
    });
    this.onAssignmentsChanged?.(coachId);
    return mapAssignmentRow(assignment);
  }

  async updateActiveAssignment(
    coachId: string,
    assignmentId: string,
    input: UpdateActiveAssignmentInput,
  ): Promise<ActiveAssignment> {
    const existing = await this.store.getAssignmentById(assignmentId);
    if (!existing || existing.coachId !== coachId) {
      throw new CoachServiceError('ASSIGNMENT_NOT_FOUND', 'Assignment not found for this coach.');
    }

    const program = cloneProgramForAthlete(input.program, existing.athleteProfileId, {
      id: existing.program.id,
      name: input.program.name,
      createdAt: existing.program.createdAt,
    });

    const updated = await this.store.updateAssignmentProgram(assignmentId, program);
    if (!updated) {
      throw new CoachServiceError('UPDATE_FAILED', 'Could not update assignment program.');
    }

    this.onAssignmentsChanged?.(coachId);
    return mapAssignmentRow(updated);
  }
}

export class CoachServiceError extends Error {
  readonly code:
    | 'TEMPLATE_NOT_FOUND'
    | 'PROGRAM_NOT_FOUND'
    | 'PROGRAM_HAS_ENROLLMENTS'
    | 'ATHLETE_NOT_FOUND'
    | 'ASSIGNMENT_NOT_FOUND'
    | 'UPDATE_FAILED';

  constructor(code: CoachServiceError['code'], message: string) {
    super(message);
    this.name = 'CoachServiceError';
    this.code = code;
  }
}

export type { ProgramAssignmentVersion, WolfUser };
