import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Dumbbell, GitMerge } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock } from '../../models/training';
import { getExerciseBlockKind, exerciseBlockKindLabel } from '../../services/sessionMutations';
import { blockTonnage } from '../session-editor/blockMetrics';
import { blockUsesComplexReps, formatSchemeRepsToken } from '../session-editor/schemeFormat';
import { blockHasExercise } from '../session-editor/sessionSheetUtils';
import { blockExerciseTitle } from '../../utils/athleteDayMetrics';
import { flattenBlockSets } from '../../utils/athleteSetLogs';
import './athlete-exercise-preview-card.css';

export interface AthleteExercisePreviewCardProps {
  block: SessionExerciseBlock;
  index: number;
  athlete?: Athlete;
  exercises: Exercise[];
  exName: (id: string) => string;
  isEs: boolean;
  isComplete: boolean;
  isSetComplete: (schemeIndex: number, setInstance: number) => boolean;
  isSetAddressed: (schemeIndex: number, setInstance: number) => boolean;
  onOpen: () => void;
}

function formatAthleteCardRx(block: SessionExerciseBlock, isComplexReps: boolean): string {
  if (!block.sets.length) return '—';

  if (block.sets.length === 1) {
    const row = block.sets[0]!;
    const reps = formatSchemeRepsToken(row, isComplexReps);
    return row.percentage > 0 ? `${row.percentage}% · ${row.sets}x${reps}` : `${row.sets}x${reps}`;
  }

  return block.sets
    .map((row) => {
      const reps = formatSchemeRepsToken(row, isComplexReps);
      return row.percentage > 0 ? `${row.percentage}% · ${row.sets}x${reps}` : `${row.sets}x${reps}`;
    })
    .join(' · ');
}

export const AthleteExercisePreviewCard: React.FC<AthleteExercisePreviewCardProps> = ({
  block,
  index,
  athlete,
  exercises,
  exName,
  isEs,
  isComplete,
  isSetAddressed,
  onOpen,
}) => {
  const blockKind = getExerciseBlockKind(block);
  const kindLabel = exerciseBlockKindLabel(blockKind, isEs);
  const isComplex = blockKind === 'complex';
  const hasExercise = blockHasExercise(block);
  const { title: name } = blockExerciseTitle(block, exName);
  const tonnage = athlete ? blockTonnage(block, athlete, exercises) : 0;
  const volumeLabel = tonnage > 0 ? `${tonnage.toLocaleString()} kg` : '—';
  const isComplexReps = blockUsesComplexReps(block);
  const rxLabel = formatAthleteCardRx(block, isComplexReps);

  const { doneSets, totalSets } = useMemo(() => {
    const rows = flattenBlockSets(block, athlete, exercises, exName);
    const total = rows.length;
    const done = rows.filter((r) => isSetAddressed(r.schemeIndex, r.setInstance)).length;
    return { doneSets: done, totalSets: total };
  }, [block, athlete, exercises, exName, isSetAddressed]);

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
              {index + 1}
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
              <p className="wa-athlete-ex-card__rx">{rxLabel}</p>
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
                    {Array.from({ length: totalSets || 0 }, (_, dotIndex) => (
                      <span
                        key={dotIndex}
                        className={`wa-athlete-ex-card__set-dot${dotIndex < doneSets ? ' wa-athlete-ex-card__set-dot--done' : ''}${dotIndex === doneSets && !complete ? ' wa-athlete-ex-card__set-dot--active' : ''}`}
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
