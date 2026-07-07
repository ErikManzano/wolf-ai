import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock, SetScheme } from '../../models/training';
import type { SessionApplyFn } from './types';
import {
  addSetToBlock,
  duplicateSetAt,
  getExerciseBlockKind,
  removeSetFromBlock,
  updateSegmentRepAt,
  updateSetSchemeField,
  WL_SESSION_LIMITS,
  type ExerciseBlockKind,
} from '../../services/sessionMutations';
import { normalizeBlockType } from '../../services/trainingEngine';
import {
  blockTonnage,
  blockTotalReps,
  blockTotalSets,
  exerciseName,
  findCatalogExercise,
  kgForExercise,
  schemeRowTonnage,
} from './blockMetrics';
import { blockDisplayName, blockHasExercise } from './sessionSheetUtils';
import { blockUsesComplexReps, formatSetPrescriptionCoachMobile } from './schemeFormat';
import { purposeForScheme, purposeLabel } from './spreadsheetPurposeUtils';
import { CoachSetBlockEditor } from './CoachSetBlockEditor';
import { CoachBlockTypePicker } from './CoachBlockTypePicker';
import { coachBlockExpandMotion, coachListItemMotion, coachListStagger } from './coachMobileMotion';
import './exercise-overview-screen.css';
import './exercise-sets-coach-screen.css';
import './coach-block-type-picker.css';

export interface ExerciseOverviewScreenProps {
  block: SessionExerciseBlock;
  blockIndex: number;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  totalBlocks: number;
  onApply: SessionApplyFn;
  onBack: () => void;
  /** Mobile coach flow uses the app header back instead of a duplicate in-screen button. */
  hideHeaderBack?: boolean;
  onRemoveBlock?: () => void;
  onDuplicateExercise?: () => void;
  onMoveBlockUp?: () => void;
  onMoveBlockDown?: () => void;
  canDuplicateExercise?: boolean;
  initialExpandedSetIndex?: number | null;
  onChangeExercise?: () => void;
  onChangeSegmentExercise?: (segmentIndex: number) => void;
  onAddSegment?: () => void;
  onRemoveLastSegment?: () => void;
  onBlockKindChange?: (kind: ExerciseBlockKind) => void;
}

