import type { Athlete, Exercise, GeneratedProgram, ProgramDay, ProgramWeek } from '../models/training';
import { buildBlocksForSlot } from './programGenerator';
import { buildSessionFromBlocks } from './sessionGenerator';

export const PROGRAM_STRUCTURE_LIMITS = {
  MIN_WEEKS: 1,
  MAX_WEEKS: 52,
  MIN_DAYS_PER_WEEK: 1,
  MAX_DAYS_PER_WEEK: 7,
} as const;

function cloneProgram(program: GeneratedProgram): GeneratedProgram {
  return JSON.parse(JSON.stringify(program)) as GeneratedProgram;
}

function renumberWeeks(weeks: ProgramWeek[]): ProgramWeek[] {
  return weeks.map((w, wi) => ({
    ...w,
    weekNumber: wi + 1,
    days: w.days.map((d, di) => ({
      ...d,
      dayNumber: di + 1,
    })),
  }));
}

/** Keeps totalWeeks / daysPerWeek in sync with the actual grid (max days in any week). */
export function syncProgramMeta(program: GeneratedProgram): GeneratedProgram {
  const totalWeeks = program.weeks.length;
  const daysPerWeek = Math.max(1, ...program.weeks.map((w) => w.days.length));
  return { ...program, totalWeeks, daysPerWeek };
}

function buildDayForSlot(
  program: GeneratedProgram,
  weekNumber: number,
  dayNumber: number,
  daysInWeek: number,
  athlete: Athlete,
  exercises: Exercise[],
): ProgramDay {
  const blocks = buildBlocksForSlot(
    exercises,
    program.primaryGoal,
    weekNumber,
    Math.max(program.totalWeeks, weekNumber),
    Math.max(program.daysPerWeek, daysInWeek),
    dayNumber - 1,
  );
  const session = buildSessionFromBlocks(program.athleteId, blocks, athlete, exercises);
  return {
    dayNumber,
    label: `Día ${dayNumber}`,
    session,
  };
}

export function renameProgramDayLabel(
  program: GeneratedProgram,
  weekNumber: number,
  dayNumber: number,
  label: string,
): GeneratedProgram {
  const next = cloneProgram(program);
  const day = next.weeks.find((w) => w.weekNumber === weekNumber)?.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return program;
  const trimmed = label.trim();
  day.label = trimmed || `Día ${dayNumber}`;
  return next;
}

export function addWeekToGeneratedProgram(
  program: GeneratedProgram,
  athlete: Athlete,
  exercises: Exercise[],
): GeneratedProgram {
  if (program.weeks.length >= PROGRAM_STRUCTURE_LIMITS.MAX_WEEKS) return program;

  const next = cloneProgram(program);
  const refWeek = next.weeks[next.weeks.length - 1];
  const dayCount = Math.min(
    PROGRAM_STRUCTURE_LIMITS.MAX_DAYS_PER_WEEK,
    Math.max(refWeek?.days.length ?? next.daysPerWeek, 1),
  );
  const newWeekNumber = next.weeks.length + 1;
  const days: ProgramDay[] = [];

  for (let d = 1; d <= dayCount; d++) {
    days.push(buildDayForSlot(next, newWeekNumber, d, dayCount, athlete, exercises));
  }

  next.weeks.push({ weekNumber: newWeekNumber, days });
  return syncProgramMeta(next);
}

export function removeWeekFromGeneratedProgram(program: GeneratedProgram, weekNumber: number): GeneratedProgram {
  if (program.weeks.length <= PROGRAM_STRUCTURE_LIMITS.MIN_WEEKS) return program;

  const next = cloneProgram(program);
  next.weeks = renumberWeeks(next.weeks.filter((w) => w.weekNumber !== weekNumber));
  return syncProgramMeta(next);
}

export function addDayToGeneratedWeek(
  program: GeneratedProgram,
  weekNumber: number,
  athlete: Athlete,
  exercises: Exercise[],
): GeneratedProgram {
  const next = cloneProgram(program);
  const week = next.weeks.find((w) => w.weekNumber === weekNumber);
  if (!week || week.days.length >= PROGRAM_STRUCTURE_LIMITS.MAX_DAYS_PER_WEEK) return program;

  const newDayNumber = week.days.length + 1;
  week.days.push(buildDayForSlot(next, weekNumber, newDayNumber, newDayNumber, athlete, exercises));
  return syncProgramMeta(next);
}

export function removeDayFromGeneratedWeek(
  program: GeneratedProgram,
  weekNumber: number,
  dayNumber: number,
): GeneratedProgram {
  const next = cloneProgram(program);
  const week = next.weeks.find((w) => w.weekNumber === weekNumber);
  if (!week || week.days.length <= PROGRAM_STRUCTURE_LIMITS.MIN_DAYS_PER_WEEK) return program;

  week.days = week.days
    .filter((d) => d.dayNumber !== dayNumber)
    .map((d, i) => ({
      ...d,
      dayNumber: i + 1,
      label: d.label.match(/^Día \d+$/i) || d.label.match(/^Day \d+$/i) ? `Día ${i + 1}` : d.label,
    }));

  return syncProgramMeta(next);
}

