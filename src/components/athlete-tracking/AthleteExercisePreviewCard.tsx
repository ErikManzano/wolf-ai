import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Dumbbell, GitMerge } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock, SetCompletionLog } from '../../models/training';
import { getExerciseBlockKind, exerciseBlockKindLabel } from '../../services/sessionMutations';
import { blockTonnage } from '../session-editor/blockMetrics';
import { blockHasExercise } from '../session-editor/sessionSheetUtils';
import { blockExerciseTitle } from '../../utils/athleteDayMetrics';
import { buildSchemeCardSummaries } from '../../utils/schemeCardRx';
import { countBlockSetsDone, findSetLog, flattenBlockSets } from '../../utils/athleteSetLogs';
import { isSetAddressed } from '../../utils/setCompletionStatus';
import './athlete-exercise-preview-card.css';

export interface AthleteExercisePreviewCardProps {
  block: SessionExerciseBlock;
  exerciseIndex: number;
  assignmentId: string;
  weekNumber: number;
  dayNumber: number;
  setLogs: SetCompletionLog[];
  athlete?: Athlete;
  exercises: Exercise[];
  exName: (id: string) => string;
  isEs: boolean;
  isComplete: boolean;
  onOpen: () => void;
}

export const AthleteExercisePreviewCard: React.FC<AthleteExercisePreviewCardProps> = ({
  block,
  exerciseIndex,
  assignmentId,
  weekNumber,
  dayNumber,
  setLogs,
  athlete,
  exercises,
  exName,
  isEs,
  isComplete,
  onOpen,
}) => {
  const blockKind = getExerciseBlockKind(block);
  const kindLabel = exerciseBlockKindLabel(blockKind, isEs);
  const isComplex = blockKind === 'complex';
  const hasExercise = blockHasExercise(block);
  const { title: name } = blockExerciseTitle(block, exName);
  const tonnage = athlete ? blockTonnage(block, athlete, exercises) : 0;
  const volumeLabel = tonnage > 0 ? `${tonnage.toLocaleString()} kg` : '—';

  const { doneSets, totalSets, schemeSummaries, setDots } = useMemo(() => {
    const rows = flattenBlockSets(block, athlete, exercises, exName);
    const counts = countBlockSetsDone(
      block,
      setLogs,
      assignmentId,
      weekNumber,
      dayNumber,
      exerciseIndex,
      athlete,
      exercises,
      exName,
    );
    const dots = rows.map((row) => {
      const log = findSetLog(
        setLogs,
        assignmentId,
        weekNumber,
        dayNumber,
        exerciseIndex,
        row.schemeIndex,
        row.setInstance,
      );
      return {
        key: `${row.schemeIndex}-${row.setInstance}`,
        addressed: isSetAddressed(row, log),
      };
    });
    return {
      doneSets: counts.done,
      totalSets: counts.total,
      schemeSummaries: buildSchemeCardSummaries(block, athlete, exercises),
      setDots: dots,
    };
  }, [
    block,
    setLogs,
    assignmentId,
    weekNumber,
    dayNumber,
    exerciseIndex,
    athlete,
    exercises,
    exName,
  ]);

  const activeDotIndex = setDots.findIndex((dot) => !dot.addressed);
  const complete = isComplete || (totalSets > 0 && doneSets === totalSets);
  const setsLabel = isEs ? 'Series' : 'Sets';
  const volumeTitle = isEs ? 'Volumen' : 'Volume';

  return (
    <motion.li
      className="wa-athlete-ex-card-item"
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      <article
        className={`wa-athlete-ex-card wa-athlete-ex-card--${blockKind}${complete ? ' wa-athlete-ex-card--complete' : ''}`}
      >
        <button
          type="button"
          className="wa-athlete-ex-card__shell"
          onClick={onOpen}
          aria-label={`${name}. ${kindLabel}. ${doneSets}/${totalSets} ${setsLabel}`}
        >
          <div className="wa-athlete-ex-card__lead">
            <span className="wa-athlete-ex-card__index" aria-hidden>
              {exerciseIndex + 1}
            </span>
            <span
              className={`wa-athlete-ex-card__icon${isComplex ? ' wa-athlete-ex-card__icon--complex' : ''}${blockKind === 'warmup' ? ' wa-athlete-ex-card__icon--warmup' : ''}${complete ? ' wa-athlete-ex-card__icon--done' : ''}`}
              aria-hidden
            >
              {complete ? (
                <Check size={20} strokeWidth={2.5} />
              ) : isComplex ? (
                <GitMerge size={20} strokeWidth={2} />
              ) : (
                <Dumbbell size={20} strokeWidth={2} />
              )}
            </span>
          </div>

          <div className="wa-athlete-ex-card__main">
            <div className="wa-athlete-ex-card__title-row">
              <h3
                className={`wa-athlete-ex-card__name${hasExercise ? '' : ' wa-athlete-ex-card__name--missing'}`}
              >
                {name}
              </h3>
              <span className={`wa-athlete-ex-card__kind wa-athlete-ex-card__kind--${blockKind}`}>
                {kindLabel}
              </span>
            </div>
            {schemeSummaries.length > 0 ? (
              <div className="wa-athlete-ex-card__rx-block" aria-label={isEs ? 'Prescripción' : 'Prescription'}>
                {schemeSummaries.map((scheme) => (
                  <p
                    key={scheme.key}
                    className={`wa-athlete-ex-card__rx wa-athlete-ex-card__rx--${scheme.purpose}`}
                  >
                    <span
                      className={`wa-athlete-ex-card__rx-dot wa-athlete-ex-card__rx-dot--${scheme.purpose}`}
                      aria-hidden
                    />
                    {scheme.kgLabel ? (
                      <span className="wa-athlete-ex-card__rx-kg">{scheme.kgLabel}</span>
                    ) : null}
                    {scheme.percentage > 0 ? (
                      <span className="wa-athlete-ex-card__rx-meta">{scheme.percentage}%</span>
                    ) : null}
                    <span className="wa-athlete-ex-card__rx-meta">{scheme.volumeLabel}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="wa-athlete-ex-card__rx wa-athlete-ex-card__rx--empty">—</p>
            )}
          </div>

          <div className="wa-athlete-ex-card__metrics">
            <div className="wa-athlete-ex-card__metric">
              <span className="wa-athlete-ex-card__metric-label">{setsLabel}</span>
              <div className="wa-athlete-ex-card__metric-row">
                <span className="wa-athlete-ex-card__sets-count">
                  <strong>{doneSets}</strong>
                  <span>/{totalSets || 0}</span>
                </span>
                <div className="wa-athlete-ex-card__set-dots" aria-hidden>
                  {setDots.map((dot, dotIndex) => (
                    <span
                      key={dot.key}
                      className={`wa-athlete-ex-card__set-dot${dot.addressed ? ' wa-athlete-ex-card__set-dot--done' : ''}${dotIndex === activeDotIndex && !complete ? ' wa-athlete-ex-card__set-dot--active' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="wa-athlete-ex-card__metric">
              <span className="wa-athlete-ex-card__metric-label">{volumeTitle}</span>
              <strong
                className={`wa-athlete-ex-card__volume${tonnage > 0 ? ' wa-athlete-ex-card__volume--on' : ''}`}
              >
                {volumeLabel}
              </strong>
            </div>
          </div>

          <ChevronRight size={18} aria-hidden className="wa-athlete-ex-card__chev" />
        </button>
      </article>
    </motion.li>
  );
};
