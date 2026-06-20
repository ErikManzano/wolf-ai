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

function renumberDays(days: ProgramDay[]): ProgramDay[] {
  return days.map((d, di) => ({
    ...d,
    dayNumber: di + 1,
    label:
      d.label.match(/^D[ií]a \d+$/i) || d.label.match(/^Day \d+$/i) ? `Día ${di + 1}` : d.label,
  }));
}

export function resolveWeekNumberAfterWeekReorder(
  weeks: ProgramWeek[],
  selectedWeek: number,
  fromWeekNumber: number,
  toWeekNumber: number,
): number {
  const fromIdx = weeks.findIndex((w) => w.weekNumber === fromWeekNumber);
  const toIdx = weeks.findIndex((w) => w.weekNumber === toWeekNumber);
  const selIdx = weeks.findIndex((w) => w.weekNumber === selectedWeek);
  if (fromIdx < 0 || toIdx < 0 || selIdx < 0) return selectedWeek;

  const order = weeks.map((_, i) => i);
  const [moved] = order.splice(fromIdx, 1);
  order.splice(toIdx, 0, moved!);
  return order.indexOf(selIdx) + 1;
}

export function resolveDayNumberAfterDayReorder(
  days: ProgramDay[],
  selectedDay: number,
  fromDayNumber: number,
  toDayNumber: number,
): number {
  const fromIdx = days.findIndex((d) => d.dayNumber === fromDayNumber);
  const toIdx = days.findIndex((d) => d.dayNumber === toDayNumber);
  const selIdx = days.findIndex((d) => d.dayNumber === selectedDay);
  if (fromIdx < 0 || toIdx < 0 || selIdx < 0) return selectedDay;

  const order = days.map((_, i) => i);
  const [moved] = order.splice(fromIdx, 1);
  order.splice(toIdx, 0, moved!);
  return order.indexOf(selIdx) + 1;
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

  week.days = renumberDays(week.days.filter((d) => d.dayNumber !== dayNumber));

  return syncProgramMeta(next);
}

export function reorderWeeksInGeneratedProgram(
  program: GeneratedProgram,
  fromWeekNumber: number,
  toWeekNumber: number,
): GeneratedProgram {
  if (fromWeekNumber === toWeekNumber) return program;

  const next = cloneProgram(program);
  const fromIdx = next.weeks.findIndex((w) => w.weekNumber === fromWeekNumber);
  const toIdx = next.weeks.findIndex((w) => w.weekNumber === toWeekNumber);
  if (fromIdx < 0 || toIdx < 0) return program;

  const [moved] = next.weeks.splice(fromIdx, 1);
  next.weeks.splice(toIdx, 0, moved!);
  next.weeks = renumberWeeks(next.weeks);
  return syncProgramMeta(next);
}

export function reorderDaysInGeneratedWeek(
  program: GeneratedProgram,
  weekNumber: number,
  fromDayNumber: number,
  toDayNumber: number,
): GeneratedProgram {
  if (fromDayNumber === toDayNumber) return program;

  const next = cloneProgram(program);
  const week = next.weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) return program;

  const fromIdx = week.days.findIndex((d) => d.dayNumber === fromDayNumber);
  const toIdx = week.days.findIndex((d) => d.dayNumber === toDayNumber);
  if (fromIdx < 0 || toIdx < 0) return program;

  const [moved] = week.days.splice(fromIdx, 1);
  week.days.splice(toIdx, 0, moved!);
  week.days = renumberDays(week.days);
  return syncProgramMeta(next);
}

export function reorderDaysAcrossProgram(
  program: GeneratedProgram,
  fromDayNumber: number,
  toDayNumber: number,
): GeneratedProgram {
  if (fromDayNumber === toDayNumber) return program;

  let next = program;
  for (const week of program.weeks) {
    const hasFrom = week.days.some((d) => d.dayNumber === fromDayNumber);
    const hasTo = week.days.some((d) => d.dayNumber === toDayNumber);
    if (hasFrom && hasTo) {
      next = reorderDaysInGeneratedWeek(next, week.weekNumber, fromDayNumber, toDayNumber);
    }
  }
  return next;
}

export type ProgramDaySlot = { weekNumber: number; dayNumber: number };

export function swapProgramDaySlots(
  program: GeneratedProgram,
  from: ProgramDaySlot,
  to: ProgramDaySlot,
): GeneratedProgram {
  if (from.weekNumber === to.weekNumber && from.dayNumber === to.dayNumber) return program;

  const next = cloneProgram(program);
  const fromDay = next.weeks
    .find((w) => w.weekNumber === from.weekNumber)
    ?.days.find((d) => d.dayNumber === from.dayNumber);
  const toDay = next.weeks
    .find((w) => w.weekNumber === to.weekNumber)
    ?.days.find((d) => d.dayNumber === to.dayNumber);
  if (!fromDay || !toDay) return program;

  const sessionCopy = JSON.parse(JSON.stringify(fromDay.session)) as typeof fromDay.session;
  const labelCopy = fromDay.label;
  fromDay.session = JSON.parse(JSON.stringify(toDay.session)) as typeof toDay.session;
  fromDay.label = toDay.label;
  toDay.session = sessionCopy;
  toDay.label = labelCopy;
  return next;
}

