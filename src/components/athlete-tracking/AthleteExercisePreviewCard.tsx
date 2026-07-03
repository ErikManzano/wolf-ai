import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Dumbbell, GitMerge } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock, SetCompletionLog } from '../../models/training';
import { getExerciseBlockKind, exerciseBlockKindLabel } from '../../services/sessionMutations';
import { blockTonnage } from '../session-editor/blockMetrics';
import { blockHasExercise } from '../session-editor/sessionSheetUtils';
import { blockExerciseTitle } from '../../utils/athleteDayMetrics';
import { countBlockSetsDone, findSetLog, flattenBlockSets, type FlatSetRow } from '../../utils/athleteSetLogs';
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

function formatAthleteCardSetLine(row: FlatSetRow): string {
  const slash = row.prescribedRepsLabel.indexOf('/');
  if (slash < 0) return row.prescribedRepsLabel;

  const pct = row.prescribedRepsLabel.slice(0, slash);
  const reps = row.prescribedRepsLabel.slice(slash + 1);
  const repsDisplay = reps.includes('+')
    ? reps
        .split('+')
        .map((token) => token.trim() || '0')
        .join(' + ')
    : reps;

  return `${pct} · ${repsDisplay}`;
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

  const { doneSets, totalSets, setLines, setDots } = useMemo(() => {
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
      setLines: rows.map((row) => formatAthleteCardSetLine(row)),
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
  const setsLabel = isEs ? 'Series hechas' : 'Sets done';
  const volumeTitle = isEs ? 'Volumen estimado' : 'Estimated volume';

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
          <div className="wa-athlete-ex-card__top">
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
            <div className="wa-athlete-ex-card__title-wrap">
              <h3
                className={`wa-athlete-ex-card__name${hasExercise ? '' : ' wa-athlete-ex-card__name--missing'}`}
              >
                {name}
              </h3>
              <span className={`wa-athlete-ex-card__kind wa-athlete-ex-card__kind--${blockKind}`}>
                {kindLabel}
              </span>
            </div>
          </div>

          <div className="wa-athlete-ex-card__body">
            <div className="wa-athlete-ex-card__left">
              {setLines.length > 0 ? (
                <ul className="wa-athlete-ex-card__rx-list" aria-label={isEs ? 'Series prescritas' : 'Prescribed sets'}>
                  {setLines.map((line, lineIndex) => (
                    <li key={setDots[lineIndex]?.key ?? lineIndex} className="wa-athlete-ex-card__rx">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="wa-athlete-ex-card__rx">—</p>
              )}
            </div>

            <div className="wa-athlete-ex-card__metrics">
              <div className="wa-athlete-ex-card__metric">
                <div className="wa-athlete-ex-card__metric-head">
                  <span className="wa-athlete-ex-card__metric-label">{setsLabel}</span>
                  <ChevronRight size={16} aria-hidden className="wa-athlete-ex-card__chev" />
                </div>
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

              <div className="wa-athlete-ex-card__metric-divider" aria-hidden />

              <div className="wa-athlete-ex-card__metric">
                <div className="wa-athlete-ex-card__metric-head">
                  <span className="wa-athlete-ex-card__metric-label">{volumeTitle}</span>
                  <ChevronRight size={16} aria-hidden className="wa-athlete-ex-card__chev" />
                </div>
                <strong
                  className={`wa-athlete-ex-card__volume${tonnage > 0 ? ' wa-athlete-ex-card__volume--on' : ''}`}
                >
                  {volumeLabel}
                </strong>
              </div>
            </div>
          </div>
        </button>
      </article>
    </motion.li>
  );
};
