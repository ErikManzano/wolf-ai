import type { Athlete, Exercise, GeneratedProgram, SessionExerciseBlock, SessionGoal } from '../models/training';
import { TEMPLATE_PROGRAM_ATHLETE_ID } from '../models/coach-architecture';
import { buildSessionFromBlocks, getExercisePoolForGoal } from '../services/sessionGenerator';

export interface ProgramDraftInput {
  name: string;
  startDate: string;
  totalWeeks: number;
  daysPerWeek: number;
  primaryGoal?: ExerciseGoal;
}

const TEMPLATE_ATHLETE: Athlete = {
  id: TEMPLATE_PROGRAM_ATHLETE_ID,
  name: 'Template',
  level: 'intermediate',
  bodyweight: 80,
  oneRM: { snatch: 80, cleanJerk: 100, backSquat: 140, frontSquat: 120 },
  fatigueScore: 20,
  readinessScore: 80,
};

function defaultStarterScheme() {
  return { percentage: 75, reps: 3, sets: 1, targetRir: 2, restSec: 150 };
}

/** One simple + one complex block for day 1 (coach fills/changes exercises in editor). */
export function buildStarterDayBlocks(
  exercises: Exercise[],
  primaryGoal: SessionGoal = 'strength',
): SessionExerciseBlock[] {
  const pool = exercises.length > 0 ? getExercisePoolForGoal(primaryGoal, exercises) : [];
  const firstId = pool[0]?.id ?? '';
  const secondId = pool[1]?.id ?? firstId;
  const scheme = defaultStarterScheme();

  return [
    {
      exerciseId: firstId,
      blockType: 'single',
      sets: [scheme],
    },
    {
      exerciseId: firstId,
      blockType: 'complex',
      segments: [{ exerciseId: firstId }, { exerciseId: secondId }],
      sets: [{ ...scheme, segmentReps: ['1', '1'], reps: 2 }],
    },
  ];
}

export function buildStarterProgramDraft(
  input: ProgramDraftInput,
  exercises: Exercise[] = [],
): GeneratedProgram {
  const base = buildProgramDraft(input);
  const blocks = buildStarterDayBlocks(exercises, base.primaryGoal);
  const session = buildSessionFromBlocks(
    TEMPLATE_PROGRAM_ATHLETE_ID,
    blocks,
    TEMPLATE_ATHLETE,
    exercises,
  );

  return {
    ...base,
    weeks: [
      {
        weekNumber: 1,
        days: [{ dayNumber: 1, label: 'Día 1', session }],
      },
    ],
  };
}

/** ISO date (YYYY-MM-DD) + calendar days. */
export function addCalendarDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T12:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Last calendar day of the mesocycle block (inclusive). */
export function computeProgramEndDate(startDate: string, totalWeeks: number): string {
  const weeks = Math.max(1, Math.round(totalWeeks));
  return addCalendarDays(startDate, weeks * 7 - 1);
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildProgramDraft(input: ProgramDraftInput): GeneratedProgram {
  const name = input.name.trim();
  const totalWeeks = Math.max(1, Math.min(52, Math.round(input.totalWeeks)));
  const daysPerWeek = Math.max(1, Math.min(7, Math.round(input.daysPerWeek)));
  const startDate = input.startDate || todayIsoDate();
  const endDate = computeProgramEndDate(startDate, totalWeeks);

  return {
    id: `prog-${Date.now()}`,
    name,
    athleteId: TEMPLATE_PROGRAM_ATHLETE_ID,
    createdAt: new Date().toISOString(),
    totalWeeks,
    daysPerWeek,
    primaryGoal: input.primaryGoal ?? 'strength',
    startDate,
    endDate,
    weeks: [],
  };
}

export function totalTrainingDays(totalWeeks: number, daysPerWeek: number): number {
  return Math.max(1, Math.round(totalWeeks)) * Math.max(1, Math.round(daysPerWeek));
}
