import React from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';
import {
  addComplexSegment,
  addSetToBlock,
  applyBlockPercentagePreset,
  duplicateSetAt,
  moveExerciseBlock,
  removeComplexSegment,
  removeExerciseBlock,
  removeSetFromBlock,
  setBlockCountsTowardTechnicalNBL,
  setBlockExercise,
  setSegmentExercise,
  toggleBlockComplex,
  updateSegmentRepAt,
  updateSetSchemeField,
} from '../../services/sessionMutations';
import { SetsTable } from './SetsTable';
import { blockTonnage, exerciseName } from './blockMetrics';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
import { formatBlockPrescription } from './schemeFormat';
import './session-editor.css';
import './exercise-block-card.css';

const PCT_PRESETS = [70, 75, 80, 85, 90] as const;

export interface ExerciseBlockCardProps {
  block: SessionExerciseBlock;
  blockIndex: number;
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  expanded: boolean;
  totalBlocks: number;
  onToggle: () => void;
  onApply: (fn: () => Session) => void;
  blockRef?: (el: HTMLElement | null) => void;
  defaultComplexSecondId: string;
  defaultExtraSegmentId: string;
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

export const ExerciseBlockCard: React.FC<ExerciseBlockCardProps> = ({
  block,
  blockIndex: bi,
  session,
  athlete,
  exercises,
  isEs,
  expanded,
  totalBlocks,
  onToggle,
  onApply,
  blockRef,
  defaultComplexSecondId,
  defaultExtraSegmentId,
}) => {
  const apply = onApply;

  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const segments = block.segments ?? [];
  const isWarmup = block.countsTowardTechnicalNBL === false;
  const blockKind = isWarmup ? 'warmup' : isComplex ? 'complex' : 'single';
  const title = blockTitle(block, isComplex, segments, exercises);
  const tonnage = blockTonnage(block, athlete, exercises);
  const workSets = block.sets.reduce((a, r) => a + r.sets, 0);
  const prescription = formatBlockPrescription(block);

  const avgPct =
    block.sets.length > 0
      ? Math.round(block.sets.reduce((s, r) => s + r.percentage, 0) / block.sets.length)
      : 0;

  return (
    <article
      ref={blockRef}
      className={`wolf-se-block wolf-se-block--${blockKind}${expanded ? '' : ' wolf-se-block--collapsed'}`}
      data-block-index={bi + 1}
    >
      <header className="wolf-se-block-head">
        <div
          className="wolf-se-block-expand"
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle();
            }
          }}
        >
          <ChevronRight
            size={20}
            className={`wolf-se-block-chevron${expanded ? ' is-open' : ''}`}
            aria-hidden
          />
          <span className="wolf-se-block-num" aria-hidden>
            {bi + 1}
          </span>
          <div className="wolf-se-block-summary">
            <div className="wolf-se-block-badges">
              <span className={`wolf-se-badge wolf-se-badge--${blockKind}`}>
                {isComplex ? (isEs ? 'Complejo' : 'Complex') : isEs ? 'Simple' : 'Single'}
              </span>
              {isWarmup && (
                <span className="wolf-se-badge wolf-se-badge--warmup">{isEs ? 'Calent.' : 'Warm-up'}</span>
              )}
            </div>
            <h3 className="wolf-se-block-name">{title}</h3>
            <div className="wolf-se-block-stats-row">
              <span className="wolf-se-block-stat">
                <strong>{tonnage}</strong> kg
              </span>
              <span className="wolf-se-block-stat">
                <strong>{workSets}</strong> {isEs ? 'series' : 'sets'}
              </span>
              {avgPct > 0 && (
                <span className="wolf-se-block-stat">
                  <strong>{avgPct}</strong>% ∅
                </span>
              )}
            </div>
            <code className="wolf-se-block-rx" title={prescription}>
              {prescription}
            </code>
          </div>
        </div>

        <div
          className="wolf-se-block-toolbar"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="wolf-se-toolbar-btn"
            title={isEs ? 'Subir' : 'Move up'}
            disabled={bi === 0}
            onClick={() => apply(() => moveExerciseBlock(session, bi, bi - 1, athlete, exercises))}
          >
            <ChevronUp size={18} />
          </button>
          <button
            type="button"
            className="wolf-se-toolbar-btn"
            title={isEs ? 'Bajar' : 'Move down'}
            disabled={bi === totalBlocks - 1}
            onClick={() => apply(() => moveExerciseBlock(session, bi, bi + 1, athlete, exercises))}
          >
            <ChevronDown size={18} />
          </button>
          <button
            type="button"
            className="wolf-se-toolbar-btn wolf-se-toolbar-btn--danger"
            title={isEs ? 'Quitar bloque' : 'Remove block'}
            disabled={totalBlocks <= 1}
            onClick={() => apply(() => removeExerciseBlock(session, bi, athlete, exercises))}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {expanded && (
        <div className="wolf-se-block-body">
          <div className="wolf-se-block-layout">
            <div className="wolf-se-block-layout__config">
              <div className="wolf-se-block-options">
                <button
                  type="button"
                  className={`wolf-se-option-pill${isWarmup ? ' is-on' : ''}`}
                  onClick={() =>
                    apply(() =>
                      setBlockCountsTowardTechnicalNBL(session, bi, isWarmup, athlete, exercises),
                    )
                  }
                >
                  {isEs ? 'Calentamiento' : 'Warm-up'}
                </button>
                <button
                  type="button"
                  className={`wolf-se-option-pill wolf-se-option-pill--mode${isComplex ? ' is-on' : ''}`}
                  onClick={() =>
                    apply(() =>
                      toggleBlockComplex(session, bi, athlete, exercises, defaultComplexSecondId),
                    )
                  }
                >
                  {isComplex ? (isEs ? 'Modo simple' : 'Simple mode') : isEs ? 'Complejo' : 'Complex'}
                </button>
              </div>

              {isComplex && segments.length > 0 ? (
                <section className="wolf-se-config-section" aria-label={isEs ? 'Movimientos del complejo' : 'Complex movements'}>
                  <div className="wolf-se-config-section-head">
                    <h4 className="wolf-se-config-title">{isEs ? 'Cadena del complejo' : 'Complex chain'}</h4>
                    <div className="wolf-se-chain-tools">
                      <button
                        type="button"
                        className="wolf-se-btn wolf-se-btn--ghost wolf-se-btn--sm"
                        onClick={() =>
                          apply(() =>
                            addComplexSegment(session, bi, defaultExtraSegmentId, athlete, exercises),
                          )
                        }
                      >
                        <Plus size={14} /> {isEs ? 'Mov.' : 'Mvt'}
                      </button>
                      <button
                        type="button"
                        className="wolf-se-btn wolf-se-btn--ghost wolf-se-btn--sm"
                        disabled={segments.length <= 2}
                        onClick={() =>
                          apply(() =>
                            removeComplexSegment(session, bi, segments.length - 1, athlete, exercises),
                          )
                        }
                        title={isEs ? 'Quitar último' : 'Remove last'}
                      >
                        −
                      </button>
                    </div>
                  </div>
                  <div className="wolf-se-complex-chain">
                    {segments.map((seg, segIdx) => (
                      <React.Fragment key={`${seg.exerciseId}-${segIdx}`}>
                        {segIdx > 0 && (
                          <span className="wolf-se-chain-arrow" aria-hidden>
                            →
                          </span>
                        )}
                        <div className="wolf-se-chain-node">
                          <span className="wolf-se-chain-idx">{segIdx + 1}</span>
                          <ExerciseAutocomplete
                            exercises={exercises}
                            value={seg.exerciseId}
                            compact
                            isEs={isEs}
                            onChange={(id) =>
                              segIdx === 0
                                ? apply(() => setBlockExercise(session, bi, id, athlete, exercises))
                                : apply(() =>
                                    setSegmentExercise(session, bi, segIdx, id, athlete, exercises),
                                  )
                            }
                          />
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="wolf-se-config-section">
                  <h4 className="wolf-se-config-title">{isEs ? 'Movimiento' : 'Movement'}</h4>
                  <ExerciseAutocomplete
                    exercises={exercises}
                    value={block.exerciseId}
                    isEs={isEs}
                    onChange={(id) => apply(() => setBlockExercise(session, bi, id, athlete, exercises))}
                  />
                </section>
              )}

              <div className="wolf-se-intensity-section">
                <span className="wolf-se-config-title">{isEs ? 'Intensidad rápida' : 'Quick intensity'}</span>
                <div className="wolf-se-pct-chip-row" role="group" aria-label={isEs ? 'Presets %1RM' : '%1RM presets'}>
                  {PCT_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      className={`wolf-se-pct-chip${block.sets[0]?.percentage === pct ? ' active' : ''}`}
                      onClick={() =>
                        apply(() => applyBlockPercentagePreset(session, bi, pct, athlete, exercises))
                      }
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="wolf-se-block-layout__sets">
              <SetsTable
                block={block}
                athlete={athlete}
                exercises={exercises}
                isEs={isEs}
                onPctChange={(si, v) =>
                  apply(() => updateSetSchemeField(session, bi, si, 'percentage', v, athlete, exercises))
                }
                onRepsChange={(si, v) =>
                  apply(() => updateSetSchemeField(session, bi, si, 'reps', v, athlete, exercises))
                }
                onSetsChange={(si, v) =>
                  apply(() => updateSetSchemeField(session, bi, si, 'sets', v, athlete, exercises))
                }
                onSegmentRepChange={(si, segIdx, val) =>
                  apply(() => updateSegmentRepAt(session, bi, si, segIdx, val, athlete, exercises))
                }
                onAddSet={() => apply(() => addSetToBlock(session, bi, athlete, exercises))}
                onDuplicateSet={(si) => apply(() => duplicateSetAt(session, bi, si, athlete, exercises))}
                onRemoveSet={(si) => apply(() => removeSetFromBlock(session, bi, si, athlete, exercises))}
              />
            </div>
          </div>

                    <footer className="wolf-se-block-footer">
            <span>{isEs ? 'Tonelaje del bloque' : 'Block tonnage'}</span>
            <strong>{tonnage} kg</strong>
          </footer>
        </div>
      )}
    </article>
  );
};
