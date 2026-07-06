import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Timer } from 'lucide-react';
import type { Athlete, Exercise, RepOutcome, SessionExerciseBlock, SetCompletionLog } from '../../models/training';
import { getExerciseBlockKind, exerciseBlockKindLabel } from '../../services/sessionMutations';
import { blockUsesComplexReps, formatSetPrescriptionCoachMobile } from '../session-editor/schemeFormat';
import { purposeForScheme, purposeLabel, type SetPurpose } from '../session-editor/spreadsheetPurposeUtils';
import {
  blockExerciseTitle,
  blockSummaryStats,
  formatRestLabel,
} from '../../utils/athleteDayMetrics';
import { ExerciseDetailMock } from './ExerciseDetailMock';
import { DetailSetCard } from './DetailSetCard';
import { isSetAddressed, isSetFullyComplete } from '../../utils/setCompletionStatus';

export interface AthleteExerciseDetailScreenProps {
  open: boolean;
  block: SessionExerciseBlock;
  athlete?: Athlete;
  exercises: Exercise[];
  exName: (id: string) => string;
  isEs: boolean;
  getSetLog: (schemeIndex: number, setInstance: number) => SetCompletionLog | undefined;
  onClose: () => void;
  onGoToNextExercise?: () => void;
  getSetTrackingKey?: (schemeIndex: number, setInstance: number) => string;
  onSaveSet: (
    schemeIndex: number,
    setInstance: number,
    payload: {
      actualKg: number;
      actualReps: number;
      actualSegmentReps?: number[];
      actualRepOutcomes?: RepOutcome[];
      actualSegmentRepOutcomes?: RepOutcome[][];
    },
  ) => void;
  onClearSet: (schemeIndex: number, setInstance: number) => void;
}

