import React from 'react';
import { ChevronDown, ChevronUp, Layers, Trash2, Zap } from 'lucide-react';
import { blockAvgIntensity, blockTotalSets, blockTonnage, exerciseName, sequenceLabel } from './blockMetrics';
import type { Athlete, Exercise, SessionExerciseBlock } from '../../models/training';

interface BlockHeaderProps {
  block: SessionExerciseBlock;
  blockIndex: number;
  exercises: Exercise[];
  athlete: Athlete;
  isEs: boolean;
  isWarmup: boolean;
  isComplex: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
  onToggleComplex: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export const BlockHeader: React.FC<BlockHeaderProps> = ({
  block,
  blockIndex,
  exercises,
  athlete,
  isEs,
  isWarmup,
  isComplex,
  canMoveUp,
  canMoveDown,
  canDelete,
  onToggleComplex,
  onMoveUp,
  onMoveDown,
  onDelete,
}) => {
  const tonnage = blockTonnage(block, athlete, exercises);
  const avgPct = blockAvgIntensity(block);
  const totalSets = blockTotalSets(block);
  const title = sequenceLabel(block, exercises);
  const segments = block.segments ?? [];

  return (
    <header className="wolf-se-header">
      <div className="wolf-se-header-top">
        <div className="wolf-se-header-main">
          <span className="wolf-se-index" aria-hidden>
            {blockIndex + 1}
          </span>
          <div className="wolf-se-header-content">
            <div className="wolf-se-badges">
              <span className={`wolf-se-badge ${isComplex ? 'wolf-se-badge--complex' : 'wolf-se-badge--single'}`}>
                {isComplex ? <Layers size={11} /> : <Zap size={11} />}
                {isComplex ? (isEs ? 'Complejo' : 'Complex') : isEs ? 'Simple' : 'Single'}
              </span>
              {isWarmup && <span className="wolf-se-badge wolf-se-badge--warmup">{isEs ? 'Calentamiento' : 'Warm-up'}</span>}
            </div>
            <h2 className="wolf-se-header-title">{title}</h2>
            {isComplex && segments.length > 1 && (
              <p className="wolf-se-header-seq">
                {segments.map((s) => (
                  <span key={s.exerciseId}>{exerciseName(exercises, s.exerciseId)}</span>
                ))}
              </p>
            )}
            <div className="wolf-se-intensity-bar" aria-hidden>
              <div className="wolf-se-intensity-fill" style={{ width: `${Math.min(100, avgPct)}%` }} />
            </div>
            <div className="wolf-se-stats">
              <div>
                <span className="wolf-se-stat-label">%1RM</span>
                <span className="wolf-se-stat-value wolf-se-stat-value--accent">{avgPct}%</span>
              </div>
              <div>
                <span className="wolf-se-stat-label">{isEs ? 'Series' : 'Sets'}</span>
                <span className="wolf-se-stat-value">{totalSets}</span>
              </div>
              <div>
                <span className="wolf-se-stat-label">{isEs ? 'Tonelaje' : 'Load'}</span>
                <span className="wolf-se-stat-value wolf-se-stat-value--accent">{tonnage} kg</span>
              </div>
            </div>
          </div>
        </div>
        <div className="wolf-se-header-actions">
          <button type="button" className="wolf-se-btn wolf-se-btn--outline wolf-se-btn--sm" onClick={onToggleComplex}>
            {isComplex ? (isEs ? '→ Simple' : '→ Single') : isEs ? '→ Complejo' : '→ Complex'}
          </button>
          <div className="wolf-se-icon-row">
            <button type="button" className="wolf-se-btn wolf-se-btn--ghost wolf-se-btn--sm" disabled={!canMoveUp} onClick={onMoveUp} aria-label={isEs ? 'Subir' : 'Up'}>
              <ChevronUp size={17} />
            </button>
            <button type="button" className="wolf-se-btn wolf-se-btn--ghost wolf-se-btn--sm" disabled={!canMoveDown} onClick={onMoveDown} aria-label={isEs ? 'Bajar' : 'Down'}>
              <ChevronDown size={17} />
            </button>
            <button type="button" className="wolf-se-btn wolf-se-btn--ghost wolf-se-btn--sm wolf-se-btn--danger" disabled={!canDelete} onClick={onDelete} aria-label={isEs ? 'Eliminar' : 'Delete'}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
