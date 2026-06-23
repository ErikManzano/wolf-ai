import React, { useMemo } from 'react';
import { Check, ChevronRight, Dumbbell } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock } from '../../models/training';
import { blockExerciseTitle, exercisePreviewParts } from '../../utils/athleteDayMetrics';
import { flattenBlockSets } from '../../utils/athleteSetLogs';
import { cn } from '../../lib/utils';

export interface AthleteExercisePreviewCardProps {
  block: SessionExerciseBlock;
  athlete?: Athlete;
  exercises: Exercise[];
  exName: (id: string) => string;
  isEs: boolean;
  isComplete: boolean;
  isSetComplete: (schemeIndex: number, setInstance: number) => boolean;
  onOpen: () => void;
}

function ringDash(done: number, total: number): string {
  const pct = total > 0 ? done / total : 0;
  return `${Math.round(pct * 88)} 88`;
}

export const AthleteExercisePreviewCard: React.FC<AthleteExercisePreviewCardProps> = ({
  block,
  athlete,
  exercises,
  exName,
  isEs,
  isComplete,
  isSetComplete,
  onOpen,
}) => {
  const { title, isComplex } = blockExerciseTitle(block, exName);
  const { setsText, prescription } = exercisePreviewParts(block, isEs);
  const typeLabel = isComplex ? (isEs ? 'Complejo' : 'Complex') : isEs ? 'Simple' : 'Single';

  const { doneSets, totalSets } = useMemo(() => {
    const rows = flattenBlockSets(block, athlete, exercises, exName);
    const total = rows.length;
    const done = rows.filter((r) => isSetComplete(r.schemeIndex, r.setInstance)).length;
    return { doneSets: done, totalSets: total };
  }, [block, athlete, exercises, exName, isSetComplete]);

  const complete = isComplete || (totalSets > 0 && doneSets === totalSets);
  const progressLabel = isEs ? 'series hechas' : 'sets done';

  return (
    <li>
      <button
        type="button"
        className={cn('wa-exercise-card', complete && 'wa-exercise-card--done')}
        onClick={onOpen}
        aria-label={`${title}. ${setsText}${prescription ? `, ${prescription}` : ''}. ${doneSets}/${totalSets} ${progressLabel}`}
      >
        <span
          className={cn(
            'wa-exercise-card__icon',
            isComplex ? 'wa-exercise-card__icon--complex' : 'wa-exercise-card__icon--simple',
          )}
          aria-hidden
        >
          {complete ? <Check size={20} strokeWidth={2.5} /> : <Dumbbell size={20} strokeWidth={2} />}
        </span>

        <span className="wa-exercise-card__body">
          <span className="wa-exercise-card__head">
            <span className="wa-exercise-card__name">{title}</span>
            <span
              className={cn(
                'wa-exercise-card__type',
                isComplex ? 'wa-exercise-card__type--complex' : 'wa-exercise-card__type--simple',
              )}
            >
              {typeLabel}
            </span>
          </span>

          <span className="wa-exercise-card__details">
            <span className="wa-exercise-card__sets">{setsText}</span>
            {prescription ? (
              <span
                className={cn(
                  'wa-exercise-card__prescription',
                  isComplex && 'wa-exercise-card__prescription--complex',
                )}
              >
                {prescription}
              </span>
            ) : null}
          </span>
        </span>

        <span className="wa-exercise-card__progress" aria-hidden>
          <span className="wa-exercise-card__ring">
            <svg viewBox="0 0 36 36">
              <circle className="wa-exercise-card__ring-track" cx="18" cy="18" r="14" />
              <circle
                className="wa-exercise-card__ring-fill"
                cx="18"
                cy="18"
                r="14"
                strokeDasharray={ringDash(doneSets, totalSets)}
              />
            </svg>
            <span className="wa-exercise-card__ring-label">
              {doneSets}/{totalSets || 0}
            </span>
          </span>
          <span className="wa-exercise-card__progress-caption">{progressLabel}</span>
        </span>

        <ChevronRight className="wa-exercise-card__chevron" size={18} strokeWidth={2} aria-hidden />
      </button>
    </li>
  );
};
