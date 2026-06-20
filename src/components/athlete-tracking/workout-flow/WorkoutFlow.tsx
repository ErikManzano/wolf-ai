import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Athlete, Exercise, GeneratedProgram } from '../../../models/training';
import { findSetLog } from '../../../utils/athleteSetLogs';
import type { SetCompletionLog } from '../../../models/training';
import { buildWorkoutQueue, queueItemKey } from './buildWorkoutQueue';
import { WorkoutOverview } from './WorkoutOverview';
import { WorkoutActiveSet } from './WorkoutActiveSet';
import './workout-flow.css';

export type WorkoutFlowStep = 'overview' | 'active-set' | 'done';

export interface WorkoutFlowProps {
  open: boolean;
  day: GeneratedProgram['weeks'][number]['days'][number];
  weekNumber: number;
  assignmentId: string;
  athlete?: Athlete;
  exercises: Exercise[];
  exName: (id: string) => string;
  setLogs: SetCompletionLog[];
  isEs: boolean;
  onClose: () => void;
  /** Abrir directamente en una serie concreta (desde detalle de ejercicio). */
  startAt?: {
    exerciseIndex: number;
    schemeIndex: number;
    setInstance: number;
  };
  onCompleteSet: (input: {
    exerciseIndex: number;
    schemeIndex: number;
    setInstance: number;
    actualKg: number;
    actualReps: number;
    actualRpe: number;
  }) => void;
}

export const WorkoutFlow: React.FC<WorkoutFlowProps> = ({
  open,
  day,
  weekNumber,
  assignmentId,
  athlete,
  exercises,
  exName,
  setLogs,
  isEs,
  onClose,
  startAt,
  onCompleteSet,
}) => {
  const [step, setStep] = useState<WorkoutFlowStep>('overview');
  const [cursor, setCursor] = useState(0);

  const queue = useMemo(
    () => buildWorkoutQueue(day.session.exercises, athlete, exercises, exName),
    [day.session.exercises, athlete, exercises, exName],
  );

  const firstIncompleteIndex = useMemo(() => {
    const idx = queue.findIndex(
      (item) =>
        !findSetLog(
          setLogs,
          assignmentId,
          weekNumber,
          day.dayNumber,
          item.exerciseIndex,
          item.row.schemeIndex,
          item.row.setInstance,
        ),
    );
    return idx >= 0 ? idx : 0;
  }, [queue, setLogs, assignmentId, weekNumber, day.dayNumber]);

  useEffect(() => {
    if (!open) return;
    if (startAt) {
      const idx = queue.findIndex(
        (item) =>
          item.exerciseIndex === startAt.exerciseIndex &&
          item.row.schemeIndex === startAt.schemeIndex &&
          item.row.setInstance === startAt.setInstance,
      );
      setCursor(idx >= 0 ? idx : firstIncompleteIndex);
      setStep('active-set');
      return;
    }
    setStep('overview');
    setCursor(0);
  }, [open, startAt, queue, firstIncompleteIndex]);

  const completedCount = useMemo(
    () =>
      queue.filter((item) =>
        Boolean(
          findSetLog(
            setLogs,
            assignmentId,
            weekNumber,
            day.dayNumber,
            item.exerciseIndex,
            item.row.schemeIndex,
            item.row.setInstance,
          ),
        ),
      ).length,
    [queue, setLogs, assignmentId, weekNumber, day.dayNumber],
  );

  if (!open) return null;

  const dayLabel = day.label?.trim() || (isEs ? `Día ${day.dayNumber}` : `Day ${day.dayNumber}`);
  const current = queue[cursor];

  const handleStart = () => {
    setCursor(firstIncompleteIndex);
    setStep('active-set');
  };

  const handleComplete = (actualKg: number, actualReps: number, actualRpe: number) => {
    if (!current) return;
    onCompleteSet({
      exerciseIndex: current.exerciseIndex,
      schemeIndex: current.row.schemeIndex,
      setInstance: current.row.setInstance,
      actualKg,
      actualReps,
      actualRpe,
    });

    const next = cursor + 1;
    if (next >= queue.length) {
      setStep('done');
      return;
    }
    setCursor(next);
  };

  const handleClose = () => {
    setStep('overview');
    setCursor(0);
    onClose();
  };

  let content: React.ReactNode;

  if (step === 'overview') {
    content = (
      <WorkoutOverview
        dayLabel={dayLabel}
        exerciseCount={day.session.exercises.length}
        setCount={queue.length}
        completedSets={completedCount}
        preview={queue}
        isEs={isEs}
        onClose={handleClose}
        onStart={handleStart}
      />
    );
  } else if (step === 'done') {
    content = (
      <div className="wf-screen wf-screen--done">
        <h2 className="wf-done-title">{isEs ? '¡Sesión completada!' : 'Session complete!'}</h2>
        <p className="wf-done-meta">
          {completedCount}/{queue.length} {isEs ? 'series' : 'sets'}
        </p>
        <footer className="wf-footer">
          <button type="button" className="wf-cta wf-cta--primary" onClick={handleClose}>
            {isEs ? 'Volver al plan' : 'Back to plan'}
          </button>
        </footer>
      </div>
    );
  } else if (current) {
    const log = findSetLog(
      setLogs,
      assignmentId,
      weekNumber,
      day.dayNumber,
      current.exerciseIndex,
      current.row.schemeIndex,
      current.row.setInstance,
    );
    content = (
      <WorkoutActiveSet
        key={queueItemKey(current)}
        item={current}
        setIndex={cursor}
        totalSets={queue.length}
        isEs={isEs}
        initialKg={log?.actualKg ?? current.row.prescribedKg}
        initialReps={log?.actualReps ?? current.row.prescribedReps}
        initialRpe={log?.actualRpe}
        onClose={handleClose}
        onBack={() => setStep('overview')}
        onComplete={handleComplete}
      />
    );
  } else {
    content = null;
  }

  return createPortal(
    <div className="wf-overlay" role="dialog" aria-modal="true" aria-label={dayLabel}>
      <div className="wf-shell">{content}</div>
    </div>,
    document.body,
  );
};
