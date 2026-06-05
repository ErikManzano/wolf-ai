import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { Exercise, Session, SessionExerciseBlock } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';
import { formatBlockPrescription } from './schemeFormat';

interface SessionSheetOverviewProps {
  session: Session;
  exercises: Exercise[];
  isEs: boolean;
  onSelectBlock?: (index: number) => void;
}

function blockDisplayName(block: SessionExerciseBlock, exercises: Exercise[]): string {
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  if (isComplex && block.segments?.length) {
    return block.segments
      .map((s) => exercises.find((e) => e.id === s.exerciseId)?.name ?? s.exerciseId)
      .join(' → ');
  }
  return exercises.find((e) => e.id === block.exerciseId)?.name ?? block.exerciseId;
}

export const SessionSheetOverview: React.FC<SessionSheetOverviewProps> = ({
  session,
  exercises,
  isEs,
  onSelectBlock,
}) => {
  if (!session.exercises.length) return null;

  return (
    <section className="wolf-se-sheet" aria-label={isEs ? 'Vista hoja del día' : 'Day sheet overview'}>
      <div className="wolf-se-sheet-head">
        <div className="wolf-se-sheet-head-main">
          <h3 className="wolf-se-sheet-title">{isEs ? 'Hoja del día' : 'Day sheet'}</h3>
          <span className="wolf-se-sheet-count" aria-label={isEs ? 'Ejercicios' : 'Exercises'}>
            {session.exercises.length}
          </span>
        </div>
        <span className="wolf-se-sheet-hint">{isEs ? 'Toca una fila para editar' : 'Tap a row to edit'}</span>
      </div>
      <ol className="wolf-se-sheet-rows">
        {session.exercises.map((block, i) => {
          const prescription = formatBlockPrescription(block);
          const name = blockDisplayName(block, exercises);
          return (
            <li key={`sheet-${block.exerciseId}-${i}`}>
              <button
                type="button"
                className="wolf-se-sheet-row"
                onClick={() => onSelectBlock?.(i)}
              >
                <span className="wolf-se-sheet-row-num">{i + 1}</span>
                <span className="wolf-se-sheet-row-body">
                  <span className="wolf-se-sheet-row-name">{name}</span>
                  <code className="wolf-se-sheet-row-rx" title={prescription}>
                    {prescription}
                  </code>
                </span>
                <ChevronRight size={16} className="wolf-se-sheet-row-chevron" aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
