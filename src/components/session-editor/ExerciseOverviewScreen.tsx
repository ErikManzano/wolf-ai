import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, MoreVertical, Plus } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock } from '../../models/training';
import type { SessionApplyFn } from './types';
import {
  addSetToBlock,
  updateSetSchemeField,
  WL_SESSION_LIMITS,
} from '../../services/sessionMutations';
import { normalizeBlockType } from '../../services/trainingEngine';
import {
  blockTonnage,
  blockTotalReps,
  blockTotalSets,
  exerciseName,
  findCatalogExercise,
  kgForExercise,
} from './blockMetrics';
import { CoachSetBlockEditor } from './CoachSetBlockEditor';
import { blockUsesComplexReps, formatSetSchemeCoachTab } from './schemeFormat';
import './exercise-overview-screen.css';
import './exercise-sets-coach-screen.css';

export interface ExerciseOverviewScreenProps {
  block: SessionExerciseBlock;
  blockIndex: number;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  totalBlocks: number;
  onApply: SessionApplyFn;
  onBack: () => void;
  onRemoveBlock?: () => void;
  initialExpandedSetIndex?: number | null;
}

function blockTitle(
  block: SessionExerciseBlock,
  isComplex: boolean,
  segments: { exerciseId: string }[],
  exercises: Exercise[],
): string {
  if (isComplex && segments.length) {
    return segments.map((s) => exerciseName(exercises, s.exerciseId)).join(' → ');
  }
  return exerciseName(exercises, block.exerciseId);
}

