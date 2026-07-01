import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronRight, MoreVertical, Plus } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock, SetScheme } from '../../models/training';
import type { SessionApplyFn } from './types';
import {
  addSetToBlock,
  duplicateSetAt,
  removeSetFromBlock,
  updateSetSchemeField,
  WL_SESSION_LIMITS,
} from '../../services/sessionMutations';
import {
  blockTonnage,
  blockTotalReps,
  blockTotalSets,
  findCatalogExercise,
  kgForExercise,
  schemeRowTonnage,
} from './blockMetrics';
import { blockDisplayName, blockHasExercise } from './sessionSheetUtils';
import { blockUsesComplexReps, formatSetPrescriptionCoachMobile } from './schemeFormat';
import { purposeForScheme, purposeLabel, type SetPurpose } from './spreadsheetPurposeUtils';
import { CoachSetBlockEditor } from './CoachSetBlockEditor';
import { ExerciseCoachActionsSheet } from './ExerciseCoachActionsSheet';
import { ExerciseDeleteConfirmModal } from './ExerciseDeleteConfirmModal';
import { coachBlockExpandMotion, coachListItemMotion, coachListStagger } from './coachMobileMotion';
import './exercise-overview-screen.css';
import './exercise-sets-coach-screen.css';
import './exercise-coach-actions-sheet.css';
import './exercise-delete-confirm-modal.css';

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
  onDuplicateExercise?: () => void;
  onMoveBlockUp?: () => void;
  onMoveBlockDown?: () => void;
  canDuplicateExercise?: boolean;
  initialExpandedSetIndex?: number | null;
  onChangeExercise?: () => void;
}

const PURPOSE_TAG_CLASS: Record<SetPurpose, string> = {
  technique: 'wolf-se-exercise-overview__tag--technique',
  work: 'wolf-se-exercise-overview__tag--work',
  intensity: 'wolf-se-exercise-overview__tag--intensity',
};

function blockPurposeTags(block: SessionExerciseBlock): SetPurpose[] {
  const seen = new Set<SetPurpose>();
  const out: SetPurpose[] = [];
  for (const row of block.sets) {
    const purpose = purposeForScheme(row);
    if (seen.has(purpose)) continue;
    seen.add(purpose);
    out.push(purpose);
  }
  return out;
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

  return (
    <article
      className={`wolf-se-coach-block-card${expanded ? ' wolf-se-coach-block-card--expanded' : ''}`}
    >
      <button type="button" className="wolf-se-coach-block-card__tap" onClick={onToggle}>
        <span className="wolf-se-coach-block-card__label">
          {isEs ? `Bloque ${setIndex + 1}` : `Block ${setIndex + 1}`}
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
  totalBlocks,
  onApply,
  onBack,
  onRemoveBlock,
  onDuplicateExercise,
  onMoveBlockUp,
  onMoveBlockDown,
  canDuplicateExercise = true,
  initialExpandedSetIndex = null,
  onChangeExercise,
}) => {
  const apply = onApply;
  const reduceMotion = useReducedMotion();
  const blockRefs = useRef<Map<number, HTMLElement>>(new Map());
  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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
  const title = blockDisplayName(block, exercises, isEs);
  const tonnage = blockTonnage(block, athlete, exercises);
  const totalSets = blockTotalSets(block);
  const totalReps = blockTotalReps(block);
  const catalogEx = findCatalogExercise(exercises, block.exerciseId);
  const canAddBlock = block.sets.length < WL_SESSION_LIMITS.MAX_ROWS_PER_BLOCK;
  const purposeTags = useMemo(() => blockPurposeTags(block), [block.sets]);

  const handleAddBlock = () => {
    apply((current) => addSetToBlock(current, bi, athlete, exercises));
    setExpandedSetIndex(block.sets.length);
  };

  const toggleSet = (si: number) => {
    setExpandedSetIndex((prev) => (prev === si ? null : si));
  };

  const requestDelete = () => {
    setActionsOpen(false);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    setDeleteOpen(false);
    onRemoveBlock?.();
  };

  const runEditExercise = () => {
    if (!onChangeExercise) return;
    setActionsOpen(false);
    onChangeExercise();
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
          <button
            type="button"
            className="wolf-se-exercise-overview__menu-btn"
            title={isEs ? 'Acciones del ejercicio' : 'Exercise actions'}
            aria-label={isEs ? 'Acciones del ejercicio' : 'Exercise actions'}
            onClick={() => setActionsOpen(true)}
          >
            <MoreVertical size={20} aria-hidden />
          </button>
        </div>
      </header>

      {purposeTags.length > 0 ? (
        <div className="wolf-se-exercise-overview__tags">
          {purposeTags.map((purpose) => (
            <span
              key={purpose}
              className={`wolf-se-exercise-overview__tag ${PURPOSE_TAG_CLASS[purpose]}`}
            >
              <span className="wolf-se-exercise-overview__tag-dot" aria-hidden />
              {purposeLabel(purpose, isEs)}
            </span>
          ))}
        </div>
      ) : null}

      <div className="wolf-se-exercise-overview__body">
        {!hasExercise && onChangeExercise ? (
          <button type="button" className="wolf-se-exercise-overview__pick-exercise" onClick={onChangeExercise}>
            {isEs ? 'Elegir ejercicio' : 'Choose exercise'}
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
                catalogEx && scheme ? kgForExercise(athlete, catalogEx, scheme.percentage) : '—';
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

      <ExerciseCoachActionsSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        isEs={isEs}
        canDelete={totalBlocks > 1 && Boolean(onRemoveBlock)}
        canDuplicate={canDuplicateExercise}
        canMoveUp={bi > 0}
        canMoveDown={bi < totalBlocks - 1}
        onEditExercise={onChangeExercise ? runEditExercise : undefined}
        onDuplicateExercise={onDuplicateExercise}
        onMoveUp={onMoveBlockUp}
        onMoveDown={onMoveBlockDown}
        onDeleteExercise={onRemoveBlock ? requestDelete : undefined}
      />

      <ExerciseDeleteConfirmModal
        open={deleteOpen}
        exerciseName={title}
        isEs={isEs}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