export const AthleteExerciseDetailScreen: React.FC<AthleteExerciseDetailScreenProps> = ({
  open,
  block,
  athlete,
  exercises,
  exName,
  isEs,
  getSetLog,
  onClose,
  onGoToNextExercise,
  getSetTrackingKey,
  onSaveSet,
  onClearSet,
}) => {
  const { title, isComplex } = blockExerciseTitle(block, exName);
  const blockKind = getExerciseBlockKind(block);
  const kindLabel = exerciseBlockKindLabel(blockKind, isEs);
  const stats = blockSummaryStats(block, athlete, exercises);
  const setRefs = useRef<Map<number, HTMLElement>>(new Map());
  const prevActiveSetRef = useRef<number | null>(null);

  const setStates = useMemo(
    () =>
      stats.flat.map((row) => {
        const log = getSetLog(row.schemeIndex, row.setInstance);
        return {
          row,
          log,
          addressed: isSetAddressed(row, log),
          fullyComplete: isSetFullyComplete(row, log),
        };
      }),
    [stats.flat, getSetLog],
  );

  const addressedCount = setStates.filter((state) => state.addressed).length;
  const totalSets = setStates.length;
  const exerciseComplete = totalSets > 0 && addressedCount === totalSets;
  const progressPct = totalSets > 0 ? Math.round((addressedCount / totalSets) * 100) : 0;

  const activeSetIndex = useMemo(() => {
    const idx = setStates.findIndex((state) => !state.addressed);
    return idx >= 0 ? idx : -1;
  }, [setStates]);

  const activeRow = activeSetIndex >= 0 ? setStates[activeSetIndex]?.row : undefined;
  const activeRestSec = activeRow
    ? block.sets[activeRow.schemeIndex]?.restSec ?? stats.restSec
    : stats.restSec;
  const restLabel = formatRestLabel(activeRestSec);
  const isComplexReps = blockUsesComplexReps(block);

  useEffect(() => {
    if (!open || exerciseComplete || activeSetIndex < 0) return;
    if (prevActiveSetRef.current === activeSetIndex) return;
    prevActiveSetRef.current = activeSetIndex;
    const el = setRefs.current.get(activeSetIndex);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [open, activeSetIndex, exerciseComplete]);

  useEffect(() => {
    if (!open) {
      prevActiveSetRef.current = null;
    }
  }, [open]);

  const blockGroups = useMemo(() => {
    const order: number[] = [];
    const map = new Map<
      number,
      {
        purpose: SetPurpose;
        rxLabel: string;
        rows: { row: (typeof stats.flat)[number]; idx: number }[];
      }
    >();

    stats.flat.forEach((row, idx) => {
      if (!map.has(row.schemeIndex)) {
        const scheme = block.sets[row.schemeIndex];
        if (!scheme) return;
        order.push(row.schemeIndex);
        map.set(row.schemeIndex, {
          purpose: purposeForScheme(scheme),
          rxLabel: formatSetPrescriptionCoachMobile(scheme, isComplexReps),
          rows: [],
        });
      }
      map.get(row.schemeIndex)?.rows.push({ row, idx });
    });

    return order.map((schemeIndex) => ({
      schemeIndex,
      ...map.get(schemeIndex)!,
    }));
  }, [stats.flat, block.sets, isComplexReps]);

  const notifySetAddressed = (setInstance: number, fullyComplete: boolean) => {
    /* Rep-level toasts in DetailSetCard already give feedback; skip per-set toast to avoid double alerts. */
    void setInstance;
    void fullyComplete;
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="wa-exercise-detail"
          className="wa-exercise-detail"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.div
            className="wa-exercise-detail__shell"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="wa-exercise-detail__head">
              <button
                type="button"
                className="wa-exercise-detail__icon-btn"
                onClick={onClose}
                aria-label={isEs ? 'Volver' : 'Back'}
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="wa-exercise-detail__title">{title}</h1>
            </header>

            <div className="wa-exercise-detail__progress" aria-hidden>
              <span
                className="wa-exercise-detail__progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="wa-exercise-detail__scroll">
              <div className="wa-exercise-detail__meta">
                <span className={`wa-exercise-detail__kind wa-exercise-detail__kind--${blockKind}`}>
                  {kindLabel}
                </span>
                <span className="wa-exercise-detail__progress-label">
                  {addressedCount}/{totalSets} {isEs ? 'series' : 'sets'}
                </span>
              </div>

              <ExerciseDetailMock exerciseName={title} isComplex={isComplex} isEs={isEs} />

              <AnimatePresence>
                {exerciseComplete ? (
                  <motion.section
                    key="wa-exercise-complete"
                    className="wa-exercise-detail__complete"
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                    aria-live="polite"
                  >
                    <CheckCircle2 size={28} aria-hidden />
                    <div className="wa-exercise-detail__complete-copy">
                      <strong>{isEs ? 'Ejercicio completado' : 'Exercise complete'}</strong>
                      <span>
                        {isEs
                          ? `${totalSets} series registradas. Buen trabajo.`
                          : `${totalSets} sets logged. Great work.`}
                      </span>
                    </div>
                  </motion.section>
                ) : null}
              </AnimatePresence>

              <section className="wa-exercise-detail__sets" aria-labelledby="wa-exercise-sets-title">
                <div className="wa-exercise-detail__sets-head">
                  <h2 id="wa-exercise-sets-title" className="wa-exercise-detail__sets-title">
                    {isEs ? 'Series' : 'Sets'}
                  </h2>
                  {!exerciseComplete ? (
                    <div className="wa-exercise-detail__rest">
                      <span className="wa-exercise-detail__rest-label">
                        {isEs ? 'Descanso recomendado' : 'Recommended rest'}
                      </span>
                      <span className="wa-exercise-detail__rest-value">
                        <Timer size={14} aria-hidden />
                        {restLabel}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="wa-exercise-detail__sets-groups">
                  {blockGroups.map((group) => (
                    <section
                      key={group.schemeIndex}
                      className={`wa-exercise-detail__block wa-exercise-detail__block--${group.purpose}`}
                      aria-labelledby={`wa-block-${group.schemeIndex}-title`}
                    >
                      <header className="wa-exercise-detail__block-head">
                        <span
                          id={`wa-block-${group.schemeIndex}-title`}
                          className={`wa-exercise-detail__block-purpose wa-exercise-detail__block-purpose--${group.purpose}`}
                        >
                          <span className="wa-exercise-detail__block-purpose-dot" aria-hidden />
                          {purposeLabel(group.purpose, isEs)}
                        </span>
                        <code className="wa-exercise-detail__block-rx">{group.rxLabel}</code>
                      </header>

                      <ul className="wa-exercise-detail__sets-list">
                        {group.rows.map(({ row, idx }) => {
                          const state = setStates[idx]!;
                          const active = idx === activeSetIndex;

                          return (
                            <li
                              key={`${row.schemeIndex}-${row.setInstance}`}
                              ref={(el) => {
                                if (el) setRefs.current.set(idx, el);
                                else setRefs.current.delete(idx);
                              }}
                            >
                              <DetailSetCard
                                row={row}
                                log={state.log}
                                addressed={state.addressed}
                                fullyComplete={state.fullyComplete}
                                active={active}
                                purpose={group.purpose}
                                isEs={isEs}
                                trackingKey={getSetTrackingKey?.(row.schemeIndex, row.setInstance)}
                                onSetAddressed={(fullyComplete) =>
                                  notifySetAddressed(row.setInstance, fullyComplete)
                                }
                                onSaveSet={(payload) =>
                                  onSaveSet(row.schemeIndex, row.setInstance, payload)
                                }
                                onClearSet={() => onClearSet(row.schemeIndex, row.setInstance)}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              </section>
            </div>

            {exerciseComplete ? (
              <footer className="wa-exercise-detail__footer">
                {onGoToNextExercise ? (
                  <button
                    type="button"
                    className="wa-exercise-detail__cta wa-exercise-detail__cta--primary"
                    onClick={onGoToNextExercise}
                  >
                    {isEs ? 'Siguiente ejercicio' : 'Next exercise'}
                    <ArrowRight size={18} aria-hidden />
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`wa-exercise-detail__cta${onGoToNextExercise ? '' : ' wa-exercise-detail__cta--primary'}`}
                  onClick={onClose}
                >
                  {isEs ? 'Volver al día' : 'Back to day'}
                </button>
              </footer>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};
