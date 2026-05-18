import React from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import { normalizeBlockType, resolveBaseOneRm } from '../../services/trainingEngine';
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
  WL_SESSION_LIMITS,
} from '../../services/sessionMutations';
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
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const segments = block.segments ?? [];
  const isWarmup = block.countsTowardTechnicalNBL === false;
  const blockKind = isWarmup ? 'warmup' : isComplex ? 'complex' : 'single';
  const title = blockTitle(block, isComplex, segments, exercises);
  const tonnage = blockTonnage(block, athlete, exercises);
  const workSets = block.sets.reduce((a, r) => a + r.sets, 0);
  const prescription = formatBlockPrescription(block);
  const setLabel = (si: number) => (isEs ? `Serie ${si + 1}` : `Set ${si + 1}`);

  const kgSimple = (pct: number): number => {
    const ex = exercises.find((e) => e.id === block.exerciseId);
    if (!ex) return 0;
    return Math.round((pct / 100) * resolveBaseOneRm(ex, athlete) * 10) / 10;
  };

  const kgComplexParts = (pct: number): { key: string; kg: number; short: string }[] => {
    if (!segments.length) return [];
    return segments.map((seg, i) => {
      const ex = exercises.find((e) => e.id === seg.exerciseId);
      if (!ex) return { key: `s-${i}`, kg: 0, short: '?' };
      const kg = Math.round((pct / 100) * resolveBaseOneRm(ex, athlete) * 10) / 10;
      const short = ex.name.length > 8 ? `${ex.name.slice(0, 7)}…` : ex.name;
      return { key: seg.exerciseId + String(i), kg, short };
    });
  };

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
              <div className="wolf-se-sets-panel-head">
                <h4 className="wolf-se-config-title">{isEs ? 'Series' : 'Sets'}</h4>
                <span className="wolf-se-sets-meta">
                  {block.sets.length} {isEs ? 'líneas' : 'rows'} · {workSets} {isEs ? 'series totales' : 'total sets'}
                </span>
              </div>

              <div className="wolf-se-table-shell">
                <table className="wolf-se-table">
                  <thead>
                    <tr>
                      <th>%1RM</th>
                      <th>{isEs ? '≈ kg' : '≈ kg'}</th>
                      {isComplex && segments.length > 0 ? (
                        segments.map((seg, si) => {
                          const name = exerciseName(exercises, seg.exerciseId);
                          const short = name.length > 14 ? `${name.slice(0, 12)}…` : name;
                          return (
                            <th key={`${seg.exerciseId}-${si}`} title={name}>
                              Reps · {short}
                            </th>
                          );
                        })
                      ) : (
                        <th>{isEs ? 'Reps' : 'Reps'}</th>
                      )}
                      <th>{isEs ? 'Series' : 'Sets'}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {block.sets.map((row, si) => (
                      <tr key={si} className="wolf-se-set-row" data-set-label={setLabel(si)}>
                        <td data-label="%1RM">
                          <input
                            type="number"
                            className="wolf-se-input"
                            value={row.percentage}
                            min={40}
                            max={100}
                            step={1}
                            onChange={(e) =>
                              apply(() =>
                                updateSetSchemeField(
                                  session,
                                  bi,
                                  si,
                                  'percentage',
                                  Number(e.target.value),
                                  athlete,
                                  exercises,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="wolf-se-kg-cell" data-label={isEs ? 'Kg' : 'Kg'}>
                          {isComplex && segments.length > 0 ? (
                            <ul className="wolf-se-kg-list">
                              {kgComplexParts(row.percentage).map((p) => (
                                <li key={p.key} title={p.short}>
                                  <span className="wolf-se-kg-short">{p.short}</span>{' '}
                                  <strong>{p.kg}</strong> kg
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="wolf-se-kg-one">
                              <strong>{kgSimple(row.percentage)}</strong> kg
                            </span>
                          )}
                        </td>
                        {isComplex && segments.length > 0 ? (
                          segments.map((seg, segIdx) => {
                            const segName = exerciseName(exercises, seg.exerciseId);
                            const short = segName.length > 12 ? `${segName.slice(0, 10)}…` : segName;
                            return (
                              <td key={segIdx} data-label={`Reps · ${short}`}>
                                <input
                                  type="text"
                                  className="wolf-se-input wolf-se-rep-token"
                                  value={row.segmentReps?.[segIdx] ?? '1'}
                                  placeholder="2+1"
                                  title={
                                    isEs ? 'Reps o suma (ej. 2, 1+2)' : 'Reps or sum (e.g. 2, 1+2)'
                                  }
                                  onChange={(e) =>
                                    apply(() =>
                                      updateSegmentRepAt(
                                        session,
                                        bi,
                                        si,
                                        segIdx,
                                        e.target.value,
                                        athlete,
                                        exercises,
                                      ),
                                    )
                                  }
                                />
                              </td>
                            );
                          })
                        ) : (
                          <td data-label={isEs ? 'Reps' : 'Reps'}>
                            <div className="wolf-se-stepper">
                              <button
                                type="button"
                                className="wolf-se-mini"
                                disabled={row.reps <= WL_SESSION_LIMITS.MIN_REPS_PER_SET}
                                onClick={() =>
                                  apply(() =>
                                    updateSetSchemeField(
                                      session,
                                      bi,
                                      si,
                                      'reps',
                                      row.reps - 1,
                                      athlete,
                                      exercises,
                                    ),
                                  )
                                }
                              >
                                −
                              </button>
                              <input
                                type="number"
                                className="wolf-se-input"
                                value={row.reps}
                                min={WL_SESSION_LIMITS.MIN_REPS_PER_SET}
                                max={WL_SESSION_LIMITS.MAX_REPS_PER_SET}
                                onChange={(e) =>
                                  apply(() =>
                                    updateSetSchemeField(
                                      session,
                                      bi,
                                      si,
                                      'reps',
                                      clamp(
                                        Number(e.target.value),
                                        WL_SESSION_LIMITS.MIN_REPS_PER_SET,
                                        WL_SESSION_LIMITS.MAX_REPS_PER_SET,
                                      ),
                                      athlete,
                                      exercises,
                                    ),
                                  )
                                }
                              />
                              <button
                                type="button"
                                className="wolf-se-mini"
                                disabled={row.reps >= WL_SESSION_LIMITS.MAX_REPS_PER_SET}
                                onClick={() =>
                                  apply(() =>
                                    updateSetSchemeField(
                                      session,
                                      bi,
                                      si,
                                      'reps',
                                      row.reps + 1,
                                      athlete,
                                      exercises,
                                    ),
                                  )
                                }
                              >
                                +
                              </button>
                            </div>
                          </td>
                        )}
                        <td data-label={isEs ? 'Series' : 'Sets'}>
                          <div className="wolf-se-stepper">
                            <button
                              type="button"
                              className="wolf-se-mini"
                              disabled={row.sets <= WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
                              onClick={() =>
                                apply(() =>
                                  updateSetSchemeField(
                                    session,
                                    bi,
                                    si,
                                    'sets',
                                    row.sets - 1,
                                    athlete,
                                    exercises,
                                  ),
                                )
                              }
                            >
                              −
                            </button>
                            <input
                              type="number"
                              className="wolf-se-input"
                              value={row.sets}
                              min={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
                              max={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
                              onChange={(e) =>
                                apply(() =>
                                  updateSetSchemeField(
                                    session,
                                    bi,
                                    si,
                                    'sets',
                                    clamp(
                                      Number(e.target.value),
                                      WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME,
                                      WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME,
                                    ),
                                    athlete,
                                    exercises,
                                  ),
                                )
                              }
                            />
                            <button
                              type="button"
                              className="wolf-se-mini"
                              disabled={row.sets >= WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
                              onClick={() =>
                                apply(() =>
                                  updateSetSchemeField(
                                    session,
                                    bi,
                                    si,
                                    'sets',
                                    row.sets + 1,
                                    athlete,
                                    exercises,
                                  ),
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="wolf-se-cell-actions" data-label="">
                          <div className="wolf-se-row-actions">
                            <button
                              type="button"
                              className="wolf-se-mini"
                              title={isEs ? 'Duplicar fila' : 'Duplicate row'}
                              disabled={block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
                              onClick={() => apply(() => duplicateSetAt(session, bi, si, athlete, exercises))}
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              type="button"
                              className="wolf-se-mini wolf-se-danger"
                              disabled={block.sets.length <= 1}
                              onClick={() => apply(() => removeSetFromBlock(session, bi, si, athlete, exercises))}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="wolf-se-add-row wolf-se-btn wolf-se-btn--outline wolf-se-btn--sm"
                disabled={block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
                onClick={() => apply(() => addSetToBlock(session, bi, athlete, exercises))}
              >
                <Plus size={14} /> {isEs ? 'Añadir serie' : 'Add set row'}
              </button>
              {block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK && (
                <p className="wolf-se-limit-hint">
                  {isEs ? 'Límite de filas por bloque.' : 'Max rows per block.'}
                </p>
              )}
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
