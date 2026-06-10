import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, TrendingUp } from 'lucide-react';
import type { SessionExerciseBlock } from '../models/training';
import { mockAthletes } from '../data/loadMockData';
import { useWolfAssign } from '../context/WolfAssignContext';
import {
  countCompletedExercisesWithSets,
  countProgramExercises,
  isDayCompleteWithSets,
} from '../utils/completionHelpers';
import { DayTrackingCard } from './athlete-tracking/DayTrackingCard';
import { MobileWeekNavigator } from './athlete-tracking/MobileWeekNavigator';
import './AthleteTrainingView.css';
import '../styles/interactive.css';

interface AthleteTrainingViewProps {
  language: 'ES' | 'EN';
}

const AthleteTrainingView: React.FC<AthleteTrainingViewProps> = ({ language }) => {
  const isEs = language === 'ES';
  const {
    myAssignment,
    assignmentsLoading,
    completions,
    setLogs,
    toggleSessionComplete,
    isSessionComplete,
    toggleExerciseComplete,
    toggleSetComplete,
    updateSetLog,
    isSetComplete,
    getSetLog,
    motorExercises,
  } = useWolfAssign();

  const exName = useCallback(
    (id: string) => motorExercises.find((e) => e.id === id)?.name ?? id,
    [motorExercises],
  );

  const [week, setWeek] = useState(1);

  const athleteProfile = useMemo(
    () => mockAthletes.find((a) => a.id === myAssignment?.athleteProfileId),
    [myAssignment?.athleteProfileId],
  );

  const program = myAssignment?.program;
  const weekData = program?.weeks.find((w) => w.weekNumber === week);

  const totalExercises = useMemo(() => (program ? countProgramExercises(program) : 0), [program]);

  const isDayDone = useCallback(
    (w: number, d: number, sessionExercises: SessionExerciseBlock[]) => {
      if (!myAssignment) return false;
      return isDayCompleteWithSets(
        completions,
        setLogs,
        myAssignment.id,
        w,
        d,
        sessionExercises,
        athleteProfile,
        motorExercises,
        exName,
      );
    },
    [completions, setLogs, myAssignment, athleteProfile, motorExercises, exName],
  );

  const completedExercises = useMemo(() => {
    if (!myAssignment || !program) return 0;
    return countCompletedExercisesWithSets(
      completions,
      setLogs,
      myAssignment.id,
      program,
      athleteProfile,
      motorExercises,
      exName,
    );
  }, [completions, setLogs, myAssignment, program, athleteProfile, motorExercises, exName]);

  const disciplinePct =
    totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  const firstIncompleteDayNumber = useMemo(() => {
    if (!weekData) return null;
    const incomplete = weekData.days.find(
      (d) => !isDayDone(weekData.weekNumber, d.dayNumber, d.session.exercises),
    );
    return incomplete?.dayNumber ?? weekData.days[0]?.dayNumber ?? null;
  }, [weekData, isDayDone]);

  const t = useMemo(
    () => ({
      kicker: isEs ? 'Tu semana de entreno' : 'Your training week',
      title: isEs ? 'Mi plan WL' : 'My WL plan',
      discipline: isEs ? 'Disciplina' : 'Discipline',
      exercisesDone: isEs ? 'ejercicios hechos' : 'exercises done',
      markDone: isEs ? 'Marcar realizada' : 'Mark done',
      done: isEs ? 'Realizada' : 'Done',
      reps: isEs ? 'reps' : 'reps',
      emptyTitle: isEs ? 'Sin plan asignado' : 'No plan assigned',
      emptyBody: isEs
        ? 'Tu coach debe generar un programa en Motor WL y pulsar «Asignar al atleta».'
        : 'Your coach should build a program in the WL Engine and tap “Assign to athlete”.',
    }),
    [isEs],
  );

  useEffect(() => {
    if (!program || !myAssignment) return;
    for (const w of program.weeks) {
      for (const d of w.days) {
        if (!isDayDone(w.weekNumber, d.dayNumber, d.session.exercises)) {
          setWeek(w.weekNumber);
          return;
        }
      }
    }
  }, [program, myAssignment, isDayDone]);

  if (assignmentsLoading) {
    return (
      <div className="wolf-athlete-plan wolf-athlete-plan--empty">
        <div className="wolf-athlete-empty-visual">
          <ClipboardList size={40} strokeWidth={1.35} />
        </div>
        <h2 className="wolf-athlete-empty-title">{isEs ? 'Cargando tu plan…' : 'Loading your plan…'}</h2>
      </div>
    );
  }

  if (!myAssignment || !program || !weekData) {
    return (
      <div className="wolf-athlete-plan wolf-athlete-plan--empty">
        <div className="wolf-athlete-empty-visual">
          <ClipboardList size={40} strokeWidth={1.35} />
        </div>
        <h2 className="wolf-athlete-empty-title">{t.emptyTitle}</h2>
        <p className="wolf-athlete-empty-text">{t.emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="wolf-athlete-plan wolf-athlete-plan--tracking">
      <header className="wolf-athlete-hero">
        <div className="wolf-athlete-hero-accent" aria-hidden />
        <div className="wolf-athlete-hero-inner">
          <div className="wolf-athlete-hero-main">
            <p className="wolf-athlete-kicker">
              <CalendarDays size={14} strokeWidth={2} aria-hidden />
              {t.kicker}
            </p>
            <h1 className="wolf-athlete-title">{t.title}</h1>
            <p className="wolf-athlete-program-name">{program.name}</p>
            {athleteProfile ? (
              <p className="wolf-athlete-athlete-name">
                <span className="wolf-athlete-athlete-label">{isEs ? 'Atleta' : 'Athlete'}</span>
                {athleteProfile.name}
              </p>
            ) : null}
          </div>

          <aside className="wolf-athlete-discipline" aria-label={t.discipline}>
            <div className="wolf-athlete-discipline-top">
              <TrendingUp size={18} strokeWidth={2} className="wolf-athlete-discipline-icon" aria-hidden />
              <div>
                <span className="wolf-athlete-discipline-label">{t.discipline}</span>
                <span className="wolf-athlete-discipline-sub">
                  {completedExercises}/{totalExercises} {t.exercisesDone}
                </span>
              </div>
              <span className="wolf-athlete-discipline-pct">{disciplinePct}%</span>
            </div>
            <div
              className="wolf-athlete-progress-track"
              role="progressbar"
              aria-valuenow={disciplinePct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="wolf-athlete-progress-fill" style={{ width: `${disciplinePct}%` }} />
            </div>
          </aside>
        </div>
      </header>

      <MobileWeekNavigator
        weeks={program.weeks}
        activeWeek={week}
        totalWeeks={program.weeks.length}
        isEs={isEs}
        isDayComplete={(w, d) => {
          const wd = program.weeks.find((x) => x.weekNumber === w);
          const dd = wd?.days.find((x) => x.dayNumber === d);
          if (!dd) return false;
          return isDayDone(w, d, dd.session.exercises);
        }}
        onWeekChange={setWeek}
      />

      <ul className="wolf-athlete-day-list">
        {weekData.days.map((day, dayIndex) => {
          const exerciseCount = day.session.exercises.length;
          const sessionDone = isSessionComplete(
            myAssignment.id,
            weekData.weekNumber,
            day.dayNumber,
            exerciseCount,
          );
          const dayDone = isDayDone(weekData.weekNumber, day.dayNumber, day.session.exercises);

          return (
            <DayTrackingCard
              key={day.dayNumber}
              day={day}
              dayIndex={dayIndex}
              weekNumber={weekData.weekNumber}
              assignmentId={myAssignment.id}
              athlete={athleteProfile}
              exercises={motorExercises}
              exName={exName}
              isEs={isEs}
              isDayDone={dayDone}
              sessionDone={sessionDone}
              completions={completions}
              setLogs={setLogs}
              defaultExpanded={day.dayNumber === firstIncompleteDayNumber}
              markDoneLabel={t.markDone}
              doneLabel={t.done}
              repsLabel={t.reps}
              isSetComplete={(exerciseIndex, schemeIndex, setInstance) =>
                isSetComplete(
                  myAssignment.id,
                  weekData.weekNumber,
                  day.dayNumber,
                  exerciseIndex,
                  schemeIndex,
                  setInstance,
                )
              }
              getSetLog={(exerciseIndex, schemeIndex, setInstance) =>
                getSetLog(
                  myAssignment.id,
                  weekData.weekNumber,
                  day.dayNumber,
                  exerciseIndex,
                  schemeIndex,
                  setInstance,
                )
              }
              onToggleSet={(exerciseIndex, schemeIndex, setInstance, actualKg, actualReps, actualSegmentReps) =>
                toggleSetComplete({
                  assignmentId: myAssignment.id,
                  weekNumber: weekData.weekNumber,
                  dayNumber: day.dayNumber,
                  exerciseIndex,
                  schemeIndex,
                  setInstance,
                  actualKg,
                  actualReps,
                  actualSegmentReps,
                })
              }
              onUpdateSet={(exerciseIndex, schemeIndex, setInstance, actualKg, actualReps, actualSegmentReps) =>
                updateSetLog({
                  assignmentId: myAssignment.id,
                  weekNumber: weekData.weekNumber,
                  dayNumber: day.dayNumber,
                  exerciseIndex,
                  schemeIndex,
                  setInstance,
                  actualKg,
                  actualReps,
                  actualSegmentReps,
                })
              }
              onMarkExercise={(exerciseIndex) =>
                toggleExerciseComplete(
                  myAssignment.id,
                  weekData.weekNumber,
                  day.dayNumber,
                  exerciseIndex,
                )
              }
              onToggleSession={() =>
                toggleSessionComplete(
                  myAssignment.id,
                  weekData.weekNumber,
                  day.dayNumber,
                  exerciseCount,
                )
              }
            />
          );
        })}
      </ul>
    </div>
  );
};

export default AthleteTrainingView;