interface CoachBlockSummaryCardProps {
  setIndex: number;
  scheme: SetScheme;
  block: SessionExerciseBlock;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

function CoachBlockSummaryCard({
  setIndex,
  scheme,
  block,
  athlete,
  exercises,
  isEs,
  expanded,
  onToggle,
  children,
}: CoachBlockSummaryCardProps) {
  const reduceMotion = useReducedMotion();
  const isComplex = blockUsesComplexReps(block);
  const prescription = formatSetPrescriptionCoachMobile(scheme, isComplex);
  const rowKg = schemeRowTonnage(scheme, block, athlete, exercises);
  const volumeLabel = rowKg > 0 ? `${rowKg.toLocaleString()} kg` : '—';
  const purpose = purposeForScheme(scheme);

  return (
    <article
      className={`wolf-se-coach-block-card${expanded ? ' wolf-se-coach-block-card--expanded' : ''}`}
    >
      <button type="button" className="wolf-se-coach-block-card__tap" onClick={onToggle}>
        <span className="wolf-se-coach-block-card__head">
          <span className="wolf-se-coach-block-card__label">
            {isEs ? `Bloque ${setIndex + 1}` : `Block ${setIndex + 1}`}
          </span>
          <span className={`wolf-se-coach-block-card__purpose wolf-se-coach-block-card__purpose--${purpose}`}>
            <span className="wolf-se-coach-block-card__purpose-dot" aria-hidden />
            {purposeLabel(purpose, isEs)}
          </span>
        </span>
        <span className="wolf-se-coach-block-card__row">
          <code className="wolf-se-coach-block-card__rx">{prescription}</code>
          <span
            className={`wolf-se-coach-block-card__vol${rowKg > 0 ? ' wolf-se-coach-block-card__vol--on' : ''}`}
          >
            {volumeLabel}
          </span>
          <ChevronRight
            className={`wolf-se-coach-block-card__chev${expanded ? ' is-open' : ''}`}
            size={18}
            aria-hidden
          />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && children ? (
          <motion.div
            key="editor"
            className="wolf-se-coach-block-card__editor"
            {...coachBlockExpandMotion(reduceMotion)}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
}

export const ExerciseOverviewScreen: React.FC<ExerciseOverviewScreenProps> = ({
  block,
  blockIndex: bi,
  athlete,
  exercises,
  isEs,
  onApply,
  onBack,
  hideHeaderBack = false,
  initialExpandedSetIndex = null,
  onChangeExercise,
  onChangeSegmentExercise,
  onAddSegment,
  onRemoveLastSegment,
  onBlockKindChange,
}) => {
  const apply = onApply;
  const reduceMotion = useReducedMotion();
  const blockRefs = useRef<Map<number, HTMLElement>>(new Map());
  const [expandedSetIndex, setExpandedSetIndex] = useState<number | null>(initialExpandedSetIndex);

  useEffect(() => {
    setExpandedSetIndex(initialExpandedSetIndex);
  }, [bi, initialExpandedSetIndex]);

  useEffect(() => {
    if (expandedSetIndex == null || expandedSetIndex < 0) return;
    const el = blockRefs.current.get(expandedSetIndex);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [expandedSetIndex, block.sets.length]);

  const hasExercise = blockHasExercise(block);
  const blockKind = getExerciseBlockKind(block);
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const segments = block.segments ?? [];
  const atMaxSegments = segments.length >= WL_SESSION_LIMITS.MAX_COMPLEX_SEGMENTS;
  const title = blockDisplayName(block, exercises, isEs);
  const tonnage = blockTonnage(block, athlete, exercises);
  const totalSets = blockTotalSets(block);
  const totalReps = blockTotalReps(block);
  const catalogEx = findCatalogExercise(exercises, block.exerciseId);
  const canAddBlock = block.sets.length < WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK;

  const handleAddBlock = () => {
    apply((current) => addSetToBlock(current, bi, athlete, exercises));
    setExpandedSetIndex(block.sets.length);
  };

  const toggleSet = (si: number) => {
    setExpandedSetIndex((prev) => (prev === si ? null : si));
  };

  return (
    <div className="wolf-se-exercise-overview">
      {hideHeaderBack ? null : (
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
        </header>
      )}

      <div className="wolf-se-exercise-overview__body">
        {onBlockKindChange ? (
          <CoachBlockTypePicker
            kind={blockKind}
            isEs={isEs}
            variant="panel"
            className="wolf-se-exercise-overview__type-picker"
            onChange={onBlockKindChange}
          />
        ) : null}

        {!hasExercise && onChangeExercise ? (
          <button type="button" className="wolf-se-exercise-overview__pick-exercise" onClick={onChangeExercise}>
            {isEs ? 'Elegir ejercicio' : 'Choose exercise'}
          </button>
        ) : null}

        {isComplex && segments.length > 0 ? (
          <section
            className="wolf-se-exercise-overview__chain"
            aria-label={isEs ? 'Cadena del complejo' : 'Complex chain'}
          >
            <div className="wolf-se-exercise-overview__chain-head">
              <h3 className="wolf-se-exercise-overview__chain-title">
                {isEs ? 'Cadena del complejo' : 'Complex chain'}
              </h3>
              <span className="wolf-se-exercise-overview__chain-count">
                {segments.length}/{WL_SESSION_LIMITS.MAX_COMPLEX_SEGMENTS}
              </span>
            </div>
            <div className="wolf-se-exercise-overview__chain-nodes">
              {segments.map((seg, segIdx) => (
                <React.Fragment key={`${seg.exerciseId}-${segIdx}`}>
                  {segIdx > 0 ? (
                    <span className="wolf-se-exercise-overview__chain-arrow" aria-hidden>
                      →
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="wolf-se-exercise-overview__chain-node"
                    disabled={!onChangeSegmentExercise}
                    onClick={() => onChangeSegmentExercise?.(segIdx)}
                  >
                    <span className="wolf-se-exercise-overview__chain-idx">{segIdx + 1}</span>
                    <span className="wolf-se-exercise-overview__chain-name">
                      {exerciseName(exercises, seg.exerciseId)}
                    </span>
                    {onChangeSegmentExercise ? (
                      <ChevronRight className="wolf-se-exercise-overview__chain-chev" size={16} aria-hidden />
                    ) : null}
                  </button>
                </React.Fragment>
              ))}
            </div>
            {onAddSegment ? (
              <button
                type="button"
                className="wolf-se-exercise-overview__chain-add"
                disabled={atMaxSegments}
                onClick={onAddSegment}
              >
                <Plus size={18} aria-hidden />
                {atMaxSegments
                  ? isEs
                    ? 'Máximo 4 movimientos'
                    : 'Maximum 4 movements'
                  : isEs
                    ? 'Añadir movimiento al complejo'
                    : 'Add movement to complex'}
              </button>
            ) : null}
            {onRemoveLastSegment && segments.length > 2 ? (
              <button
                type="button"
                className="wolf-se-exercise-overview__chain-remove"
                onClick={onRemoveLastSegment}
              >
                {isEs ? 'Quitar último movimiento' : 'Remove last movement'}
              </button>
            ) : null}
          </section>
        ) : hasExercise && onChangeExercise ? (
          <button
            type="button"
            className="wolf-se-exercise-overview__movement-pick"
            onClick={onChangeExercise}
          >
            {isEs ? 'Cambiar movimiento' : 'Change movement'}
          </button>
        ) : null}

        {block.sets.length > 0 ? (
          <motion.div
            className="wolf-se-exercise-overview__blocks-stack"
            variants={coachListStagger}
            initial="hidden"
            animate="visible"
          >
            {block.sets.map((scheme, si) => {
              const kg =
                !isComplex && catalogEx && scheme
                  ? kgForExercise(athlete, catalogEx, scheme.percentage)
                  : '—';
              const expanded = expandedSetIndex === si;
              return (
                <motion.div
                  key={si}
                  variants={coachListItemMotion(reduceMotion)}
                  ref={(el) => {
                    if (el) blockRefs.current.set(si, el);
                    else blockRefs.current.delete(si);
                  }}
                >
                  <CoachBlockSummaryCard
                    setIndex={si}
                    scheme={scheme}
                    block={block}
                    athlete={athlete}
                    exercises={exercises}
                    isEs={isEs}
                    expanded={expanded}
                    onToggle={() => toggleSet(si)}
                  >
                    <CoachSetBlockEditor
                      scheme={scheme}
                      setIndex={si}
                      kg={kg}
                      isEs={isEs}
                      variant="panel"
                      compactPanel
                      isComplex={isComplex}
                      block={block}
                      athlete={athlete}
                      exercises={exercises}
                      canDuplicate={block.sets.length < WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK}
                      canRemove={block.sets.length > 1}
                      onDuplicate={() =>
                        apply((current) => duplicateSetAt(current, bi, si, athlete, exercises))
                      }
                      onRemove={() =>
                        apply((current) => removeSetFromBlock(current, bi, si, athlete, exercises))
                      }
                      onPctChange={(v) =>
                        apply((current) =>
                          updateSetSchemeField(current, bi, si, 'percentage', v, athlete, exercises),
                        )
                      }
                      onRepsChange={(v) =>
                        apply((current) =>
                          updateSetSchemeField(current, bi, si, 'reps', v, athlete, exercises),
                        )
                      }
                      onSetsChange={(v) =>
                        apply((current) =>
                          updateSetSchemeField(current, bi, si, 'sets', v, athlete, exercises),
                        )
                      }
                      onRestChange={(v) =>
                        apply((current) =>
                          updateSetSchemeField(current, bi, si, 'restSec', v, athlete, exercises),
                        )
                      }
                      onSegmentRepChange={(segIdx, val) =>
                        apply((current) =>
                          updateSegmentRepAt(current, bi, si, segIdx, val, athlete, exercises),
                        )
                      }
                    />
                  </CoachBlockSummaryCard>
                </motion.div>
              );
            })}
          </motion.div>
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
