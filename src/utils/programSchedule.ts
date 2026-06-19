import type { ExerciseGoal, GeneratedProgram } from '../models/training';
import { TEMPLATE_PROGRAM_ATHLETE_ID } from '../models/coach-architecture';

export interface ProgramDraftInput {
  name: string;
  startDate: string;
  totalWeeks: number;
  daysPerWeek: number;
  primaryGoal?: ExerciseGoal;
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
