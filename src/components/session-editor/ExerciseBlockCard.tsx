import React, { useMemo, useState } from 'react';
import {
  ChevronRight,
  Dumbbell,
  Flame,
  Gauge,
  Plus,
  Settings2,
  Trash2,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { normalizeBlockType } from '../../services/trainingEngine';
import {
  addComplexSegment,
  addSetToBlock,
  applyBlockPercentagePreset,
  duplicateSetAt,
  removeComplexSegment,
  removeExerciseBlock,
  removeSetFromBlock,
  reorderComplexSegments,
  reorderSetsInBlock,
  setBlockCountsTowardTechnicalNBL,
  setBlockExercise,
  setSegmentExercise,
  toggleBlockComplex,
  updateSegmentRepAt,
  updateSetSchemeField,
  WL_SESSION_LIMITS,
} from '../../services/sessionMutations';
import { SetsTable } from './SetsTable';
import { ComplexSequence } from './ComplexSequence';
import { blockTonnage, exerciseName } from './blockMetrics';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
import { ExercisePickerSheet } from '../mobile-wl/sheets/ExercisePickerSheet';
import { formatBlockPrescription } from './schemeFormat';
import type { SessionCatalogProps } from './types';
import './session-editor.css';
import './exercise-block-card.css';
import '../../styles/interactive.css';

const PCT_PRESETS = [70, 75, 80, 85, 90] as const;

function BlockZoneHeader({
  icon: Icon,
  leadingIndex,
  title,
  tone,
  className,
}: {
  icon?: LucideIcon;
  leadingIndex?: number;
  title: string;
  tone: 'movement' | 'config' | 'sets';
  className?: string;
}) {
  return (
    <div className={`wolf-se-zone-header wolf-se-zone-header--${tone}${className ? ` ${className}` : ''}`}>
      <span
        className={`wolf-se-zone-header-icon${leadingIndex != null ? ' wolf-se-zone-header-icon--index' : ''}`}
        aria-hidden
      >
        {leadingIndex != null ? (
          <span className="wolf-se-zone-header-index">{leadingIndex}</span>
        ) : Icon ? (
          <Icon size={14} strokeWidth={2.25} />
        ) : null}
      </span>
      <span className="wolf-se-zone-header-title">{title}</span>
    </div>
  );
}

export function BlockKindBadges({
  blockKind,
  isComplex,
  isWarmup,
  isEs,
}: {
  blockKind: 'warmup' | 'complex' | 'single';
  isComplex: boolean;
  isWarmup: boolean;
  isEs: boolean;
}) {
  return (
    <div className="wolf-se-block-badges">
      <span className={`wolf-se-badge wolf-se-badge--${blockKind}`}>
        {isComplex ? (isEs ? 'Complejo' : 'Complex') : isEs ? 'Simple' : 'Single'}
      </span>
      {isWarmup ? (
        <span className="wolf-se-badge wolf-se-badge--warmup">{isEs ? 'Calent.' : 'Warm-up'}</span>
      ) : null}
    </div>
  );
}

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
  catalog: SessionCatalogProps;
  defaultComplexSecondId: string;
  defaultExtraSegmentId: string;
  layout?: 'default' | 'embedded';
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
  catalog,
  defaultComplexSecondId,
  defaultExtraSegmentId,
  layout = 'default',
}) => {
  const apply = onApply;
  const isEmbedded = layout === 'embedded';
  const filteredPicker = catalog.pickerOptions;
  const filteredPickerSingles = catalog.pickerSingles;

  const recentExerciseIds = useMemo(() => {
    const fromCatalog = catalog.recentIds ?? [];
    const ids: string[] = [...fromCatalog];
    for (const b of session.exercises) {
      ids.push(b.exerciseId);
      for (const s of b.segments ?? []) ids.push(s.exerciseId);
    }
    return [...new Set(ids)];
  }, [session.exercises, catalog.recentIds]);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const showMovementZone = !isMobile || isEmbedded;
  const showMobileMovementInConfig = isMobile && !isEmbedded;
  const [pickerOpen, setPickerOpen] = useState(false);

  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const segments = block.segments ?? [];
  const atMaxComplexSegments = segments.length >= WL_SESSION_LIMITS.MAX_COMPLEX_SEGMENTS;
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

  const integratedMovementHeader = isEmbedded && expanded && showMovementZone;
  const movementHeaderTitle = isEmbedded
    ? isEs
      ? '¿Qué movimiento?'
      : 'Which movement?'
    : isComplex
      ? isEs
        ? 'Movimiento · cadena del complejo'
        : 'Movement · complex chain'
      : isEs
        ? 'Movimiento'
        : 'Movement';

  const handleRemoveBlock = () => apply(() => removeExerciseBlock(session, bi, athlete, exercises));

  return (
    <article
      ref={blockRef}
      className={`wolf-se-block wolf-se-block-card wolf-se-block--${blockKind}${isEmbedded ? ' wolf-se-block-card--embedded' : ''}${integratedMovementHeader ? ' wolf-se-block-card--movement-integrated' : ''}${expanded ? '' : ' wolf-se-block--collapsed'}`}
      data-block-index={bi + 1}
    >
      {!integratedMovementHeader ? (
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
            className={`wolf-se-block-chevron${expanded ? ' is-open' : ''}${isEmbedded ? ' wolf-se-block-chevron--hidden' : ''}`}
            aria-hidden
          />
          <span className="wolf-se-block-num" aria-hidden>
            {bi + 1}
          </span>
          <div className={`wolf-se-block-summary${isEmbedded ? ' wolf-se-block-summary--embedded' : ''}`}>
            <BlockKindBadges
              blockKind={blockKind}
              isComplex={isComplex}
              isWarmup={isWarmup}
              isEs={isEs}
            />
            {isEmbedded ? (
              <h3 className="wolf-se-block-name wolf-se-block-name--sr">{title}</h3>
            ) : (
              <h3 className="wolf-se-block-name">{title}</h3>
            )}
            {!isEmbedded ? (
              <>
            <div className="wolf-se-block-stats-row">
              <span className="wolf-se-block-stat wolf-se-block-stat--load">
                <span className="wolf-se-block-stat-label">{isEs ? 'Carga' : 'Load'}</span>
                <span className="wolf-se-block-stat-value">
                  <strong>{tonnage}</strong>
                  <small>kg</small>
                </span>
              </span>
              <span className="wolf-se-block-stat wolf-se-block-stat--volume">
                <span className="wolf-se-block-stat-label">{isEs ? 'Volumen' : 'Volume'}</span>
                <span className="wolf-se-block-stat-value">
                  <strong>{workSets}</strong>
                  <small>{isEs ? 'series' : 'sets'}</small>
                </span>
              </span>
              {avgPct > 0 && (
                <span className="wolf-se-block-stat wolf-se-block-stat--intensity">
                  <span className="wolf-se-block-stat-label">{isEs ? 'Intensidad' : 'Intensity'}</span>
                  <span className="wolf-se-block-stat-value">
                    <strong>{avgPct}</strong>
                    <small>% ∅</small>
                  </span>
                </span>
              )}
            </div>
            <code className="wolf-se-block-rx" title={prescription}>
              <span className="wolf-se-block-rx-label">{isEs ? 'Rx' : 'Rx'}</span>
              {prescription}
            </code>
              </>
            ) : null}
          </div>
        </div>

        <div
          className="wolf-se-block-toolbar"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="wolf-se-toolbar-btn wolf-se-toolbar-btn--danger"
            title={isEs ? 'Quitar bloque' : 'Remove block'}
            disabled={totalBlocks <= 1}
            onClick={handleRemoveBlock}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>
      ) : (
        <h3 className="wolf-se-block-name wolf-se-block-name--sr">{title}</h3>
      )}

      {expanded && (
        <div className="wolf-se-block-body">
          {showMovementZone && isComplex && segments.length > 0 ? (
            <div className="wolf-se-block-zone wolf-se-block-zone--movement">
              {integratedMovementHeader ? (
                <div className="wolf-se-movement-zone-top">
                  <BlockZoneHeader
                    leadingIndex={bi + 1}
                    title={movementHeaderTitle}
                    tone="movement"
                    className="wolf-se-zone-header--inline"
                  />
                </div>
              ) : (
                <BlockZoneHeader
                  icon={Dumbbell}
                  title={movementHeaderTitle}
                  tone="movement"
                />
              )}
              <div className="wolf-se-block-movement-band">
              <section
                className="wolf-se-config-section wolf-se-config-section--movement"
                aria-label={isEs ? 'Movimientos del complejo' : 'Complex movements'}
              >
                <div className="wolf-se-config-section-head">
                  <h4 className="wolf-se-config-title">
                    {isEs ? 'Cadena del complejo' : 'Complex chain'}
                    <span className="wolf-se-chain-count">
                      {segments.length}/{WL_SESSION_LIMITS.MAX_COMPLEX_SEGMENTS}
                    </span>
                  </h4>
                  <div className="wolf-se-chain-tools">
                    <button
                      type="button"
                      className="wolf-se-btn wolf-se-btn--ghost wolf-se-btn--sm"
                      disabled={atMaxComplexSegments}
                      title={
                        atMaxComplexSegments
                          ? isEs
                            ? 'Máximo 4 movimientos por complejo'
                            : 'Maximum 4 movements per complex'
                          : undefined
                      }
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
                          options={filteredPickerSingles}
                          value={seg.exerciseId}
                          compact
                          isEs={isEs}
                          recentIds={recentExerciseIds}
                          panelMatchCard={segIdx === 0}
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
              </div>
            </div>
          ) : null}

          {showMovementZone && !isComplex ? (
            <div className="wolf-se-block-zone wolf-se-block-zone--movement">
              {integratedMovementHeader ? (
                <div className="wolf-se-movement-zone-top">
                  <BlockZoneHeader
                    leadingIndex={bi + 1}
                    title={movementHeaderTitle}
                    tone="movement"
                    className="wolf-se-zone-header--inline"
                  />
                </div>
              ) : (
                <BlockZoneHeader
                  icon={Dumbbell}
                  title={movementHeaderTitle}
                  tone="movement"
                />
              )}
              <div className="wolf-se-block-movement-band">
              <section className="wolf-se-config-section wolf-se-config-section--movement">
                <ExerciseAutocomplete
                  options={filteredPicker}
                  value={block.exerciseId}
                  isEs={isEs}
                  recentIds={recentExerciseIds}
                  panelMatchCard
                  prominent={isEmbedded}
                  autoFocus={isEmbedded}
                  onChange={(id) => apply(() => setBlockExercise(session, bi, id, athlete, exercises))}
                />
              </section>
              </div>
            </div>
          ) : null}

          <div className="wolf-se-block-zone wolf-se-block-zone--config">
            <BlockZoneHeader
              icon={Settings2}
              title={isEs ? 'Configuración del bloque' : 'Block configuration'}
              tone="config"
            />
            <div className="wolf-se-block-toolbar-band">
            <div className="wolf-se-block-panel wolf-se-block-panel--mode">
              <span className="wolf-se-panel-label">
                <Flame size={13} aria-hidden />
                {isEs ? 'Modo' : 'Mode'}
              </span>
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
            </div>

            {showMobileMovementInConfig && isComplex && segments.length > 0 ? (
              <ComplexSequence
                segmentIds={segments.map((s) => s.exerciseId)}
                exercises={exercises}
                pickerOptions={filteredPickerSingles}
                isEs={isEs}
                onSegmentChange={(idx, id) =>
                  idx === 0
                    ? apply(() => setBlockExercise(session, bi, id, athlete, exercises))
                    : apply(() => setSegmentExercise(session, bi, idx, id, athlete, exercises))
                }
                onAdd={() =>
                  apply(() => addComplexSegment(session, bi, defaultExtraSegmentId, athlete, exercises))
                }
                onRemove={(idx) =>
                  apply(() => removeComplexSegment(session, bi, idx, athlete, exercises))
                }
                onReorder={(from, to) =>
                  apply(() => reorderComplexSegments(session, bi, from, to, athlete, exercises))
                }
                canRemove={segments.length > 2}
              />
            ) : null}

            {showMobileMovementInConfig && !isComplex ? (
              <>
                <section className="wolf-se-config-section wolf-se-config-section--movement wolf-se-config-section--inline">
                  <h4 className="wolf-se-config-title">{isEs ? 'Movimiento' : 'Movement'}</h4>
                  <button
                    type="button"
                    className="wolf-se-btn wolf-se-btn--outline wolf-se-movement-pick-btn"
                    onClick={() => setPickerOpen(true)}
                  >
                    {exerciseName(exercises, block.exerciseId)}
                  </button>
                </section>
                <ExercisePickerSheet
                  open={pickerOpen}
                  onClose={() => setPickerOpen(false)}
                  options={filteredPicker}
                  value={block.exerciseId}
                    isEs={isEs}
                    recentIds={recentExerciseIds}
                    onChange={(id) => apply(() => setBlockExercise(session, bi, id, athlete, exercises))}
                />
              </>
            ) : null}

            <div className="wolf-se-block-panel wolf-se-block-panel--intensity">
              <span className="wolf-se-panel-label">
                <Zap size={13} aria-hidden />
                {isEs ? 'Intensidad rápida' : 'Quick intensity'}
              </span>
            <div className="wolf-se-intensity-section">
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
            </div>
          </div>

          <div className="wolf-se-block-zone wolf-se-block-zone--sets">
          <div className="wolf-se-block-layout__sets">
              <SetsTable
                block={block}
                athlete={athlete}
                exercises={exercises}
                isEs={isEs}
                layout={layout}
                onPctChange={(si, v) =>
                  apply(() => updateSetSchemeField(session, bi, si, 'percentage', v, athlete, exercises))
                }
                onRepsChange={(si, v) =>
                  apply(() => updateSetSchemeField(session, bi, si, 'reps', v, athlete, exercises))
                }
                onSetsChange={(si, v) =>
                  apply(() => updateSetSchemeField(session, bi, si, 'sets', v, athlete, exercises))
                }
                onRirChange={(si, v) =>
                  apply(() => updateSetSchemeField(session, bi, si, 'targetRir', v, athlete, exercises))
                }
                onRestChange={(si, v) =>
                  apply(() => updateSetSchemeField(session, bi, si, 'restSec', v, athlete, exercises))
                }
                onSegmentRepChange={(si, segIdx, val) =>
                  apply(() => updateSegmentRepAt(session, bi, si, segIdx, val, athlete, exercises))
                }
                onAddSet={() => apply(() => addSetToBlock(session, bi, athlete, exercises))}
                onDuplicateSet={(si) => apply(() => duplicateSetAt(session, bi, si, athlete, exercises))}
                onRemoveSet={(si) => apply(() => removeSetFromBlock(session, bi, si, athlete, exercises))}
                onReorderSets={(from, to) =>
                  apply(() => reorderSetsInBlock(session, bi, from, to, athlete, exercises))
                }
              />
          </div>
          </div>

          {!isEmbedded ? (
            <footer className="wolf-se-block-footer">
              <span className="wolf-se-block-footer-label">
                <Gauge size={15} aria-hidden />
                {isEs ? 'Tonelaje del bloque' : 'Block tonnage'}
              </span>
              <strong>{tonnage} kg</strong>
            </footer>
          ) : null}
        </div>
      )}
    </article>
  );
};
