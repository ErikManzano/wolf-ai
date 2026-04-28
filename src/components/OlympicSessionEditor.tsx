import React from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../models/training';
import { normalizeBlockType, resolveBaseOneRm } from '../services/trainingEngine';
import {
  addComplexSegment,
  addExerciseBlock,
  addSetToBlock,
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
} from '../services/sessionMutations';

/** Segundo movimiento por defecto al activar complejo (p. ej. Clean → Jerk). */
const DEFAULT_COMPLEX_SECOND_ID = 'ex-022';
/** Movimiento extra al añadir segmento (p. ej. sentadilla). */
const DEFAULT_EXTRA_SEGMENT_ID = 'ex-028';

interface OlympicSessionEditorProps {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  onChange: (s: Session) => void;
}

const OlympicSessionEditor: React.FC<OlympicSessionEditorProps> = ({
  session,
  athlete,
  exercises,
  isEs,
  onChange,
}) => {
  const catOrder = ['snatch', 'clean_jerk', 'squat', 'accessory'] as const;
  const grouped = catOrder.map((c) => ({
    cat: c,
    items: exercises.filter((e) => e.category === c),
  }));

  const exerciseSelect = (
    value: string,
    onPick: (id: string) => void,
  ) => (
    <select value={value} onChange={(e) => onPick(e.target.value)}>
      {grouped.map(({ cat, items }) => (
        <optgroup key={cat} label={cat}>
          {items.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  const apply = (fn: () => Session) => {
    onChange(fn());
  };

  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  const kgSimple = (block: SessionExerciseBlock, pct: number): number => {
    const ex = exercises.find((e) => e.id === block.exerciseId);
    if (!ex) return 0;
    return Math.round((pct / 100) * resolveBaseOneRm(ex, athlete) * 10) / 10;
  };

  const kgComplexParts = (block: SessionExerciseBlock, pct: number): { key: string; kg: number; short: string }[] => {
    if (!block.segments?.length) return [];
    return block.segments.map((seg, i) => {
      const ex = exercises.find((e) => e.id === seg.exerciseId);
      if (!ex) return { key: `s-${i}`, kg: 0, short: '?' };
      const kg = Math.round((pct / 100) * resolveBaseOneRm(ex, athlete) * 10) / 10;
      const short = ex.name.length > 8 ? `${ex.name.slice(0, 7)}…` : ex.name;
      return { key: seg.exerciseId + String(i), kg, short };
    });
  };

  const blockTonnage = (block: SessionExerciseBlock): number => {
    let total = 0;
    const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
    if (isComplex && block.segments?.length) {
      for (const row of block.sets) {
        const rounds = row.sets;
        for (let si = 0; si < block.segments.length; si++) {
          const seg = block.segments[si];
          if (!seg) continue;
          const ex = exercises.find((e) => e.id === seg.exerciseId);
          if (!ex) continue;
          const kg = (row.percentage / 100) * resolveBaseOneRm(ex, athlete);
          const repsToken = row.segmentReps?.[si] ?? '0';
          const reps = String(repsToken)
            .split('+')
            .reduce((acc, p) => acc + (parseInt(p.trim(), 10) || 0), 0);
          total += kg * reps * rounds;
        }
      }
      return Math.round(total);
    }

    const ex = exercises.find((e) => e.id === block.exerciseId);
    if (!ex) return 0;
    const oneRm = resolveBaseOneRm(ex, athlete);
    for (const row of block.sets) {
      const kg = (row.percentage / 100) * oneRm;
      total += kg * row.reps * row.sets;
    }
    return Math.round(total);
  };

  return (
    <div className="wolf-session-editor">
      {session.exercises.map((block, bi) => {
        const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
        const segments = block.segments ?? [];

        const isWarmup = block.countsTowardTechnicalNBL === false;

        return (
          <div key={`${block.exerciseId}-${bi}`} className={`wolf-se-block ${isWarmup ? 'wolf-se-block--warmup' : ''}`}>
            <div className="wolf-se-block-head">
              <label className="wolf-se-ex-picker">
                <span>{isEs ? 'Ejercicio principal' : 'Primary exercise'}</span>
                {exerciseSelect(block.exerciseId, (id) =>
                  apply(() => setBlockExercise(session, bi, id, athlete, exercises)),
                )}
              </label>
              <div className="wolf-se-block-actions">
                <button
                  type="button"
                  className="wolf-se-mode"
                  title={
                    isComplex
                      ? isEs
                        ? 'Pasar a bloque simple'
                        : 'Switch to simple block'
                      : isEs
                        ? 'Bloque complejo (varios movimientos + reps cada uno)'
                        : 'Complex block (multiple lifts + reps each)'
                  }
                  onClick={() =>
                    apply(() => toggleBlockComplex(session, bi, athlete, exercises, DEFAULT_COMPLEX_SECOND_ID))
                  }
                >
                  {isComplex ? (isEs ? 'Simple' : 'Simple') : isEs ? 'Complejo' : 'Complex'}
                </button>
                <button
                  type="button"
                  className="wolf-se-icon"
                  title={isEs ? 'Subir bloque' : 'Move up'}
                  disabled={bi === 0}
                  onClick={() => apply(() => moveExerciseBlock(session, bi, bi - 1, athlete, exercises))}
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  type="button"
                  className="wolf-se-icon"
                  title={isEs ? 'Bajar bloque' : 'Move down'}
                  disabled={bi === session.exercises.length - 1}
                  onClick={() => apply(() => moveExerciseBlock(session, bi, bi + 1, athlete, exercises))}
                >
                  <ChevronDown size={18} />
                </button>
                <button
                  type="button"
                  className="wolf-se-icon wolf-se-danger"
                  title={isEs ? 'Quitar bloque' : 'Remove block'}
                  onClick={() => apply(() => removeExerciseBlock(session, bi, athlete, exercises))}
                  disabled={session.exercises.length <= 1}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <label className="wolf-se-warmup">
              <input
                type="checkbox"
                checked={isWarmup}
                onChange={(e) =>
                  apply(() =>
                    setBlockCountsTowardTechnicalNBL(session, bi, !e.target.checked, athlete, exercises),
                  )
                }
              />
              <span>
                {isEs ? 'Calentamiento (no cuenta en NBL ni K)' : 'Warm-up (excluded from NBL & K)'}
              </span>
            </label>

            {isComplex && segments.length > 0 && (
              <div className="wolf-se-segments">
                <div className="wolf-se-segments-head">
                  <span>{isEs ? 'Movimientos del complejo' : 'Complex movements'}</span>
                  <div className="wolf-se-segments-actions">
                    <button
                      type="button"
                      className="wolf-se-mini wolf-se-mini-wide"
                      onClick={() =>
                        apply(() => addComplexSegment(session, bi, DEFAULT_EXTRA_SEGMENT_ID, athlete, exercises))
                      }
                    >
                      + {isEs ? 'movimiento' : 'movement'}
                    </button>
                    <button
                      type="button"
                      className="wolf-se-mini"
                      disabled={segments.length <= 2}
                      onClick={() =>
                        apply(() => removeComplexSegment(session, bi, segments.length - 1, athlete, exercises))
                      }
                      title={isEs ? 'Quitar último movimiento' : 'Remove last movement'}
                    >
                      −
                    </button>
                  </div>
                </div>
                <div className="wolf-se-segments-grid">
                  {segments.map((seg, segIdx) => (
                    <label key={`${seg.exerciseId}-${segIdx}`} className="wolf-se-seg-picker">
                      <span>
                        {isEs ? 'Mov.' : 'Mvt'} {segIdx + 1}
                      </span>
                      {exerciseSelect(seg.exerciseId, (id) =>
                        segIdx === 0
                          ? apply(() => setBlockExercise(session, bi, id, athlete, exercises))
                          : apply(() => setSegmentExercise(session, bi, segIdx, id, athlete, exercises)),
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="wolf-se-table-wrap">
              <table className="wolf-se-table">
                <thead>
                  <tr>
                    <th>%1RM</th>
                    <th>{isEs ? '≈ kg' : '≈ kg'}</th>
                    {isComplex && segments.length > 0 ? (
                      segments.map((seg, si) => {
                        const name = exercises.find((e) => e.id === seg.exerciseId)?.name ?? seg.exerciseId;
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
                    <tr key={si}>
                      <td>
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
                      <td className="wolf-se-kg-cell">
                        {isComplex && segments.length > 0 ? (
                          <ul className="wolf-se-kg-list">
                            {kgComplexParts(block, row.percentage).map((p) => (
                              <li key={p.key} title={p.short}>
                                <span className="wolf-se-kg-short">{p.short}</span>{' '}
                                <strong>{p.kg}</strong> kg
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="wolf-se-kg-one">
                            <strong>{kgSimple(block, row.percentage)}</strong> kg
                          </span>
                        )}
                      </td>
                      {isComplex && segments.length > 0 ? (
                        segments.map((_, segIdx) => (
                          <td key={segIdx}>
                            <input
                              type="text"
                              className="wolf-se-input wolf-se-rep-token"
                              value={row.segmentReps?.[segIdx] ?? '1'}
                              placeholder="2+1"
                              title={
                                isEs
                                  ? 'Reps o suma (ej. 2, 1+2)'
                                  : 'Reps or sum (e.g. 2, 1+2)'
                              }
                              onChange={(e) =>
                                apply(() =>
                                  updateSegmentRepAt(session, bi, si, segIdx, e.target.value, athlete, exercises),
                                )
                              }
                            />
                          </td>
                        ))
                      ) : (
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                                    clamp(Number(e.target.value), WL_SESSION_LIMITS.MIN_REPS_PER_SET, WL_SESSION_LIMITS.MAX_REPS_PER_SET),
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
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                                  clamp(Number(e.target.value), WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME, WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME),
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
                      <td>
                        <button
                          type="button"
                          className="wolf-se-mini"
                          disabled={block.sets.length <= 1}
                          onClick={() => apply(() => removeSetFromBlock(session, bi, si, athlete, exercises))}
                        >
                          −
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                className="wolf-se-add-row btn-outline"
                disabled={block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
                onClick={() => apply(() => addSetToBlock(session, bi, athlete, exercises))}
              >
                <Plus size={14} /> {isEs ? 'Serie' : 'Set'}
              </button>
              {block.sets.length >= WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK && (
                <p className="wolf-se-kg-short" style={{ marginTop: '6px' }}>
                  {isEs ? 'Límite de series por bloque alcanzado.' : 'Max rows per block reached.'}
                </p>
              )}
              <div className="wolf-se-block-tonnage" style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                {isEs ? 'Tonelaje del ejercicio:' : 'Exercise tonnage:'}{' '}
                <strong style={{ color: 'var(--color-accent)' }}>{blockTonnage(block)} kg</strong>
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        className="btn-secondary wolf-se-add-block"
        disabled={session.exercises.length >= WL_SESSION_LIMITS.MAX_BLOCKS_PER_SESSION}
        onClick={() =>
          apply(() => addExerciseBlock(session, exercises[0]?.id ?? 'ex-001', athlete, exercises))
        }
      >
        <Plus size={16} /> {isEs ? 'Añadir ejercicio (bloque)' : 'Add exercise block'}
      </button>
      {session.exercises.length >= WL_SESSION_LIMITS.MAX_BLOCKS_PER_SESSION && (
        <p className="wolf-se-kg-short" style={{ marginTop: '6px' }}>
          {isEs ? 'Límite de ejercicios por sesión alcanzado.' : 'Max exercise blocks per session reached.'}
        </p>
      )}

      <div className="wolf-se-summary">
        <span>K {session.kValue.toFixed(1)}</span>
        <span>
          {isEs ? 'Tonelaje' : 'Load'} {session.load} kg
        </span>
        <span>
          {isEs ? 'Reps' : 'Reps'} {session.totalReps}
        </span>
        <span>%∅ {session.avgRelativeIntensity.toFixed(1)}</span>
      </div>
    </div>
  );
};

export default OlympicSessionEditor;
