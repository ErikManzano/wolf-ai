import type { RepOutcome, SetCompletionLog } from '../models/training';
import type { FlatSetRow } from './athleteSetLogs';

export type SetVisualStatus = 'pending' | 'complete' | 'partial';
export type SetCardTone = 'complete' | 'partial' | 'pending';

export function sumReps(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function deriveSimpleSetStatus(args: {
  done: boolean;
  prescribedKg: number;
  actualKg: number;
  prescribedReps: number;
  actualReps: number;
}): SetVisualStatus {
  if (!args.done) return 'pending';
  const kgOk = Math.abs(args.actualKg - args.prescribedKg) <= 0.05;
  const repsOk = args.actualReps === args.prescribedReps;
  return kgOk && repsOk ? 'complete' : 'partial';
}

export function deriveComplexSetStatus(args: {
  done: boolean;
  prescribedKg: number;
  actualKg: number;
  prescribedSegmentReps: number[];
  actualSegmentReps: number[];
}): SetVisualStatus {
  if (!args.done) return 'pending';
  const kgOk = Math.abs(args.actualKg - args.prescribedKg) <= 0.05;
  const repsOk = args.prescribedSegmentReps.every(
    (rx, i) => (args.actualSegmentReps[i] ?? rx) === rx,
  );
  return kgOk && repsOk ? 'complete' : 'partial';
}

/** Al marcar check: Rx en segmentos que el atleta no editó manualmente. */
export function resolveSegmentRepsOnComplete(
  prescribed: number[],
  pending: number[],
  touched: boolean[],
): number[] {
  return prescribed.map((rx, i) => (touched[i] ? pending[i]! : rx));
}

export function segmentRepsHint(
  prescribed: number[],
  actual: number[],
  isEs: boolean,
): string | undefined {
  const partial = prescribed.some((rx, i) => (actual[i] ?? rx) < rx);
  if (!partial) return undefined;
  const done = actual.reduce((a, b) => a + b, 0);
  const rx = prescribed.reduce((a, b) => a + b, 0);
  return isEs ? `Parcial ${done}/${rx}` : `Partial ${done}/${rx}`;
}

/** Resumen condensado ej. "2/2 + 1/1 + 0/1" */
export function formatSegmentRepsSummary(prescribed: number[], actual: number[]): string {
  return prescribed.map((rx, i) => `${actual[i] ?? rx}/${rx}`).join(' + ');
}

export function cycleRepOutcome(current: RepOutcome): RepOutcome {
  if (current === 'pending') return 'completed';
  if (current === 'completed') return 'failed';
  return 'pending';
}

export function completedCountFromOutcomes(outcomes: RepOutcome[]): number {
  return outcomes.filter((o) => o === 'completed').length;
}

export function deriveRepOutcomes(
  prescribed: number,
  stored?: RepOutcome[],
  log?: { actualReps?: number },
  done = false,
): RepOutcome[] {
  if (stored?.length === prescribed) return [...stored];
  const outcomes: RepOutcome[] = Array.from({ length: prescribed }, () => 'pending');
  const completed = Math.min(prescribed, Math.max(0, log?.actualReps ?? 0));
  for (let i = 0; i < prescribed; i++) {
    if (i < completed) outcomes[i] = 'completed';
    else if (i === completed && done && completed > 0 && completed < prescribed) outcomes[i] = 'failed';
  }
  return outcomes;
}

export function ensureSegmentOutcomes(
  prescribed: number[],
  current: RepOutcome[][],
): RepOutcome[][] {
  return prescribed.map((rx, index) => {
    const existing = current[index];
    if (existing?.length === rx) return existing;
    return deriveRepOutcomes(rx);
  });
}

export function deriveSegmentRepOutcomes(
  prescribed: number[],
  stored?: RepOutcome[][],
  actual?: number[],
  done = false,
): RepOutcome[][] {
  return prescribed.map((rx, segIndex) =>
    deriveRepOutcomes(rx, stored?.[segIndex], { actualReps: actual?.[segIndex] }, done),
  );
}

export function flattenSegmentOutcomes(outcomes: RepOutcome[][]): RepOutcome[] {
  return outcomes.flat();
}

export function deriveSetCardTone(outcomes: RepOutcome[], active: boolean, done: boolean): SetCardTone {
  if (!outcomes.length) return 'pending';
  const allCompleted = outcomes.every((o) => o === 'completed');
  const anyTouched = outcomes.some((o) => o !== 'pending');
  if (allCompleted && done) return 'complete';
  if (active || (anyTouched && !allCompleted)) return 'partial';
  return 'pending';
}

export function segmentRepsFromOutcomes(outcomes: RepOutcome[][]): number[] {
  return outcomes.map((segment) => completedCountFromOutcomes(segment));
}

export function repOutcomesAddressed(outcomes: RepOutcome[]): boolean {
  return outcomes.length > 0 && outcomes.every((o) => o !== 'pending');
}

export function isSetAddressed(row: FlatSetRow, log?: SetCompletionLog): boolean {
  if (!log) return false;

  const segments = row.prescribedSegmentReps;
  if (row.isComplex && segments?.length) {
    if (log.actualSegmentRepOutcomes?.length) {
      return log.actualSegmentRepOutcomes.every((seg, i) => {
        const rx = segments[i] ?? 0;
        return seg.length === rx && repOutcomesAddressed(seg);
      });
    }
    return segments.every((rx, i) => (log.actualSegmentReps?.[i] ?? 0) === rx);
  }

  if (log.actualRepOutcomes?.length) {
    return log.actualRepOutcomes.length === row.prescribedReps && repOutcomesAddressed(log.actualRepOutcomes);
  }

  return (log.actualReps ?? 0) === row.prescribedReps;
}

export function isSetFullyComplete(row: FlatSetRow, log?: SetCompletionLog): boolean {
  if (!log) return false;

  const segments = row.prescribedSegmentReps;
  if (row.isComplex && segments?.length) {
    if (log.actualSegmentRepOutcomes?.length) {
      return log.actualSegmentRepOutcomes.every((seg, i) => {
        const rx = segments[i] ?? 0;
        return seg.length === rx && seg.every((o) => o === 'completed');
      });
    }
    return segments.every((rx, i) => (log.actualSegmentReps?.[i] ?? 0) === rx);
  }

  if (log.actualRepOutcomes?.length) {
    return (
      log.actualRepOutcomes.length === row.prescribedReps &&
      log.actualRepOutcomes.every((o) => o === 'completed')
    );
  }

  return (log.actualReps ?? 0) === row.prescribedReps;
}

export function isComplexModified(
  prescribedKg: number,
  actualKg: number,
  prescribedSegmentReps: number[],
  actualSegmentReps: number[],
): boolean {
  if (Math.abs(actualKg - prescribedKg) > 0.05) return true;
  return prescribedSegmentReps.some((rx, i) => (actualSegmentReps[i] ?? rx) !== rx);
}
