import type { SessionCompletion, SetCompletionLog } from '../../models/training';
import { completionMatches, isDayComplete } from '../../utils/completionHelpers';
import type { SetLogInput } from './types';

export type TrackingSnapshot = {
  setLogs: SetCompletionLog[];
  completions: SessionCompletion[];
};

export function setLogTrackingKey(input: SetLogInput): string {
  return [
    input.assignmentId,
    input.weekNumber,
    input.dayNumber,
    input.exerciseIndex,
    input.schemeIndex,
    input.setInstance,
  ].join(':');
}

export function exerciseTrackingKey(
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
  exerciseIndex: number,
): string {
  return [assignmentId, weekNumber, dayNumber, 'ex', exerciseIndex].join(':');
}

export function sessionTrackingKey(
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
): string {
  return [assignmentId, weekNumber, dayNumber, 'session'].join(':');
}

export function snapshotTracking(setLogs: SetCompletionLog[], completions: SessionCompletion[]): TrackingSnapshot {
  return {
    setLogs: [...setLogs],
    completions: [...completions],
  };
}

function setLogMatches(
  l: SetCompletionLog,
  input: SetLogInput,
): boolean {
  return (
    l.assignmentId === input.assignmentId &&
    l.weekNumber === input.weekNumber &&
    l.dayNumber === input.dayNumber &&
    l.exerciseIndex === input.exerciseIndex &&
    l.schemeIndex === input.schemeIndex &&
    l.setInstance === input.setInstance
  );
}

/** Toggle set completion locally; returns updated setLogs and completions. */
export function applySetToggleLocal(
  setLogs: SetCompletionLog[],
  completions: SessionCompletion[],
  input: SetLogInput,
): TrackingSnapshot {
  const exists = setLogs.some((l) => setLogMatches(l, input));
  const nextLogs = exists
    ? setLogs.filter((l) => !setLogMatches(l, input))
    : [...setLogs, { ...input, completedAt: new Date().toISOString() }];
  const nextCompletions = completions.filter(
    (c) =>
      !(
        c.assignmentId === input.assignmentId &&
        c.weekNumber === input.weekNumber &&
        c.dayNumber === input.dayNumber &&
        c.exerciseIndex === input.exerciseIndex
      ),
  );
  return { setLogs: nextLogs, completions: nextCompletions };
}

export function applyExerciseToggleLocal(
  completions: SessionCompletion[],
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
  exerciseIndex: number,
): SessionCompletion[] {
  const exists = completions.some((c) =>
    completionMatches(c, assignmentId, weekNumber, dayNumber, exerciseIndex),
  );
  if (exists) {
    return completions.filter(
      (c) => !completionMatches(c, assignmentId, weekNumber, dayNumber, exerciseIndex),
    );
  }
  const withoutSession = completions.filter(
    (c) =>
      !(
        c.assignmentId === assignmentId &&
        c.weekNumber === weekNumber &&
        c.dayNumber === dayNumber &&
        c.exerciseIndex === undefined
      ),
  );
  return [
    ...withoutSession,
    { assignmentId, weekNumber, dayNumber, exerciseIndex, completedAt: new Date().toISOString() },
  ];
}

export function applySessionToggleLocal(
  completions: SessionCompletion[],
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
  exerciseCount: number,
): SessionCompletion[] {
  const done = isDayComplete(completions, assignmentId, weekNumber, dayNumber, exerciseCount);
  const filtered = completions.filter(
    (c) => !(c.assignmentId === assignmentId && c.weekNumber === weekNumber && c.dayNumber === dayNumber),
  );
  if (done) return filtered;
  return [...filtered, { assignmentId, weekNumber, dayNumber, completedAt: new Date().toISOString() }];
}

export function applySetLogUpdateLocal(
  setLogs: SetCompletionLog[],
  input: SetLogInput,
): SetCompletionLog[] {
  const idx = setLogs.findIndex((l) => setLogMatches(l, input));
  if (idx < 0) {
    return [...setLogs, { ...input, completedAt: new Date().toISOString() }];
  }
  const next = [...setLogs];
  next[idx] = {
    ...next[idx]!,
    actualKg: input.actualKg ?? next[idx]!.actualKg,
    actualReps: input.actualReps ?? next[idx]!.actualReps,
    actualSegmentReps: input.actualSegmentReps ?? next[idx]!.actualSegmentReps,
  };
  return next;
}

/** Serializes async tracking mutations to avoid race on rapid taps. */
export function createTrackingQueue() {
  let tail: Promise<void> = Promise.resolve();
  return {
    enqueue<T>(fn: () => Promise<T>): Promise<T> {
      const run = tail.then(fn, fn);
      tail = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };
}
