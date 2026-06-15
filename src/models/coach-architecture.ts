/**
 * Coach-centric persistence model — Phase 1.
 *
 * Maps to Postgres (see docs/sql/coach-architecture-phase1.sql):
 *   Coach            → users (role = 'coach')
 *   AthleteProfile   → wl_athlete_profiles
 *   ProgramTemplate  → coach_wl_templates (legacy, migrating to coach_programs)
 *   CoachProgram     → coach_programs
 *   ActiveAssignment → assignments (+ coach_program_id, source_template_id)
 *
 * Immutability rule: templates are never mutated by athlete progress or live edits.
 * Assignments always store a deep-cloned GeneratedProgram snapshot.
 */

import type {
  Athlete,
  AthleteLevel,
  GeneratedProgram,
  ProgramAssignmentVersion,
  ProgramDay,
  Session,
  SessionExerciseBlock,
  WolfUser,
} from './training';

/** Coach account that owns templates, athlete profiles, and assignments. */
export interface Coach {
  id: string;
  name: string;
  email?: string;
  username?: string;
}

/** WL athlete profile scoped to a single coach (roster entry + PRs). */
export interface AthleteProfile extends Athlete {
  coachId: string;
  /** Platform login (`WolfUser.id`) when the athlete has an app account. */
  linkedUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export type CoachProgramStatus = 'draft' | 'published' | 'archived';

/** Coach-owned mesocycle definition (hub CRUD). */
export interface CoachProgram {
  id: string;
  coachId: string;
  name: string;
  program: GeneratedProgram;
  status: CoachProgramStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramEnrollment {
  athleteProfileId: string;
  athleteName: string;
  assignmentId: string;
  assignedAt: string;
  completionPct?: number;
}

/** Program row with linked athlete instances for the hub table. */
export interface CoachProgramRow extends CoachProgram {
  enrolledAthletes: ProgramEnrollment[];
  avgAdherencePct?: number;
}

export interface CreateCoachProgramInput {
  name: string;
  program: GeneratedProgram;
  status?: CoachProgramStatus;
}

export interface UpdateCoachProgramInput {
  name?: string;
  program?: GeneratedProgram;
  status?: CoachProgramStatus;
}

export interface AssignCoachProgramInput {
  athleteProfileIds: string[];
}

/** Reusable mesocycle blueprint owned by a coach. Never written by athlete tracking. */
export interface ProgramTemplate {
  id: string;
  coachId: string;
  name: string;
  /** Blueprint program; `program.athleteId` is typically a template placeholder. */
  program: GeneratedProgram;
  /** When saved from an existing assignment snapshot. */
  sourceAssignmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActiveAssignmentStatus = 'active' | 'archived';

/**
 * Live program instance assigned to one athlete.
 * Cloned from a template or ad-hoc generation at assign time.
 */
export interface ActiveAssignment {
  id: string;
  coachId: string;
  athleteProfileId: string;
  athleteUserId?: string;
  /** Traceability back to the template used at assign time (optional). */
  sourceTemplateId?: string;
  status: ActiveAssignmentStatus;
  version: number;
  program: GeneratedProgram;
  versionHistory: ProgramAssignmentVersion[];
  assignedAt: string;
}

/** Payload to create a template from the wizard or library UI. */
export interface CreateProgramTemplateInput {
  name: string;
  program: GeneratedProgram;
  sourceAssignmentId?: string;
}

/** Payload when assigning a template (or raw program) to an athlete. */
export interface AssignTemplateInput {
  athleteProfileId: string;
  athleteUserId?: string;
  /** Override template name on the cloned program; defaults to template.name. */
  programName?: string;
}

/** Coach live-edit of an in-flight assignment (step 3 wizard / assignment detail). */
export interface UpdateActiveAssignmentInput {
  program: GeneratedProgram;
}

export type CreateAthleteProfileInput = Omit<Athlete, 'fatigueScore' | 'readinessScore'> &
  Partial<Pick<Athlete, 'fatigueScore' | 'readinessScore'>>;

export type UpdateAthleteProfileInput = Partial<
  Pick<Athlete, 'name' | 'level' | 'bodyweight' | 'oneRM' | 'fatigueScore' | 'readinessScore'>
>;

/** Placeholder athlete id stored inside template JSON (not a real profile). */
export const TEMPLATE_PROGRAM_ATHLETE_ID = '__template__';

export function coachFromUser(user: WolfUser): Coach | null {
  if (user.role !== 'coach') return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
  };
}

export function athleteProfileFromStoreRow(
  row: Athlete & { coachId: string; createdAt: string; updatedAt: string },
  linkedUserId?: string,
): AthleteProfile {
  return {
    ...row,
    linkedUserId,
  };
}

/** Deep-clone a GeneratedProgram for assignment immutability. */
export function cloneProgramForAthlete(
  source: GeneratedProgram,
  athleteProfileId: string,
  overrides?: Partial<Pick<GeneratedProgram, 'id' | 'name' | 'createdAt'>>,
): GeneratedProgram {
  const cloned: GeneratedProgram = normalizeGeneratedProgram(structuredClone(source));
  cloned.id = overrides?.id ?? `prog-${crypto.randomUUID()}`;
  cloned.athleteId = athleteProfileId;
  cloned.name = overrides?.name ?? source.name;
  cloned.createdAt = overrides?.createdAt ?? new Date().toISOString();
  return cloned;
}

type LegacyProgramDay = ProgramDay & { exercises?: unknown[] };

function emptySession(athleteId: string, dayNumber: number): Session {
  return {
    id: `session-d${dayNumber}`,
    athleteId,
    exercises: [],
    totalReps: 0,
    avgRelativeIntensity: 0,
    avgAbsoluteIntensity: 0,
    load: 0,
    kValue: 0,
  };
}

function isSessionExerciseBlock(value: unknown): value is SessionExerciseBlock {
  if (!value || typeof value !== 'object') return false;
  const block = value as SessionExerciseBlock;
  return typeof block.exerciseId === 'string' && Array.isArray(block.sets);
}

function legacyExercisesFromDay(day: LegacyProgramDay): SessionExerciseBlock[] {
  if (!Array.isArray(day.exercises)) return [];
  return day.exercises.filter(isSessionExerciseBlock);
}

/** Ensure each program day has `session.exercises` (guards malformed API/seed data). */
export function normalizeGeneratedProgram(program: GeneratedProgram): GeneratedProgram {
  const athleteId = program.athleteId || TEMPLATE_PROGRAM_ATHLETE_ID;
  return {
    ...program,
    weeks: (program.weeks ?? []).map((week) => ({
      weekNumber: week.weekNumber,
      days: (week.days ?? []).map((day) => {
        const legacyDay = day as LegacyProgramDay;
        if (legacyDay.session && Array.isArray(legacyDay.session.exercises)) {
          return {
            dayNumber: legacyDay.dayNumber,
            label: legacyDay.label ?? `Día ${legacyDay.dayNumber}`,
            session: {
              ...legacyDay.session,
              athleteId: legacyDay.session.athleteId || athleteId,
              exercises: legacyDay.session.exercises,
            },
          };
        }
        const legacyExercises = legacyExercisesFromDay(legacyDay);
        const session = legacyDay.session ?? emptySession(athleteId, legacyDay.dayNumber);
        return {
          dayNumber: legacyDay.dayNumber,
          label: legacyDay.label ?? `Día ${legacyDay.dayNumber}`,
          session: {
            ...session,
            athleteId: session.athleteId || athleteId,
            exercises: legacyExercises,
          },
        };
      }),
    })),
  };
}

/** Normalize template programs so they never reference a real athlete id. */
export function normalizeProgramForTemplate(program: GeneratedProgram): GeneratedProgram {
  return {
    ...normalizeGeneratedProgram(structuredClone(program)),
    athleteId: TEMPLATE_PROGRAM_ATHLETE_ID,
  };
}

export function isValidAthleteLevel(value: unknown): value is AthleteLevel {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced';
}
