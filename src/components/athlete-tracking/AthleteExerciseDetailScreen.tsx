import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Timer } from 'lucide-react';
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
  getSetTrackingKey,
  onSaveSet,
  onClearSet,
}) => {
  const { title, isComplex } = blockExerciseTitle(block, exName);
  const blockKind = getExerciseBlockKind(block);
  const kindLabel = exerciseBlockKindLabel(blockKind, isEs);
  const stats = blockSummaryStats(block, athlete, exercises);

  const activeSetIndex = useMemo(() => {
    const idx = stats.flat.findIndex((row) => {
      const log = getSetLog(row.schemeIndex, row.setInstance);
      return !isSetAddressed(row, log);
    });
    return idx >= 0 ? idx : stats.flat.length - 1;
  }, [stats.flat, getSetLog]);

  const activeRow = stats.flat[activeSetIndex];
  const activeRestSec = activeRow
    ? block.sets[activeRow.schemeIndex]?.restSec ?? stats.restSec
    : stats.restSec;
  const restLabel = formatRestLabel(activeRestSec);
  const isComplexReps = blockUsesComplexReps(block);

  const blockGroups = useMemo(() => {
    const order: number[] = [];
    const map = new Map<
      number,
      { purpose: SetPurpose; rxLabel: string; rows: { row: (typeof stats.flat)[number]; idx: number }[] }
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
          <button type="button" className="wa-exercise-detail__icon-btn" onClick={onClose} aria-label={isEs ? 'Volver' : 'Back'}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="wa-exercise-detail__title">{title}</h1>
        </header>

        <div className="wa-exercise-detail__scroll">
          <div className="wa-exercise-detail__meta">
            <span className={`wa-exercise-detail__kind wa-exercise-detail__kind--${blockKind}`}>
              {kindLabel}
            </span>
          </div>

          <ExerciseDetailMock exerciseName={title} isComplex={isComplex} isEs={isEs} />

          <section className="wa-exercise-detail__sets" aria-labelledby="wa-exercise-sets-title">
            <div className="wa-exercise-detail__sets-head">
              <h2 id="wa-exercise-sets-title" className="wa-exercise-detail__sets-title">
                {isEs ? 'Series' : 'Sets'}
              </h2>
              <div className="wa-exercise-detail__rest">
                <span className="wa-exercise-detail__rest-label">
                  {isEs ? 'Descanso recomendado' : 'Recommended rest'}
                </span>
                <span className="wa-exercise-detail__rest-value">
                  <Timer size={14} aria-hidden />
                  {restLabel}
                </span>
              </div>
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
                      const log = getSetLog(row.schemeIndex, row.setInstance);
                      const addressed = isSetAddressed(row, log);
                      const fullyComplete = isSetFullyComplete(row, log);
                      const active = idx === activeSetIndex && !addressed;

                      return (
                        <li key={`${row.schemeIndex}-${row.setInstance}`}>
                          <DetailSetCard
                            row={row}
                            log={log}
                            addressed={addressed}
                            fullyComplete={fullyComplete}
                            active={active}
                            purpose={group.purpose}
                            isEs={isEs}
                            trackingKey={getSetTrackingKey?.(row.schemeIndex, row.setInstance)}
                            onSaveSet={(payload) => onSaveSet(row.schemeIndex, row.setInstance, payload)}
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
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};
