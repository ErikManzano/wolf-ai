export type SetVisualStatus = 'pending' | 'complete' | 'partial';

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

export function isComplexModified(
  prescribedKg: number,
  actualKg: number,
  prescribedSegmentReps: number[],
  actualSegmentReps: number[],
): boolean {
  if (Math.abs(actualKg - prescribedKg) > 0.05) return true;
  return prescribedSegmentReps.some((rx, i) => (actualSegmentReps[i] ?? rx) !== rx);
}
