import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { AthletePlanSelect } from './athlete-tracking/AthletePlanSwitcher';
import { useMobileTopBar } from '../context/MobileTopBarContext';
import { useAppContext } from '../context/AppContext';
import { useWolfAssign } from '../context/WolfAssignContext';
import { loadAthletesFromLocal } from '../modules/wl-athletes/athleteStore';
import { latestIntakeForWlProfile, mergeAthleteWithLatestIntake } from '../utils/wlStatsBridge';
import {
  isDayCompleteWithSets,
} from '../utils/completionHelpers';
import { AthleteDayNavigator } from './athlete-tracking/AthleteDayNavigator';
import { AthleteDayOverview } from './athlete-tracking/AthleteDayOverview';
import { AthleteExerciseDetailScreen } from './athlete-tracking/AthleteExerciseDetailScreen';
import { MobileWeekNavigator } from './athlete-tracking/MobileWeekNavigator';
import { WorkoutFlow } from './athlete-tracking/workout-flow/WorkoutFlow';
import type { GeneratedProgram, SessionExerciseBlock } from '../models/training';
import './AthleteTrainingView.css';
import './OlympicEnginePanel.css';
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
  const { intakes } = useAppContext();
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

  const baseAthleteProfile = useMemo(() => {
    const profileId = activeAssignment?.athleteProfileId;
    if (!profileId) return undefined;
    return (
      wlAthletes.find((a) => a.id === profileId) ??
      loadAthletesFromLocal().find((a) => a.id === profileId)
    );
  }, [wlAthletes, activeAssignment?.athleteProfileId]);

  const athleteProfile = useMemo(() => {
    if (!baseAthleteProfile) return undefined;
    const intake = latestIntakeForWlProfile(baseAthleteProfile.id, intakes);
    return mergeAthleteWithLatestIntake(baseAthleteProfile, intake);
  }, [baseAthleteProfile, intakes]);

  const program = activeAssignment?.program;
  const weekData = program?.weeks.find((w) => w.weekNumber === week);
  const activeDayData = weekData?.days.find((d) => d.dayNumber === activeDay);

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
      emptyTitle: isEs ? 'Sin plan asignado' : 'No plan assigned',
      emptyBody: isEs
        ? 'Cuando tu coach te asigne programas desde «Programas», aparecerán aquí. Puedes llevar varios planes a la vez.'
        : 'When your coach assigns programs from “Programs”, they will show here. You can follow multiple plans at once.',
    }),
    [isEs],
  );

  const planSelect = useMemo(() => {
    if (!activeAssignment || myAssignments.length === 0) return null;
    return (
      <AthletePlanSelect
        assignments={myAssignments}
        activeAssignmentId={activeAssignment.id}
        isEs={isEs}
        onSelect={setActiveAssignmentId}
        showLabel={false}
      />
    );
  }, [myAssignments, activeAssignment, isEs]);

  const weekNavigator = useMemo(() => {
    if (!program) return null;
    return (
      <MobileWeekNavigator
        variant="subheader"
        weeks={program.weeks}
        activeWeek={week}
        isEs={isEs}
        isDayComplete={(w, d) => {
          const wd = program.weeks.find((x) => x.weekNumber === w);
          const dd = wd?.days.find((x) => x.dayNumber === d);
          if (!dd) return false;
          return isDayDone(w, d, dd.session.exercises);
        }}
        onWeekChange={setWeek}
      />
    );
  }, [program, week, isEs, isDayDone]);

  const mobileTopBar = useMemo(() => {
    if (!activeAssignment || myAssignments.length === 0) {
      return { title: t.kicker };
    }
    return {
      title: t.kicker,
      belowTitle: planSelect ?? undefined,
      pinnedBelowHeader: weekNavigator ?? undefined,
    };
  }, [t.kicker, myAssignments, activeAssignment, planSelect, weekNavigator]);
  useMobileTopBar(mobileTopBar);

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
      {planSelect || weekNavigator ? (
        <div className="wolf-athlete-plan-toolbar wolf-athlete-plan-toolbar--desktop" aria-label={isEs ? 'Plan y semana' : 'Plan and week'}>
          {planSelect}
          {weekNavigator}
        </div>
      ) : null}

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
