export type ProgramSyncState = 'saved' | 'pending' | 'saving';

export function countBlocksInProgramDay(
  program: { weeks: Array<{ weekNumber: number; days: Array<{ dayNumber: number; session: { exercises: unknown[] } }> }> },
  weekNumber: number,
  dayNumber: number,
): number {
  const week = program.weeks.find((w) => w.weekNumber === weekNumber);
  const day = week?.days.find((d) => d.dayNumber === dayNumber);
  return day?.session.exercises.length ?? 0;
}