export const ExerciseOverviewScreen: React.FC<ExerciseOverviewScreenProps> = ({
  block,
  blockIndex: bi,
  athlete,
  exercises,
  isEs,
  totalBlocks,
  onApply,
  onBack,
  onRemoveBlock,
  initialExpandedSetIndex = null,
}) => {
  const apply = onApply;
  const [activeSetIndex, setActiveSetIndex] = useState(() =>
    initialExpandedSetIndex ?? (block.sets.length > 0 ? 0 : 0),
  );
  const prevSetCountRef = useRef(block.sets.length);

  useEffect(() => {
    if (initialExpandedSetIndex != null && initialExpandedSetIndex < block.sets.length) {
      setActiveSetIndex(initialExpandedSetIndex);
    }
  }, [initialExpandedSetIndex, block.sets.length]);

  useEffect(() => {
    if (block.sets.length > prevSetCountRef.current) {
      setActiveSetIndex(block.sets.length - 1);
    } else {
      setActiveSetIndex((prev) => Math.min(prev, Math.max(0, block.sets.length - 1)));
    }
    prevSetCountRef.current = block.sets.length;
  }, [block.sets.length]);

  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const segments = block.segments ?? [];
  const title = blockTitle(block, isComplex, segments, exercises);
  const tonnage = blockTonnage(block, athlete, exercises);
  const totalSets = blockTotalSets(block);
  const totalReps = blockTotalReps(block);
  const isComplexReps = blockUsesComplexReps(block);
  const catalogEx = findCatalogExercise(exercises, block.exerciseId);
  const canAddBlock = block.sets.length < WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK;
  const activeScheme = block.sets[activeSetIndex];
  const activeKg =
    catalogEx && activeScheme ? kgForExercise(athlete, catalogEx, activeScheme.percentage) : '—';

  const handleAddBlock = () => {
    apply((current) => addSetToBlock(current, bi, athlete, exercises));
  };

  return (
    <div className="wolf-se-exercise-overview">
      <header className="wolf-se-exercise-overview__head">
        <button
          type="button"
          className="wolf-se-exercise-overview__back"
          onClick={onBack}
          aria-label={isEs ? 'Volver al día' : 'Back to day'}
        >
          <ArrowLeft size={20} aria-hidden />
        </button>
        <h2 className="wolf-se-exercise-overview__title">{title}</h2>
        <div className="wolf-se-exercise-overview__menu">
          {onRemoveBlock ? (
            <button
              type="button"
              className="wolf-se-exercise-overview__menu-btn"
              title={isEs ? 'Quitar ejercicio' : 'Remove exercise'}
              aria-label={isEs ? 'Quitar ejercicio' : 'Remove exercise'}
              disabled={totalBlocks <= 1}
              onClick={onRemoveBlock}
            >
              <MoreVertical size={20} aria-hidden />
            </button>
          ) : (
            <span className="wolf-se-exercise-overview__menu-spacer" aria-hidden>
              <MoreVertical size={20} />
            </span>
          )}
        </div>
      </header>

      <div className="wolf-se-exercise-overview__body">
        {block.sets.length > 0 && activeScheme ? (
          <div className="wolf-se-exercise-overview__editor">
            <div
              className="wolf-se-coach-block-tabs wolf-se-exercise-overview__tabs"
              role="tablist"
              aria-label={isEs ? 'Bloques' : 'Blocks'}
            >
              {block.sets.map((scheme, si) => (
                <button
                  key={si}
                  type="button"
                  role="tab"
                  aria-selected={activeSetIndex === si}
                  className={`wolf-se-coach-block-tabs__tab${activeSetIndex === si ? ' is-active' : ''}`}
                  onClick={() => setActiveSetIndex(si)}
                >
                  {formatSetSchemeCoachTab(scheme, isComplexReps)}
                </button>
              ))}
            </div>

            <div className="wolf-se-coach-blocks-select wolf-se-exercise-overview__blocks-count" aria-hidden>
              {block.sets.length} {isEs ? 'bloques' : 'blocks'}
              <ChevronDown size={16} />
            </div>

            <CoachSetBlockEditor
              scheme={activeScheme}
              setIndex={activeSetIndex}
              kg={activeKg}
              isEs={isEs}
              variant="panel"
              onPctChange={(v) =>
                apply((current) =>
                  updateSetSchemeField(current, bi, activeSetIndex, 'percentage', v, athlete, exercises),
                )
              }
              onRepsChange={(v) =>
                apply((current) =>
                  updateSetSchemeField(current, bi, activeSetIndex, 'reps', v, athlete, exercises),
                )
              }
              onSetsChange={(v) =>
                apply((current) =>
                  updateSetSchemeField(current, bi, activeSetIndex, 'sets', v, athlete, exercises),
                )
              }
              onRestChange={(v) =>
                apply((current) =>
                  updateSetSchemeField(current, bi, activeSetIndex, 'restSec', v, athlete, exercises),
                )
              }
            />
          </div>
        ) : (
          <p className="wolf-se-exercise-overview__empty">
            {isEs ? 'Sin bloques prescritos' : 'No prescribed blocks'}
          </p>
        )}

        <section className="wolf-se-exercise-overview__summary" aria-label={isEs ? 'Resumen' : 'Summary'}>
          <h3 className="wolf-se-exercise-overview__summary-title">{isEs ? 'Resumen' : 'Summary'}</h3>
          <dl className="wolf-se-exercise-overview__summary-grid">
            <div>
              <dt>{isEs ? 'Series' : 'Sets'}</dt>
              <dd>{totalSets}</dd>
            </div>
            <div>
              <dt>Reps</dt>
              <dd>{totalReps}</dd>
            </div>
            <div>
              <dt>{isEs ? 'Volumen' : 'Volume'}</dt>
              <dd className="wolf-se-exercise-overview__summary-vol">
                {tonnage > 0 ? `${tonnage.toLocaleString()} kg` : '—'}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <footer className="wolf-se-exercise-overview__footer">
        <button
          type="button"
          className="wolf-se-coach-block-add"
          disabled={!canAddBlock}
          onClick={handleAddBlock}
        >
          <Plus size={18} aria-hidden />
          {isEs ? 'Agregar bloque' : 'Add block'}
        </button>
      </footer>
    </div>
  );
};
