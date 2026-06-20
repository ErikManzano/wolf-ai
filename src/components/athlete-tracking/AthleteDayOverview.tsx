import React, { useMemo } from 'react';
import { CheckCircle2, Clock, Play, Timer } from 'lucide-react';
import type { Athlete, Exercise, ExerciseGoal, ProgramDay, SetCompletionLog } from '../../models/training';
import { isExerciseCompleteWithSets } from '../../utils/completionHelpers';
import {
  dayDisplayTitle,
  dayFocusBadge,
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

  const hasExercises = exerciseCount > 0;

  return (
    <div className="wa-day-overview">
      <header className="wa-day-overview__head">
        <h2 className="wa-day-overview__title">{dayDisplayTitle(day, isEs)}</h2>
        <span className="wa-day-overview__badge">
          <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden />
          {dayFocusBadge(day, primaryGoal, isEs)}
        </span>
      </header>

      <section className="wa-day-summary" aria-label={isEs ? 'Resumen del día' : 'Day summary'}>
        <div className="wa-day-summary__progress-row">
          <div>
            <p className="wa-day-summary__label">{isEs ? 'Progreso del día' : 'Day progress'}</p>
            <p className="wa-day-summary__value">
              <CheckCircle2 size={14} className="wa-day-summary__value-icon" aria-hidden />
              {completedExercises} / {exerciseCount} {isEs ? 'ejercicios' : 'exercises'}
            </p>
          </div>
          <div className="wa-day-summary__ring" aria-hidden>
            <svg viewBox="0 0 56 56">
              <circle className="wa-day-summary__ring-track" cx="28" cy="28" r="26" />
              <circle
                className="wa-day-summary__ring-fill"
                cx="28"
                cy="28"
                r="26"
                strokeDasharray={ringDash(progressPct)}
              />
            </svg>
            <span className="wa-day-summary__ring-pct">{progressPct}%</span>
          </div>
        </div>

        <div className="wa-day-summary__grid">
          <div className="wa-day-summary__stat">
            <Clock size={16} aria-hidden />
            <div>
              <span className="wa-day-summary__stat-label">
                {isEs ? 'Tiempo estimado' : 'Estimated time'}
              </span>
              <strong>{durationLabel}</strong>
            </div>
          </div>
          <div className="wa-day-summary__stat">
            <Timer size={16} className="wa-day-summary__stat-icon--rest" aria-hidden />
            <div>
              <span className="wa-day-summary__stat-label">
                {isEs ? 'Descanso sugerido' : 'Suggested rest'}
              </span>
              <strong>{restLabel}</strong>
            </div>
          </div>
        </div>
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
          <ul className="wa-day-exercises__list">
            {day.session.exercises.map((block, bi) => (
              <AthleteExercisePreviewCard
                key={`${block.exerciseId}-${bi}`}
                block={block}
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

      {hasExercises ? (
        <footer className="wa-day-overview__footer">
          <button type="button" className="wa-day-cta" onClick={onStartWorkout}>
            <Play size={18} fill="currentColor" aria-hidden />
            {isEs ? 'Iniciar entrenamiento' : 'Start workout'}
          </button>
        </footer>
      ) : null}
    </div>
  );
};
