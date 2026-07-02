import React, { useMemo } from 'react';
import { Check, ChevronRight, Dumbbell, GitMerge } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock } from '../../models/training';
import { getExerciseBlockKind, exerciseBlockKindLabel } from '../../services/sessionMutations';
import { blockTonnage } from '../session-editor/blockMetrics';
import { blockUsesComplexReps, formatSetPrescriptionCoachMobile } from '../session-editor/schemeFormat';
import { blockHasExercise } from '../session-editor/sessionSheetUtils';
import { blockExerciseTitle } from '../../utils/athleteDayMetrics';
import { flattenBlockSets } from '../../utils/athleteSetLogs';
import '../session-editor/session-coach-day-cards.css';

export interface AthleteExercisePreviewCardProps {
  block: SessionExerciseBlock;
  index: number;
  athlete?: Athlete;
  exercises: Exercise[];
  exName: (id: string) => string;
  isEs: boolean;
  isComplete: boolean;
  isSetComplete: (schemeIndex: number, setInstance: number) => boolean;
  onOpen: () => void;
}

const ACCENT_KEYS = ['orange', 'blue', 'amber', 'violet'] as const;

export const AthleteExercisePreviewCard: React.FC<AthleteExercisePreviewCardProps> = ({
  block,
  index,
  athlete,
  exercises,
  exName,
  isEs,
  isComplete,
  isSetComplete,
  onOpen,
}) => {
  const blockKind = getExerciseBlockKind(block);
  const kindLabel = exerciseBlockKindLabel(blockKind, isEs);
  const isComplex = blockKind === 'complex';
  const hasExercise = blockHasExercise(block);
  const { title: name } = blockExerciseTitle(block, exName);
  const tonnage = blockTonnage(block, athlete, exercises);
  const accent = ACCENT_KEYS[index % ACCENT_KEYS.length]!;
  const volumeLabel = tonnage > 0 ? `${tonnage.toLocaleString()} kg` : '—';
  const isComplexReps = blockUsesComplexReps(block);

  const { doneSets, totalSets } = useMemo(() => {
    const rows = flattenBlockSets(block, athlete, exercises, exName);
    const total = rows.length;
    const done = rows.filter((r) => isSetComplete(r.schemeIndex, r.setInstance)).length;
    return { doneSets: done, totalSets: total };
  }, [block, athlete, exercises, exName, isSetComplete]);

  const complete = isComplete || (totalSets > 0 && doneSets === totalSets);
  const progressLabel = isEs ? 'series hechas' : 'sets done';

  return (
    <li className="wolf-se-coach-day-card-item">
      <article
        className={`wolf-se-coach-day-card wolf-se-coach-day-card--${accent} wolf-se-coach-day-card--mockup wolf-se-coach-day-card--athlete${complete ? ' wolf-se-coach-day-card--complete' : ''}`}
        data-accent={accent}
      >
        <button
          type="button"
          className="wolf-se-coach-day-card__shell wolf-se-coach-day-card__shell--tappable"
          onClick={onOpen}
          aria-label={`${name}. ${kindLabel}. ${doneSets}/${totalSets} ${progressLabel}`}
        >
          <div className="wolf-se-coach-day-card__header">
            <span
              className={`wolf-se-coach-day-card__icon${isComplex ? ' wolf-se-coach-day-card__icon--complex' : ''}${blockKind === 'warmup' ? ' wolf-se-coach-day-card__icon--warmup' : ''}${complete ? ' wolf-se-coach-day-card__icon--done' : ''}`}
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
            <div className="wolf-se-coach-day-card__title-wrap">
              <div className="wolf-se-coach-day-card__title-row">
                <h3
                  className={`wolf-se-coach-day-card__name${hasExercise ? '' : ' wolf-se-coach-day-card__name--missing'}`}
                >
                  {name}
                </h3>
                <span
                  className={`wolf-se-coach-day-card__kind wolf-se-coach-day-card__kind--${blockKind}`}
                >
                  <span className="wolf-se-coach-day-card__kind-dot" aria-hidden />
                  {kindLabel}
                </span>
              </div>
            </div>
          </div>

          {block.sets.length > 0 ? (
            <ul className="wolf-se-coach-day-card__sets" aria-label={isEs ? 'Bloques prescritos' : 'Prescribed blocks'}>
              {block.sets.map((scheme, si) => (
                <li key={si}>
                  <code className="wolf-se-coach-day-card__set-row">
                    {formatSetPrescriptionCoachMobile(scheme, isComplexReps)}
                  </code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="wolf-se-coach-day-card__empty-sets">
              {isEs ? 'Sin bloques prescritos' : 'No prescribed blocks'}
            </p>
          )}

          <span className="wolf-se-coach-day-card__footer wolf-se-coach-day-card__footer--athlete">
            <span className="wolf-se-coach-day-card__progress">
              <strong>{doneSets}</strong>/{totalSets || 0} {progressLabel}
            </span>
            <span className="wolf-se-coach-day-card__footer-vol">
              {isEs ? 'Volumen' : 'Volume'}{' '}
              <strong className={tonnage > 0 ? 'wolf-se-coach-day-card__vol--on' : ''}>{volumeLabel}</strong>
              <ChevronRight className="wolf-se-coach-day-card__chev" size={18} strokeWidth={2} aria-hidden />
            </span>
          </span>
        </button>
      </article>
    </li>
  );
};
