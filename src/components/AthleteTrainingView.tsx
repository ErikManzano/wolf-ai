import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, TrendingUp } from 'lucide-react';
import type { SessionExerciseBlock } from '../models/training';
import { useWolfAssign } from '../context/WolfAssignContext';
import {
  countCompletedExercisesWithSets,
  countProgramExercises,
  isDayCompleteWithSets,
} from '../utils/completionHelpers';
import { AthleteDayNavigator } from './athlete-tracking/AthleteDayNavigator';
import { AthleteDayOverview } from './athlete-tracking/AthleteDayOverview';
import { AthleteExerciseDetailScreen } from './athlete-tracking/AthleteExerciseDetailScreen';
import { MobileWeekNavigator } from './athlete-tracking/MobileWeekNavigator';
import { WorkoutFlow } from './athlete-tracking/workout-flow/WorkoutFlow';
import type { GeneratedProgram } from '../models/training';
import './AthleteTrainingView.css';
import './athlete-tracking/athlete-day-view.css';
import '../styles/interactive.css';

interface AthleteTrainingViewProps {
  language: 'ES' | 'EN';
}

type WorkoutStartAt = {
  exerciseIndex: number;
  schemeIndex: number;
  setInstance: number;
};

const AthleteTrainingView: React.FC<AthleteTrainingViewProps> = ({ language }) => {
  const isEs = language === 'ES';
  const {
    myAssignments,
    assignmentsLoading,
    completions,
    setLogs,
    toggleSetComplete,
    updateSetLog,
    isSetComplete,
    getSetLog,
    motorExercises,
    wlAthletes,
  } = useWolfAssign();

  const exName = useCallback(
    (id: string) => motorExercises.find((e) => e.id === id)?.name ?? id,
    [motorExercises],
  );

  const [week, setWeek] = useState(1);
  const [activeDay, setActiveDay] = useState(1);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [workoutDay, setWorkoutDay] = useState<GeneratedProgram['weeks'][number]['days'][number] | null>(
    null,
  );
  const [workoutStartAt, setWorkoutStartAt] = useState<WorkoutStartAt | undefined>(undefined);
  const [exerciseDetailIndex, setExerciseDetailIndex] = useState<number | null>(null);

  useEffect(() => {
    if (myAssignments.length === 0) {
      setActiveAssignmentId(null);
      return;
    }
    setActiveAssignmentId((prev) =>
      prev && myAssignments.some((a) => a.id === prev) ? prev : myAssignments[0].id,
    );
  }, [myAssignments]);

  const activeAssignment = useMemo(
    () => myAssignments.find((a) => a.id === activeAssignmentId) ?? myAssignments[0],
    [myAssignments, activeAssignmentId],
  );

  const athleteProfile = useMemo(
    () => wlAthletes.find((a) => a.id === activeAssignment?.athleteProfileId),
    [wlAthletes, activeAssignment?.athleteProfileId],
  );

  const program = activeAssignment?.program;
  const weekData = program?.weeks.find((w) => w.weekNumber === week);
  const activeDayData = weekData?.days.find((d) => d.dayNumber === activeDay);

  const totalExercises = useMemo(() => (program ? countProgramExercises(program) : 0), [program]);

  const isDayDone = useCallback(
    (w: number, d: number, sessionExercises: SessionExerciseBlock[]) => {
      if (!activeAssignment) return false;
      return isDayCompleteWithSets(
        completions,
        setLogs,
        activeAssignment.id,
        w,
        d,
        sessionExercises,
        athleteProfile,
        motorExercises,
        exName,
      );
    },
    [completions, setLogs, activeAssignment, athleteProfile, motorExercises, exName],
  );

  const completedExercises = useMemo(() => {
    if (!activeAssignment || !program) return 0;
    return countCompletedExercisesWithSets(
      completions,
      setLogs,
      activeAssignment.id,
      program,
      athleteProfile,
      motorExercises,
      exName,
    );
  }, [completions, setLogs, activeAssignment, program, athleteProfile, motorExercises, exName]);

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
      emptyTitle: isEs ? 'Sin plan asignado' : 'No plan assigned',
      emptyBody: isEs
        ? 'Cuando tu coach te asigne programas desde «Programas», aparecerán aquí. Puedes llevar varios planes a la vez.'
        : 'When your coach assigns programs from “Programs”, they will show here. You can follow multiple plans at once.',
    }),
    [isEs],
  );

  useEffect(() => {
    if (!program || !activeAssignment) return;
    for (const w of program.weeks) {
      for (const d of w.days) {
        if (!isDayDone(w.weekNumber, d.dayNumber, d.session.exercises)) {
          setWeek(w.weekNumber);
          setActiveDay(d.dayNumber);
          return;
        }
      }
    }
  }, [program, activeAssignment, isDayDone]);

  useEffect(() => {
    setWeek(1);
    setActiveDay(1);
    setExerciseDetailIndex(null);
  }, [activeAssignment?.id]);

  useEffect(() => {
    if (firstIncompleteDayNumber != null) {
      setActiveDay(firstIncompleteDayNumber);
    } else if (weekData?.days[0]) {
      setActiveDay(weekData.days[0].dayNumber);
    }
  }, [week, weekData?.days, firstIncompleteDayNumber]);

  const completeSet = useCallback(
    (dayNumber: number, input: WorkoutStartAt & { actualKg: number; actualReps: number; actualRpe: number }) => {
      if (!activeAssignment || !weekData) return;
      const payload = {
        assignmentId: activeAssignment.id,
        weekNumber: weekData.weekNumber,
        dayNumber,
        exerciseIndex: input.exerciseIndex,
        schemeIndex: input.schemeIndex,
        setInstance: input.setInstance,
        actualKg: input.actualKg,
        actualReps: input.actualReps,
        actualRpe: input.actualRpe,
      };
      const alreadyDone = isSetComplete(
        activeAssignment.id,
        weekData.weekNumber,
        dayNumber,
        input.exerciseIndex,
        input.schemeIndex,
        input.setInstance,
      );
      if (alreadyDone) updateSetLog(payload);
      else toggleSetComplete(payload);
    },
    [activeAssignment, weekData, isSetComplete, updateSetLog, toggleSetComplete],
  );

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

  if (!activeAssignment || !program || !weekData || !activeDayData) {
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

  const detailBlock =
    exerciseDetailIndex != null ? activeDayData.session.exercises[exerciseDetailIndex] : undefined;

  return (
    <div className="wolf-athlete-plan wolf-athlete-plan--tracking wolf-athlete-plan--mobile-day">
      <header className="wolf-athlete-hero wolf-athlete-hero--compact">
        <div className="wolf-athlete-hero-accent" aria-hidden />
        <div className="wolf-athlete-hero-inner">
          <div className="wolf-athlete-hero-main">
            <p className="wolf-athlete-kicker">
              <CalendarDays size={14} strokeWidth={2} aria-hidden />
              {t.kicker}
            </p>
            <h1 className="wolf-athlete-title">{t.title}</h1>
            {myAssignments.length > 1 ? (
              <div className="wolf-athlete-plan-switcher" role="tablist" aria-label={isEs ? 'Planes activos' : 'Active plans'}>
                {myAssignments.map((asg) => (
                  <button
                    key={asg.id}
                    type="button"
                    role="tab"
                    aria-selected={asg.id === activeAssignment.id}
                    className={`wolf-athlete-plan-switcher__btn${
                      asg.id === activeAssignment.id ? ' wolf-athlete-plan-switcher__btn--active' : ''
                    }`}
                    onClick={() => setActiveAssignmentId(asg.id)}
                  >
                    {asg.program.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="wolf-athlete-program-name">{program.name}</p>
            )}
          </div>

          <aside className="wolf-athlete-discipline wolf-athlete-discipline--compact" aria-label={t.discipline}>
            <div className="wolf-athlete-discipline-top">
              <TrendingUp size={16} strokeWidth={2} className="wolf-athlete-discipline-icon" aria-hidden />
              <span className="wolf-athlete-discipline-pct">{disciplinePct}%</span>
              <span className="wolf-athlete-discipline-sub">
                {completedExercises}/{totalExercises}
              </span>
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

      <AthleteDayNavigator
        days={weekData.days}
        activeDay={activeDay}
        isEs={isEs}
        isDayComplete={(dayNumber) => {
          const day = weekData.days.find((d) => d.dayNumber === dayNumber);
          if (!day) return false;
          return isDayDone(weekData.weekNumber, dayNumber, day.session.exercises);
        }}
        onDayChange={(dayNumber) => {
          setActiveDay(dayNumber);
          setExerciseDetailIndex(null);
        }}
      />

      <AthleteDayOverview
        day={activeDayData}
        weekNumber={weekData.weekNumber}
        assignmentId={activeAssignment.id}
        primaryGoal={program.primaryGoal}
        athlete={athleteProfile}
        exercises={motorExercises}
        exName={exName}
        isEs={isEs}
        completions={completions}
        setLogs={setLogs}
        isSetComplete={(exerciseIndex, schemeIndex, setInstance) =>
          isSetComplete(
            activeAssignment.id,
            weekData.weekNumber,
            activeDayData.dayNumber,
            exerciseIndex,
            schemeIndex,
            setInstance,
          )
        }
        onOpenExercise={setExerciseDetailIndex}
        onStartWorkout={() => {
          setWorkoutStartAt(undefined);
          setWorkoutDay(activeDayData);
        }}
      />

      {detailBlock && exerciseDetailIndex != null ? (
        <AthleteExerciseDetailScreen
          open
          block={detailBlock}
          athlete={athleteProfile}
          exercises={motorExercises}
          exName={exName}
          isEs={isEs}
          isSetComplete={(schemeIndex, setInstance) =>
            isSetComplete(
              activeAssignment.id,
              weekData.weekNumber,
              activeDayData.dayNumber,
              exerciseDetailIndex,
              schemeIndex,
              setInstance,
            )
          }
          getSetLog={(schemeIndex, setInstance) =>
            getSetLog(
              activeAssignment.id,
              weekData.weekNumber,
              activeDayData.dayNumber,
              exerciseDetailIndex,
              schemeIndex,
              setInstance,
            )
          }
          onClose={() => setExerciseDetailIndex(null)}
          onStartSet={(schemeIndex, setInstance) => {
            setWorkoutStartAt({
              exerciseIndex: exerciseDetailIndex,
              schemeIndex,
              setInstance,
            });
            setWorkoutDay(activeDayData);
            setExerciseDetailIndex(null);
          }}
          onToggleSet={(schemeIndex, setInstance, actualKg, actualReps) =>
            toggleSetComplete({
              assignmentId: activeAssignment.id,
              weekNumber: weekData.weekNumber,
              dayNumber: activeDayData.dayNumber,
              exerciseIndex: exerciseDetailIndex,
              schemeIndex,
              setInstance,
              actualKg,
              actualReps,
            })
          }
        />
      ) : null}

      {workoutDay ? (
        <WorkoutFlow
          open={Boolean(workoutDay)}
          day={workoutDay}
          weekNumber={weekData.weekNumber}
          assignmentId={activeAssignment.id}
          athlete={athleteProfile}
          exercises={motorExercises}
          exName={exName}
          setLogs={setLogs}
          isEs={isEs}
          startAt={workoutStartAt}
          onClose={() => {
            setWorkoutDay(null);
            setWorkoutStartAt(undefined);
          }}
          onCompleteSet={(input) => completeSet(workoutDay.dayNumber, input)}
        />
      ) : null}
    </div>
  );
};

export default AthleteTrainingView;
