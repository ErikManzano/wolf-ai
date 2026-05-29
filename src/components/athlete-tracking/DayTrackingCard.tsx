import React, { useId, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Circle,
  Dumbbell,
  Layers,
} from 'lucide-react';
import type { Athlete, Exercise, GeneratedProgram, SessionExerciseBlock } from '../../models/training';
import { isExerciseCompleteWithSets } from '../../utils/completionHelpers';
import { ExerciseTrackingCard } from './ExerciseTrackingCard';
import type { SetCompletionLog } from '../../models/training';

interface DayTrackingCardProps {
  day: GeneratedProgram['weeks'][number]['days'][number];
  dayIndex: number;
  weekNumber: number;
  assignmentId: string;
  athlete?: Athlete;
  exercises: Exercise[];
  exName: (id: string) => string;
  isEs: boolean;
  isDayDone: boolean;
  sessionDone: boolean;
  completions: Parameters<typeof isExerciseCompleteWithSets>[0];
  setLogs: Parameters<typeof isExerciseCompleteWithSets>[1];
  defaultExpanded?: boolean;
  isSetComplete: (
    exerciseIndex: number,
    schemeIndex: number,
    setInstance: number,
  ) => boolean;
  getSetLog: (
    exerciseIndex: number,
    schemeIndex: number,
    setInstance: number,
  ) => SetCompletionLog | undefined;
  onToggleSet: (
    exerciseIndex: number,
    schemeIndex: number,
    setInstance: number,
    actualKg: number,
    actualReps: number,
    actualSegmentReps?: number[],
  ) => void;
  onUpdateSet: (
    exerciseIndex: number,
    schemeIndex: number,
    setInstance: number,
    actualKg: number,
    actualReps: number,
    actualSegmentReps?: number[],
  ) => void;
  onMarkExercise: (exerciseIndex: number) => void;
  onToggleSession: () => void;
  markDoneLabel: string;
  doneLabel: string;
  repsLabel: string;
}

