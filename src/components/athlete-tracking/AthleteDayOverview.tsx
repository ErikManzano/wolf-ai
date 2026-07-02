import React, { useMemo } from 'react';
import { Clock, Crosshair, Dumbbell, Play, Timer } from 'lucide-react';
import type { Athlete, Exercise, ExerciseGoal, ProgramDay, SetCompletionLog } from '../../models/training';
import { isExerciseCompleteWithSets } from '../../utils/completionHelpers';
import {
  dayDisplayTitle,
  dayFocusBadge,
  estimateDayVolume,
  estimateSessionDuration,
  formatDurationRange,
  suggestRestRange,
} from '../../utils/athleteDayMetrics';
import { AthleteExercisePreviewCard } from './AthleteExercisePreviewCard';
import type { SessionCompletion } from '../../models/training';

export interface AthleteDayOverviewProps {
  day: ProgramDay;
  weekNumber: number;
  assignmentId: string;
  primaryGoal: ExerciseGoal;
  athlete?: Athlete;
  exercises: Exercise[];
  exName: (id: string) => string;
  isEs: boolean;
  completions: SessionCompletion[];
  setLogs: SetCompletionLog[];
  isSetComplete: (exerciseIndex: number, schemeIndex: number, setInstance: number) => boolean;
  onOpenExercise: (exerciseIndex: number) => void;
  onStartWorkout: () => void;
}

function ringDash(pct: number): string {
  return `${Math.round((pct / 100) * 163)} 163`;
}

export const AthleteDayOverview: React.FC<AthleteDayOverviewProps> = ({
  day,
  weekNumber,
  assignmentId,
  primaryGoal,
  athlete,
  exercises,
  exName,
  isEs,
  completions,
  setLogs,
  isSetComplete,
  onOpenExercise,
  onStartWorkout,
}) => {
  const exerciseCount = day.session.exercises.length;
  const focusLabel = dayFocusBadge(day, primaryGoal, isEs);

  const completedExercises = useMemo(
    () =>
      day.session.exercises.filter((block, bi) =>
        isExerciseCompleteWithSets(
          completions,
          setLogs,
          assignmentId,
          weekNumber,
          day.dayNumber,
          bi,
          block,
          athlete,
          exercises,
          exName,
        ),
      ).length,
    [day, completions, setLogs, assignmentId, weekNumber, athlete, exercises, exName],
  );

  const progressPct =
    exerciseCount > 0 ? Math.round((completedExercises / exerciseCount) * 100) : 0;

  const duration = estimateSessionDuration(day);
  const durationLabel = formatDurationRange(duration.min, duration.max, isEs);
  const restLabel = suggestRestRange(day, isEs);
  const volumeLabel = estimateDayVolume(day, athlete, exercises, isEs);

  const hasExercises = exerciseCount > 0;
  const exercisesUnit = isEs ? 'ejercicios' : 'exercises';

  return (
    <div className="wa-day-overview">
      <section className="wa-day-summary" aria-label={isEs ? 'Resumen del día' : 'Day summary'}>
        <header className="wa-day-summary__head">
          <div className="wa-day-summary__head-main">
            <h2 className="wa-day-summary__title">{dayDisplayTitle(day, isEs)}</h2>
            <span className="wa-day-summary__focus">
              {focusLabel}
              <Crosshair size={12} strokeWidth={2.25} aria-hidden />
            </span>
          </div>
          <span className="wa-day-summary__badge">
            <Crosshair size={12} strokeWidth={2.25} aria-hidden />
            {focusLabel}
          </span>
        </header>

        <div className="wa-day-summary__metrics">
          <div className="wa-day-summary__stat wa-day-summary__stat--progress">
            <div className="wa-day-summary__stat-body">
              <span className="wa-day-summary__stat-label">
                {isEs ? 'Progreso' : 'Progress'}
              </span>
              <strong className="wa-day-summary__stat-value">
                {completedExercises} / {exerciseCount} {exercisesUnit}
              </strong>
            </div>
            <div
              className="wa-day-summary__ring"
              role="img"
              aria-label={
                isEs ? `Progreso ${progressPct} por ciento` : `Progress ${progressPct} percent`
              }
            >
              <svg viewBox="0 0 56 56" aria-hidden>
                <circle className="wa-day-summary__ring-track" cx="28" cy="28" r="26" />
                <circle
                  className="wa-day-summary__ring-fill"
                  cx="28"
                  cy="28"
                  r="26"
                  strokeDasharray={ringDash(progressPct)}
                />
              </svg>
              <span className="wa-day-summary__ring-pct" aria-hidden>
                {progressPct}%
              </span>
            </div>
          </div>

          <div className="wa-day-summary__stat">
            <Clock size={14} className="wa-day-summary__stat-icon" aria-hidden />
            <span className="wa-day-summary__stat-label">
              {isEs ? 'Tiempo estimado' : 'Estimated time'}
            </span>
            <strong className="wa-day-summary__stat-value">{durationLabel}</strong>
          </div>

          <div className="wa-day-summary__stat">
            <Timer size={14} className="wa-day-summary__stat-icon wa-day-summary__stat-icon--rest" aria-hidden />
            <span className="wa-day-summary__stat-label">
              {isEs ? 'Descanso sugerido' : 'Suggested rest'}
            </span>
            <strong className="wa-day-summary__stat-value">{restLabel}</strong>
          </div>

          <div className="wa-day-summary__stat">
            <Dumbbell size={14} className="wa-day-summary__stat-icon wa-day-summary__stat-icon--volume" aria-hidden />
            <span className="wa-day-summary__stat-label">
              {isEs ? 'Volumen estimado' : 'Estimated volume'}
            </span>
            <strong className="wa-day-summary__stat-value">{volumeLabel}</strong>
          </div>
        </div>

        {hasExercises ? (
          <button type="button" className="wa-day-cta wa-day-summary__cta" onClick={onStartWorkout}>
            <Play size={18} fill="currentColor" aria-hidden />
            {isEs ? 'Iniciar entrenamiento' : 'Start workout'}
          </button>
        ) : null}
      </section>

      <section className="wa-day-exercises" aria-labelledby="wa-day-exercises-title">
        <h3 id="wa-day-exercises-title" className="wa-day-exercises__title">
          {isEs ? 'Ejercicios' : 'Exercises'}
        </h3>
        {!hasExercises ? (
          <p className="wa-day-exercises__empty">
            {isEs ? 'Sin ejercicios en este día.' : 'No exercises this day.'}
          </p>
        ) : (
          <ul className="wolf-se-coach-day__list wa-day-exercises__list">
            {day.session.exercises.map((block, bi) => (
              <AthleteExercisePreviewCard
                key={`${block.exerciseId}-${bi}`}
                block={block}
                index={bi}
                athlete={athlete}
                exercises={exercises}
                exName={exName}
                isEs={isEs}
                isComplete={isExerciseCompleteWithSets(
                  completions,
                  setLogs,
                  assignmentId,
                  weekNumber,
                  day.dayNumber,
                  bi,
                  block,
                  athlete,
                  exercises,
                  exName,
                )}
                isSetComplete={(schemeIndex, setInstance) =>
                  isSetComplete(bi, schemeIndex, setInstance)
                }
                onOpen={() => onOpenExercise(bi)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
