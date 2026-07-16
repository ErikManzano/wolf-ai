import type { SessionExerciseBlock } from '../../models/training';
import {
  blockUsesComplexReps,
  formatBlockPrescription,
  formatSetSchemeRow,
} from './schemeFormat';

export interface BlockPrescriptionRxProps {
  block: SessionExerciseBlock;
  className?: string;
}

/** Prescripción del bloque en chips: 75%/2, (85%/2)3 — misma notación que la vista Tabla */
export function BlockPrescriptionRx({ block, className }: BlockPrescriptionRxProps) {
  const isComplex = blockUsesComplexReps(block);
  const fullLabel = formatBlockPrescription(block);

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
          {formatSetSchemeRow(row, isComplex)}
        </span>
      ))}
    </div>
  );
}
