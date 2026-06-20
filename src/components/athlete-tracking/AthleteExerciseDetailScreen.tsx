import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Circle, MoreHorizontal, Timer, User } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock, SetCompletionLog } from '../../models/training';
import {
  blockExerciseTitle,
  blockSummaryStats,
  blockTechniqueTag,
  formatRestLabel,
} from '../../utils/athleteDayMetrics';
import { ExerciseDetailMock } from './ExerciseDetailMock';
import { cn } from '../../lib/utils';

export interface AthleteExerciseDetailScreenProps {
  open: boolean;
  block: SessionExerciseBlock;
  athlete?: Athlete;
  exercises: Exercise[];
  exName: (id: string) => string;
  isEs: boolean;
  isSetComplete: (schemeIndex: number, setInstance: number) => boolean;
  getSetLog: (schemeIndex: number, setInstance: number) => SetCompletionLog | undefined;
  onClose: () => void;
  onStartSet: (schemeIndex: number, setInstance: number) => void;
  onToggleSet: (
    schemeIndex: number,
    setInstance: number,
    actualKg: number,
    actualReps: number,
  ) => void;
}

export const AthleteExerciseDetailScreen: React.FC<AthleteExerciseDetailScreenProps> = ({
  open,
  block,
  athlete,
  exercises,
  exName,
  isEs,
  isSetComplete,
  getSetLog,
  onClose,
  onStartSet,
  onToggleSet,
}) => {
  const { title, isComplex } = blockExerciseTitle(block, exName);
  const techniqueTag = blockTechniqueTag(block, exercises, exName, isEs);
  const stats = blockSummaryStats(block, athlete, exercises);

  const activeSetIndex = useMemo(() => {
    const idx = stats.flat.findIndex((row) => !isSetComplete(row.schemeIndex, row.setInstance));
    return idx >= 0 ? idx : stats.flat.length - 1;
  }, [stats.flat, isSetComplete]);

  const activeRow = stats.flat[activeSetIndex];

  if (!open) return null;

  return createPortal(
    <div className="wa-exercise-detail" role="dialog" aria-modal="true" aria-label={title}>
      <div className="wa-exercise-detail__shell">
        <header className="wa-exercise-detail__head">
          <button type="button" className="wa-exercise-detail__icon-btn" onClick={onClose} aria-label={isEs ? 'Volver' : 'Back'}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="wa-exercise-detail__title">{title}</h1>
          <button type="button" className="wa-exercise-detail__icon-btn" aria-label={isEs ? 'Opciones' : 'Options'}>
            <MoreHorizontal size={20} />
          </button>
        </header>

        <div className="wa-exercise-detail__tags">
          <span
            className={cn(
              'wa-exercise-detail__tag',
              isComplex ? 'wa-exercise-detail__tag--complex' : 'wa-exercise-detail__tag--simple',
            )}
          >
            {isComplex ? (isEs ? 'Complejo' : 'Complex') : isEs ? 'Simple' : 'Single'}
          </span>
          {techniqueTag ? (
            <span className="wa-exercise-detail__tag wa-exercise-detail__tag--technique">
              <User size={11} aria-hidden />
              {techniqueTag}
            </span>
          ) : null}
        </div>

        <div className="wa-exercise-detail__scroll">
          <ExerciseDetailMock exerciseName={title} isComplex={isComplex} isEs={isEs} />

          <div className="wa-exercise-detail__stats">
            <div className="wa-exercise-detail__stat">
              <span className="wa-exercise-detail__stat-label">{isEs ? 'Intensidad' : 'Intensity'}</span>
              <strong>{stats.intensity}%</strong>
              <span className="wa-exercise-detail__stat-sub">
                {stats.anchorKg} kg {isEs ? '(1RM ancla)' : '(anchor 1RM)'}
              </span>
            </div>
            <div className="wa-exercise-detail__stat">
              <span className="wa-exercise-detail__stat-label">{isEs ? 'Reps objetivo' : 'Target reps'}</span>
              <strong>{stats.targetReps}</strong>
            </div>
            <div className="wa-exercise-detail__stat">
              <span className="wa-exercise-detail__stat-label">{isEs ? 'Series' : 'Sets'}</span>
              <strong>{stats.totalSets}</strong>
            </div>
            <div className="wa-exercise-detail__stat">
              <span className="wa-exercise-detail__stat-label">{isEs ? 'Descanso' : 'Rest'}</span>
              <strong>{formatRestLabel(stats.restSec)}</strong>
            </div>
          </div>

          <section className="wa-exercise-detail__sets" aria-labelledby="wa-exercise-sets-title">
            <h2 id="wa-exercise-sets-title" className="wa-exercise-detail__sets-title">
              {isEs ? 'Series' : 'Sets'}
            </h2>
            <ul className="wa-exercise-detail__sets-list">
              {stats.flat.map((row, idx) => {
                const done = isSetComplete(row.schemeIndex, row.setInstance);
                const log = getSetLog(row.schemeIndex, row.setInstance);
                const active = idx === activeSetIndex && !done;
                const actualReps = log?.actualReps ?? 0;

                return (
                  <li key={`${row.schemeIndex}-${row.setInstance}`}>
                    <div
                      className={cn(
                        'wa-detail-set',
                        done && 'wa-detail-set--done',
                        active && 'wa-detail-set--active',
                      )}
                    >
                      <span className="wa-detail-set__num">{row.setInstance}</span>
                      <div className="wa-detail-set__main">
                        <span className="wa-detail-set__load">
                          {row.percentage}% • {row.prescribedKg} kg
                        </span>
                        <span className="wa-detail-set__reps">
                          {row.prescribedReps} {isEs ? 'reps' : 'reps'}
                        </span>
                      </div>
                      <div className="wa-detail-set__status">
                        <span className="wa-detail-set__done-label">
                          {actualReps} {isEs ? 'realizadas' : 'done'}
                        </span>
                        <button
                          type="button"
                          className={cn('wa-detail-set__check', done && 'is-done')}
                          aria-pressed={done}
                          aria-label={
                            done
                              ? isEs
                                ? 'Desmarcar serie'
                                : 'Unmark set'
                              : isEs
                                ? 'Marcar serie'
                                : 'Mark set'
                          }
                          onClick={() =>
                            onToggleSet(
                              row.schemeIndex,
                              row.setInstance,
                              log?.actualKg ?? row.prescribedKg,
                              log?.actualReps ?? row.prescribedReps,
                            )
                          }
                        >
                          {done ? (
                            <span className="wa-detail-set__check-fill" aria-hidden />
                          ) : (
                            <Circle size={22} strokeWidth={2} aria-hidden />
                          )}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {activeRow && !isSetComplete(activeRow.schemeIndex, activeRow.setInstance) ? (
          <footer className="wa-exercise-detail__footer">
            <button
              type="button"
              className="wa-exercise-detail__cta"
              onClick={() => onStartSet(activeRow.schemeIndex, activeRow.setInstance)}
            >
              <Timer size={18} aria-hidden />
              {isEs ? `Comenzar serie ${activeRow.setInstance}` : `Start set ${activeRow.setInstance}`}
            </button>
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};