export const DayTrackingCard: React.FC<DayTrackingCardProps> = ({
  day,
  dayIndex,
  weekNumber,
  assignmentId,
  athlete,
  exercises,
  exName,
  isEs,
  isDayDone,
  sessionDone,
  completions,
  setLogs,
  defaultExpanded = false,
  isSetComplete,
  getSetLog,
  onToggleSet,
  onUpdateSet,
  onMarkExercise,
  onToggleSession,
  markDoneLabel,
  doneLabel,
  repsLabel,
}) => {
  const panelId = useId();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const exerciseCount = day.session.exercises.length;

  const completedExercises = day.session.exercises.filter((block, bi) =>
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
  ).length;

  const toggleExpand = () => setExpanded((v) => !v);

  return (
    <li
      className={`wolf-athlete-day-card ${isDayDone ? 'wolf-athlete-day-card--done' : ''} ${
        !expanded ? 'wolf-athlete-day-card--collapsed' : ''
      }`}
    >
      <div className="wolf-athlete-day-card__accent" aria-hidden />

      <div className="wolf-athlete-day-top">
        <button
          type="button"
          className="wolf-athlete-day-expand"
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={
            expanded
              ? isEs
                ? `Contraer ${day.label}`
                : `Collapse ${day.label}`
              : isEs
                ? `Expandir ${day.label}`
                : `Expand ${day.label}`
          }
          onClick={toggleExpand}
        >
          <ChevronDown
            size={18}
            strokeWidth={2.25}
            className={`wolf-athlete-day-chevron ${expanded ? 'is-open' : ''}`}
            aria-hidden
          />
        </button>

        <button
          type="button"
          className="wolf-athlete-day-title-row wolf-athlete-day-title-row--tap"
          onClick={toggleExpand}
          aria-expanded={expanded}
        >
          <span className="wolf-athlete-day-badge" aria-hidden>
            {dayIndex + 1}
          </span>
          <div className="wolf-athlete-day-title-main">
            <h3 className="wolf-athlete-day-title">{day.label}</h3>
            <div className="wolf-athlete-metrics" role="list">
              <span className="wolf-athlete-metric" role="listitem">
                <Activity size={14} strokeWidth={2} aria-hidden />
                K <strong>{day.session.kValue.toFixed(1)}</strong>
              </span>
              <span className="wolf-athlete-metric" role="listitem">
                <Dumbbell size={14} strokeWidth={2} aria-hidden />
                <strong>{day.session.load}</strong> kg
              </span>
              <span className="wolf-athlete-metric" role="listitem">
                <Layers size={14} strokeWidth={2} aria-hidden />
                <strong>{day.session.totalReps}</strong> {repsLabel}
              </span>
              <span
                className={`wolf-athlete-metric wolf-athlete-metric--progress ${
                  completedExercises === exerciseCount && exerciseCount > 0 ? 'is-complete' : ''
                }`}
                role="listitem"
              >
                <CheckCircle2 size={14} strokeWidth={2} aria-hidden />
                <strong>
                  {completedExercises}/{exerciseCount}
                </strong>
              </span>
            </div>
          </div>
        </button>
      </div>

      <div
        id={panelId}
        className={`wolf-athlete-day-panel ${expanded ? 'is-open' : ''}`}
        aria-hidden={!expanded}
      >
        <div className="wolf-athlete-day-panel-inner">
          <div className="wolf-athlete-blocks">
            {exerciseCount === 0 ? (
              <p className="wolf-athlete-empty-text wolf-athlete-empty-text--inline">
                {isEs ? 'Sin ejercicios en este día.' : 'No exercises this day.'}
              </p>
            ) : (
              day.session.exercises.map((block, bi) => (
                <DayExerciseBlock
                  key={`${block.exerciseId}-${bi}`}
                  block={block}
                  blockIndex={bi}
                  athlete={athlete}
                  exercises={exercises}
                  exName={exName}
                  isEs={isEs}
                  assignmentId={assignmentId}
                  weekNumber={weekNumber}
                  dayNumber={day.dayNumber}
                  completions={completions}
                  setLogs={setLogs}
                  isSetComplete={isSetComplete}
                  getSetLog={getSetLog}
                  onToggleSet={onToggleSet}
                  onUpdateSet={onUpdateSet}
                  onMarkExercise={onMarkExercise}
                />
              ))
            )}
          </div>

          <div className="wolf-athlete-day-footer">
            <button
              type="button"
              className={`wolf-athlete-done-btn wolf-athlete-done-btn--block ${sessionDone ? 'active' : ''}`}
              aria-pressed={sessionDone}
              onClick={onToggleSession}
            >
              {sessionDone ? (
                <CheckCircle2 size={20} strokeWidth={2.25} aria-hidden />
              ) : (
                <Circle size={20} strokeWidth={2} aria-hidden />
              )}
              <span>{sessionDone ? doneLabel : markDoneLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </li>
  );
};

interface DayExerciseBlockProps {
  block: SessionExerciseBlock;
  blockIndex: number;
  athlete?: Athlete;
  exercises: Exercise[];
  exName: (id: string) => string;
  isEs: boolean;
  assignmentId: string;
  weekNumber: number;
  dayNumber: number;
  completions: DayTrackingCardProps['completions'];
  setLogs: DayTrackingCardProps['setLogs'];
  isSetComplete: DayTrackingCardProps['isSetComplete'];
  getSetLog: DayTrackingCardProps['getSetLog'];
  onToggleSet: DayTrackingCardProps['onToggleSet'];
  onUpdateSet: DayTrackingCardProps['onUpdateSet'];
  onMarkExercise: (exerciseIndex: number) => void;
}

const DayExerciseBlock: React.FC<DayExerciseBlockProps> = ({
  block,
  blockIndex,
  athlete,
  exercises,
  exName,
  isEs,
  assignmentId,
  weekNumber,
  dayNumber,
  completions,
  setLogs,
  isSetComplete,
  getSetLog,
  onToggleSet,
  onUpdateSet,
  onMarkExercise,
}) => {
  const legacyExerciseDone = isExerciseCompleteWithSets(
    completions,
    setLogs,
    assignmentId,
    weekNumber,
    dayNumber,
    blockIndex,
    block,
    athlete,
    exercises,
    exName,
  );

  return (
    <ExerciseTrackingCard
      block={block}
      blockIndex={blockIndex}
      athlete={athlete}
      exercises={exercises}
      exName={exName}
      isEs={isEs}
      assignmentId={assignmentId}
      weekNumber={weekNumber}
      dayNumber={dayNumber}
      legacyExerciseDone={legacyExerciseDone}
      isSetComplete={(schemeIndex, setInstance) =>
        isSetComplete(blockIndex, schemeIndex, setInstance)
      }
      getSetLog={(schemeIndex, setInstance) =>
        getSetLog(blockIndex, schemeIndex, setInstance)
      }
      onToggleSet={(schemeIndex, setInstance, actualKg, actualReps, actualSegmentReps) =>
        onToggleSet(blockIndex, schemeIndex, setInstance, actualKg, actualReps, actualSegmentReps)
      }
      onUpdateSet={(schemeIndex, setInstance, actualKg, actualReps, actualSegmentReps) =>
        onUpdateSet(blockIndex, schemeIndex, setInstance, actualKg, actualReps, actualSegmentReps)
      }
      onMarkAllComplete={() => onMarkExercise(blockIndex)}
    />
  );
};
