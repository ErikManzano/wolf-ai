import type { GeneratedProgram, SessionCompletion } from '../models/training';

export function completionMatches(
  c: SessionCompletion,
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
  exerciseIndex?: number,
): boolean {
  if (c.assignmentId !== assignmentId || c.weekNumber !== weekNumber || c.dayNumber !== dayNumber) {
    return false;
  }
  if (exerciseIndex === undefined) {
    return c.exerciseIndex === undefined;
  }
  return c.exerciseIndex === exerciseIndex;
}

export function isExerciseComplete(
  completions: SessionCompletion[],
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
  exerciseIndex: number,
): boolean {
  return completions.some((c) => completionMatches(c, assignmentId, weekNumber, dayNumber, exerciseIndex));
}

export function isSessionMarkedComplete(
  completions: SessionCompletion[],
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
): boolean {
  return completions.some((c) => completionMatches(c, assignmentId, weekNumber, dayNumber, undefined));
}

export function isDayComplete(
  completions: SessionCompletion[],
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
  exerciseCount: number,
): boolean {
  if (isSessionMarkedComplete(completions, assignmentId, weekNumber, dayNumber)) return true;
  if (exerciseCount <= 0) return false;
  for (let i = 0; i < exerciseCount; i += 1) {
    if (!isExerciseComplete(completions, assignmentId, weekNumber, dayNumber, i)) return false;
  }
  return true;
}

export function countProgramExercises(program: GeneratedProgram): number {
  return program.weeks.reduce((acc, w) => acc + w.days.reduce((d, day) => d + day.session.exercises.length, 0), 0);
}

export function countCompletedExercises(
  completions: SessionCompletion[],
  assignmentId: string,
  program: GeneratedProgram,
): number {
  let n = 0;
  for (const w of program.weeks) {
    for (const day of w.days) {
      const count = day.session.exercises.length;
      if (isSessionMarkedComplete(completions, assignmentId, w.weekNumber, day.dayNumber)) {
        n += count;
        continue;
      }
      for (let i = 0; i < count; i += 1) {
        if (isExerciseComplete(completions, assignmentId, w.weekNumber, day.dayNumber, i)) n += 1;
      }
    }
  }
  return n;
}

export function countCompletedDays(
  completions: SessionCompletion[],
  assignmentId: string,
  program: GeneratedProgram,
): number {
  let n = 0;
  for (const w of program.weeks) {
    for (const day of w.days) {
      if (isDayComplete(completions, assignmentId, w.weekNumber, day.dayNumber, day.session.exercises.length)) {
        n += 1;
      }
    }
  }
  return n;
}
