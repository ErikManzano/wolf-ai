import type { Athlete, Exercise, GeneratedProgram, SessionCompletion, SetCompletionLog } from '../models/training';
import { isBlockFullyLogged } from './athleteSetLogs';

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

export function isExerciseCompleteWithSets(
  completions: SessionCompletion[],
  setLogs: SetCompletionLog[],
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
  exerciseIndex: number,
  block: GeneratedProgram['weeks'][number]['days'][number]['session']['exercises'][number],
  athlete: Athlete | undefined,
  exercises: Exercise[],
  exName: (id: string) => string,
): boolean {
  if (isSessionMarkedComplete(completions, assignmentId, weekNumber, dayNumber)) return true;
  if (isExerciseComplete(completions, assignmentId, weekNumber, dayNumber, exerciseIndex)) return true;
  return isBlockFullyLogged(block, setLogs, assignmentId, weekNumber, dayNumber, exerciseIndex, athlete, exercises, exName);
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

export function isDayCompleteWithSets(
  completions: SessionCompletion[],
  setLogs: SetCompletionLog[],
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
  sessionExercises: GeneratedProgram['weeks'][number]['days'][number]['session']['exercises'],
  athlete: Athlete | undefined,
  exercises: Exercise[],
  exName: (id: string) => string,
): boolean {
  if (isSessionMarkedComplete(completions, assignmentId, weekNumber, dayNumber)) return true;
  if (sessionExercises.length === 0) return false;
  for (let i = 0; i < sessionExercises.length; i += 1) {
    if (
      !isExerciseCompleteWithSets(
        completions,
        setLogs,
        assignmentId,
        weekNumber,
        dayNumber,
        i,
        sessionExercises[i]!,
        athlete,
        exercises,
        exName,
      )
    ) {
      return false;
    }
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

export function countCompletedExercisesWithSets(
  completions: SessionCompletion[],
  setLogs: SetCompletionLog[],
  assignmentId: string,
  program: GeneratedProgram,
  athlete: Athlete | undefined,
  exercises: Exercise[],
  exName: (id: string) => string,
): number {
  let n = 0;
  for (const w of program.weeks) {
    for (const day of w.days) {
      for (let i = 0; i < day.session.exercises.length; i += 1) {
        if (
          isExerciseCompleteWithSets(
            completions,
            setLogs,
            assignmentId,
            w.weekNumber,
            day.dayNumber,
            i,
            day.session.exercises[i]!,
            athlete,
            exercises,
            exName,
          )
        ) {
          n += 1;
        }
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

export function countCompletedDaysWithSets(
  completions: SessionCompletion[],
  setLogs: SetCompletionLog[],
  assignmentId: string,
  program: GeneratedProgram,
  athlete: Athlete | undefined,
  exercises: Exercise[],
  exName: (id: string) => string,
): number {
  let n = 0;
  for (const w of program.weeks) {
    for (const day of w.days) {
      if (
        isDayCompleteWithSets(
          completions,
          setLogs,
          assignmentId,
          w.weekNumber,
          day.dayNumber,
          day.session.exercises,
          athlete,
          exercises,
          exName,
        )
      ) {
        n += 1;
      }
    }
  }
  return n;
}
