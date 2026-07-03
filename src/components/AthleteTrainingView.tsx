import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { flattenBlockSets } from '../utils/athleteSetLogs';
import { isSetAddressed } from '../utils/setCompletionStatus';
import { AthleteDayNavigator } from './athlete-tracking/AthleteDayNavigator';
import { AthleteDayOverview } from './athlete-tracking/AthleteDayOverview';
import { AthleteExerciseDetailScreen } from './athlete-tracking/AthleteExerciseDetailScreen';
import { MobileWeekNavigator } from './athlete-tracking/MobileWeekNavigator';
import type { SessionExerciseBlock } from '../models/training';
import type { SetLogInput } from '../modules/assignments/types';
import './AthleteTrainingView.css';
import './OlympicEnginePanel.css';
import './athlete-tracking/athlete-day-view.css';
import '../styles/interactive.css';

interface AthleteTrainingViewProps {
  language: 'ES' | 'EN';
}

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
    setLogTrackingKey,
    motorExercises,
    wlAthletes,
    planChangeNotifications,
    markPlanChangeNotificationRead,
  } = useWolfAssign();

  const exName = useCallback(
    (id: string) => motorExercises.find((e) => e.id === id)?.name ?? id,
    [motorExercises],
  );

  const [week, setWeek] = useState(1);
  const [activeDay, setActiveDay] = useState(1);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
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

  const activeDayPlanNotice = useMemo(() => {
    if (!activeAssignment) return null;
    return (
      planChangeNotifications.find(
        (n) =>
          !n.readAt &&
          (n.assignmentId === activeAssignment.id ||
            n.athleteProfileId === activeAssignment.athleteProfileId) &&
          n.weekNumber === week &&
          n.dayNumber === activeDay,
      ) ?? null
    );
  }, [planChangeNotifications, activeAssignment, week, activeDay]);

  const t = useMemo(
    () => ({
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
      return { title: t.emptyTitle };
    }
    return {
      inlinePlan: true,
      titleContent: <div className="mobile-header-inline-slot">{planSelect}</div>,
      pinnedBelowHeader: weekNavigator ?? undefined,
    };
  }, [t.emptyTitle, myAssignments, activeAssignment, planSelect, weekNavigator]);
  useMobileTopBar(mobileTopBar);

  useEffect(() => {
    if (!program || !activeAssignment || exerciseDetailIndex != null) return;
    for (const w of program.weeks) {
      for (const d of w.days) {
        if (!isDayDone(w.weekNumber, d.dayNumber, d.session.exercises)) {
          setWeek(w.weekNumber);
          setActiveDay(d.dayNumber);
          return;
        }
      }
    }
  }, [program, activeAssignment, isDayDone, exerciseDetailIndex]);

  useEffect(() => {
    setWeek(1);
    setActiveDay(1);
    setExerciseDetailIndex(null);
  }, [activeAssignment?.id]);

  useEffect(() => {
    if (exerciseDetailIndex != null) return;
    if (firstIncompleteDayNumber != null) {
      setActiveDay(firstIncompleteDayNumber);
    } else if (weekData?.days[0]) {
      setActiveDay(weekData.days[0].dayNumber);
    }
  }, [week, weekData?.days, firstIncompleteDayNumber, exerciseDetailIndex]);

  const isSetAddressedForExercise = useCallback(
    (exerciseIndex: number, schemeIndex: number, setInstance: number) => {
      if (!activeAssignment || !weekData || !activeDayData) return false;
      const block = activeDayData.session.exercises[exerciseIndex];
      if (!block) return false;
      const row = flattenBlockSets(block, athleteProfile, motorExercises, exName).find(
        (r) => r.schemeIndex === schemeIndex && r.setInstance === setInstance,
      );
      if (!row) return false;
      const log = getSetLog(
        activeAssignment.id,
        weekData.weekNumber,
        activeDayData.dayNumber,
        exerciseIndex,
        schemeIndex,
        setInstance,
      );
      return isSetAddressed(row, log);
    },
    [activeAssignment, weekData, activeDayData, athleteProfile, motorExercises, exName, getSetLog],
  );

  const nextIncompleteExerciseIndex = useMemo(() => {
    if (!activeDayData || exerciseDetailIndex == null) return null;
    for (let i = exerciseDetailIndex + 1; i < activeDayData.session.exercises.length; i += 1) {
      const block = activeDayData.session.exercises[i];
      if (!block) continue;
      const rows = flattenBlockSets(block, athleteProfile, motorExercises, exName);
      const allAddressed = rows.every((row) =>
        isSetAddressedForExercise(i, row.schemeIndex, row.setInstance),
      );
      if (!allAddressed) return i;
    }
    return null;
  }, [
    activeDayData,
    exerciseDetailIndex,
    athleteProfile,
    motorExercises,
    exName,
    isSetAddressedForExercise,
  ]);

  const persistSetLog = useCallback(
    (payload: SetLogInput) => {
      if (!activeAssignment || !weekData || !activeDayData || exerciseDetailIndex == null) return;
      updateSetLog({
        ...payload,
        assignmentId: activeAssignment.id,
        weekNumber: weekData.weekNumber,
        dayNumber: activeDayData.dayNumber,
        exerciseIndex: exerciseDetailIndex,
      });
    },
    [activeAssignment, weekData, activeDayData, exerciseDetailIndex, updateSetLog],
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

      <AnimatePresence initial={false}>
        {activeDayPlanNotice ? (
          <motion.div
            key={activeDayPlanNotice.id}
            className="wolf-plan-change-banner"
            role="status"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="wolf-plan-change-banner__text">
              {isEs ? activeDayPlanNotice.messageEs : activeDayPlanNotice.messageEn}
            </p>
            <button
              type="button"
              className="wolf-plan-change-banner__btn"
              onClick={() => void markPlanChangeNotificationRead(activeDayPlanNotice.id)}
            >
              {isEs ? 'Entendido' : 'Got it'}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
        athlete={athleteProfile}
        exercises={motorExercises}
        exName={exName}
        isEs={isEs}
        completions={completions}
        setLogs={setLogs}
        onOpenExercise={setExerciseDetailIndex}
      />

      {detailBlock && exerciseDetailIndex != null ? (
        <AthleteExerciseDetailScreen
          open
          block={detailBlock}
          athlete={athleteProfile}
          exercises={motorExercises}
          exName={exName}
          isEs={isEs}
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
          onGoToNextExercise={
            nextIncompleteExerciseIndex != null
              ? () => setExerciseDetailIndex(nextIncompleteExerciseIndex)
              : undefined
          }
          getSetTrackingKey={(schemeIndex, setInstance) =>
            setLogTrackingKey({
              assignmentId: activeAssignment.id,
              weekNumber: weekData.weekNumber,
              dayNumber: activeDayData.dayNumber,
              exerciseIndex: exerciseDetailIndex,
              schemeIndex,
              setInstance,
            })
          }
          onSaveSet={(schemeIndex, setInstance, payload) => {
            persistSetLog({
              assignmentId: activeAssignment.id,
              weekNumber: weekData.weekNumber,
              dayNumber: activeDayData.dayNumber,
              exerciseIndex: exerciseDetailIndex,
              schemeIndex,
              setInstance,
              ...payload,
            });
          }}
          onClearSet={(schemeIndex, setInstance) => {
            if (
              isSetComplete(
                activeAssignment.id,
                weekData.weekNumber,
                activeDayData.dayNumber,
                exerciseDetailIndex,
                schemeIndex,
                setInstance,
              )
            ) {
              toggleSetComplete({
                assignmentId: activeAssignment.id,
                weekNumber: weekData.weekNumber,
                dayNumber: activeDayData.dayNumber,
                exerciseIndex: exerciseDetailIndex,
                schemeIndex,
                setInstance,
              });
            }
          }}
        />
      ) : null}
    </div>
  );
};

export default AthleteTrainingView;
