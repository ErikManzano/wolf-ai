import type { GeneratedProgram } from '../../models/training';

export type ProgramSyncState = 'saved' | 'pending' | 'saving';

/** Weeks/days added, removed, or re-sized — needs full program PATCH, not session-only. */
export function isStructuralProgramChange(prev: GeneratedProgram | null, next: GeneratedProgram): boolean {
  if (!prev) return false;
  if (prev.weeks.length !== next.weeks.length) return true;
  if (prev.totalWeeks !== next.totalWeeks) return true;
  if (prev.daysPerWeek !== next.daysPerWeek) return true;
  const prevWeeksByNumber = new Map(prev.weeks.map((w) => [w.weekNumber, w]));
  for (const week of next.weeks) {
    const prevWeek = prevWeeksByNumber.get(week.weekNumber);
    if (prevWeek && prevWeek.days.length !== week.days.length) return true;
  }
  return false;
}

export function countBlocksInProgramDay(
  program: { weeks: Array<{ weekNumber: number; days: Array<{ dayNumber: number; session: { exercises: unknown[] } }> }> },
  weekNumber: number,
  dayNumber: number,
): number {
  const week = program.weeks.find((w) => w.weekNumber === weekNumber);
  const day = week?.days.find((d) => d.dayNumber === dayNumber);
  return day?.session.exercises.length ?? 0;
}
