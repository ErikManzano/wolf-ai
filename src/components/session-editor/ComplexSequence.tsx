import React, { useState } from 'react';
import { GripVertical, Link2, Plus, Trash2 } from 'lucide-react';
import type { Exercise } from '../../models/training';
import { exerciseName } from './blockMetrics';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
import { SectionHeader } from './SectionHeader';

interface ComplexSequenceProps {
  segmentIds: string[];
  exercises: Exercise[];
  isEs: boolean;
  onSegmentChange: (index: number, exerciseId: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  canRemove: boolean;
}

export const ComplexSequence: React.FC<ComplexSequenceProps> = ({
  segmentIds,
  exercises,
  isEs,
  onSegmentChange,
  onAdd,
  onRemove,
  onReorder,
  canRemove,
}) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  return (
    <section className="wolf-se-section">
      <SectionHeader
        icon={Link2}
        title={isEs ? 'Movimientos del complejo' : 'Complex movements'}
        action={
          <button type="button" className="wolf-se-btn wolf-se-btn--outline wolf-se-btn--sm" onClick={onAdd}>
            <Plus size={14} className="me-1" />
            {isEs ? 'Añadir' : 'Add'}
          </button>
        }
      />

      <div className="wolf-se-pipeline-scroll">
        <div className="wolf-se-pipeline">
          {segmentIds.map((segId, idx) => (
            <React.Fragment key={`${segId}-${idx}`}>
              {idx > 0 && <div className="wolf-se-pipeline-connector" aria-hidden />}
              <div
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx !== null && dragIdx !== idx) onReorder(dragIdx, idx);
                  setDragIdx(null);
                }}
                onDragEnd={() => setDragIdx(null)}
                className={`wolf-se-pipeline-node ${dragIdx === idx ? 'is-dragging' : ''}`}
              >
                <div className="wolf-se-pipeline-node-top">
                  <span className="wolf-se-pipeline-step">{idx + 1}</span>
                  <button type="button" className="wolf-se-btn wolf-se-btn--ghost wolf-se-drag-handle" tabIndex={-1} aria-hidden>
                    <GripVertical size={14} />
                  </button>
                  {canRemove && segmentIds.length > 2 && (
                    <button
                      type="button"
                      className="wolf-se-btn wolf-se-btn--ghost wolf-se-btn--danger"
                      aria-label={isEs ? 'Quitar' : 'Remove'}
                      onClick={() => onRemove(idx)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className="wolf-se-pipeline-label text-truncate" title={exerciseName(exercises, segId)}>
                  {exerciseName(exercises, segId)}
                </p>
                <ExerciseAutocomplete
                  exercises={exercises}
                  value={segId}
                  onChange={(id) => onSegmentChange(idx, id)}
                  isEs={isEs}
                  compact
                />
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
