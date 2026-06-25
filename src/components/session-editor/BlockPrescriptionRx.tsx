import type { SessionExerciseBlock } from '../../models/training';
import {
  blockUsesComplexReps,
  formatBlockPrescriptionDisplay,
  formatSchemeRepsToken,
} from './schemeFormat';

export interface BlockPrescriptionRxProps {
  block: SessionExerciseBlock;
  className?: string;
}

/** Prescripción del bloque en chips legibles: 100% × 2 × 3 */
export function BlockPrescriptionRx({ block, className }: BlockPrescriptionRxProps) {
  const isComplex = blockUsesComplexReps(block);
  const fullLabel = formatBlockPrescriptionDisplay(block);

  if (!block.sets.length) {
    return (
      <span
        className={['wolf-se-spreadsheet__exercise-rx', 'wolf-se-spreadsheet__exercise-rx--empty', className]
          .filter(Boolean)
          .join(' ')}
      >
        —
      </span>
    );
  }

  return (
    <div
      className={['wolf-se-spreadsheet__exercise-rx', className].filter(Boolean).join(' ')}
      title={fullLabel}
      aria-label={fullLabel}
    >
      {block.sets.map((row, idx) => (
        <span key={idx} className="wolf-se-spreadsheet__exercise-rx-chip">
          <span className="wolf-se-spreadsheet__exercise-rx-pct">{row.percentage}%</span>
          <span className="wolf-se-spreadsheet__exercise-rx-mul" aria-hidden>
            ×
          </span>
          <span className="wolf-se-spreadsheet__exercise-rx-reps">
            {formatSchemeRepsToken(row, isComplex)}
          </span>
          <span className="wolf-se-spreadsheet__exercise-rx-mul" aria-hidden>
            ×
          </span>
          <span className="wolf-se-spreadsheet__exercise-rx-sets">{row.sets}</span>
        </span>
      ))}
    </div>
  );
}
