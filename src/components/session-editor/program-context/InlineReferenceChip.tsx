import type { ExercisePrescriptionSnapshot } from '../programExerciseHistory';
import { formatInlineHistoryLine } from '../programExerciseHistory';

export function InlineReferenceChip({
  snapshots,
  isEs,
  prGapKg,
}: {
  snapshots: ExercisePrescriptionSnapshot[];
  isEs: boolean;
  /** Distancia al PR en kg (solo informativo). */
  prGapKg?: number | null;
}) {
  const line = formatInlineHistoryLine(snapshots, isEs);

  return (
    <span className="wl-inline-ref-chip" title={line}>
      {isEs ? 'Últ: ' : 'Last: '}
      {line}
      {prGapKg != null && prGapKg > 0 && prGapKg < 5 ? (
        <span className="wl-inline-ref-chip__pr">
          {' '}
          ⚡ {prGapKg.toFixed(2)} kg {isEs ? 'del PR' : 'to PR'}
        </span>
      ) : null}
    </span>
  );
}
