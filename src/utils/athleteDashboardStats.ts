import type { IntakeData, Athlete as AppAthlete } from '../context/AppContext';
import type {
  Athlete,
  Exercise,
  GeneratedProgram,
  ProgramAssignment,
  SessionCompletion,
  SetCompletionLog,
} from '../models/training';
import {
  countCompletedDaysWithSets,
  countCompletedExercisesWithSets,
  countProgramExercises,
  isDayCompleteWithSets,
} from './completionHelpers';
import { countBlockSetsDone } from './athleteSetLogs';
import {
  countPrsFromIntakesThisWeek,
  isIsoDateInWeek,
  volumeSparklineFromIntakes,
  wlLastCompletionDate,
  wlSlots,
  type VolumeSparkBar,
} from './dashboardStats';
import { intakesForWlProfile, latestIntakeForWlProfile, mergeAthleteWithLatestIntake, parseIntakeDeadlift } from './wlStatsBridge';

export type AthleteProgramSnapshot = {
  assignmentId: string;
  programName: string;
  assignedAt: string;
  coachProgramId?: string;
  weeksTotal: number;
  daysTotal: number;
  daysDone: number;
  exercisesTotal: number;
  exercisesDone: number;
  completionPct: number;
  setsLogged: number;
  setsTotal: number;
  setsPct: number;
  volumeLoggedKg: number;
  lastActivityAt: string | null;
  sessionsThisWeek: number;
};

export type AthleteRecentActivity = {
  id: string;
  at: string;
  programName: string;
  label: string;
  kind: 'session' | 'set';
};

export type AthleteNextSession = {
  assignmentId: string;
  programName: string;
  weekNumber: number;
  dayNumber: number;
  dayLabel?: string;
};

export type AthleteDashboardModel = {
  displayName: string;
  level: Athlete['level'];
  bodyweight: number;
  readinessScore: number;
  fatigueScore: number;
  oneRM: Athlete['oneRM'];
  deadliftKg?: number;
  sinclair?: number;
  programs: AthleteProgramSnapshot[];
  activeProgram: AthleteProgramSnapshot | null;
  aggregate: {
    daysDone: number;
    daysTotal: number;
    daysPct: number;
    setsLogged: number;
    setsTotal: number;
    setsPct: number;
    volumeLoggedKg: number;
    sessionsThisWeek: number;
    exercisesDone: number;
    exercisesTotal: number;
  };
  prsThisWeek: number;
  intakesCount: number;
  volumeSpark: VolumeSparkBar[];
  recentActivity: AthleteRecentActivity[];
  nextSession: AthleteNextSession | null;
  streakDays: number;
  lastTrainingAt: string | null;
  hasLinkedProfile: boolean;
};

function isoDayKey(iso: string): string {
  return iso.slice(0, 10);
}


function countLoggedSetsForAssignment(
  assignmentId: string,
  program: GeneratedProgram,
  setLogs: SetCompletionLog[],
  athlete: Athlete | undefined,
  exercises: Exercise[],
  exName: (id: string) => string,
): { logged: number; total: number; volumeKg: number } {
  let logged = 0;
  let total = 0;
  let volumeKg = 0;
  for (const w of program.weeks) {
    for (const day of w.days) {
      for (let ei = 0; ei < day.session.exercises.length; ei += 1) {
        const block = day.session.exercises[ei]!;
        const counts = countBlockSetsDone(
          block,
          setLogs,
          assignmentId,
          w.weekNumber,
          day.dayNumber,
          ei,
          athlete,
          exercises,
          exName,
        );
        logged += counts.done;
        total += counts.total;
      }
    }
  }
  for (const log of setLogs) {
    if (log.assignmentId !== assignmentId) continue;
    const kg = log.actualKg ?? 0;
    const reps = log.actualReps ?? 0;
    if (kg > 0 && reps > 0) volumeKg += kg * reps;
  }
  return { logged, total, volumeKg: Math.round(volumeKg) };
}

function sessionsDoneThisWeek(
  assignmentId: string,
  completions: SessionCompletion[],
  setLogs: SetCompletionLog[],
  ref: Date,
): number {
  const days = new Set<string>();
  for (const c of completions) {
    if (c.assignmentId !== assignmentId) continue;
    if (!isIsoDateInWeek(c.completedAt.slice(0, 10), ref)) continue;
    days.add(`${c.weekNumber}-${c.dayNumber}`);
  }
  for (const l of setLogs) {
    if (l.assignmentId !== assignmentId) continue;
    if (!isIsoDateInWeek(l.completedAt.slice(0, 10), ref)) continue;
    days.add(`${l.weekNumber}-${l.dayNumber}`);
  }
  return days.size;
}

function computeSinclair(total: number, bodyweight: number): number | undefined {
  if (total <= 0 || bodyweight <= 0) return undefined;
  const b = bodyweight;
  const coeff =
    b < 56
      ? 10 ** (0.75194503 * Math.log10(b / 56) ** 2)
      : 10 ** (0.7880044 * Math.log10(b / 75) ** 2);
  return Math.round(total * coeff);
}

function buildProgramSnapshot(
  assignment: ProgramAssignment,
  completions: SessionCompletion[],
  setLogs: SetCompletionLog[],
  athlete: Athlete | undefined,
  exercises: Exercise[],
  exName: (id: string) => string,
  ref: Date,
): AthleteProgramSnapshot {
  const { program } = assignment;
  const daysTotal = wlSlots(program);
  const daysDone = countCompletedDaysWithSets(
    completions,
    setLogs,
    assignment.id,
    program,
    athlete,
    exercises,
    exName,
  );
  const exercisesTotal = countProgramExercises(program);
  const exercisesDone = countCompletedExercisesWithSets(
    completions,
    setLogs,
    assignment.id,
    program,
    athlete,
    exercises,
    exName,
  );
  const setCounts = countLoggedSetsForAssignment(
    assignment.id,
    program,
    setLogs,
    athlete,
    exercises,
    exName,
  );
  const completionPct = daysTotal > 0 ? Math.min(100, Math.round((daysDone / daysTotal) * 100)) : 0;
  const setsPct =
    setCounts.total > 0 ? Math.min(100, Math.round((setCounts.logged / setCounts.total) * 100)) : 0;

  return {
    assignmentId: assignment.id,
    programName: program.name,
    assignedAt: assignment.assignedAt.slice(0, 10),
    coachProgramId: assignment.coachProgramId,
    weeksTotal: program.weeks.length,
    daysTotal,
    daysDone,
    exercisesTotal,
    exercisesDone,
    completionPct,
    setsLogged: setCounts.logged,
    setsTotal: setCounts.total,
    setsPct,
    volumeLoggedKg: setCounts.volumeKg,
    lastActivityAt: wlLastCompletionDate(assignment.id, completions) ?? latestSetLogDate(assignment.id, setLogs),
    sessionsThisWeek: sessionsDoneThisWeek(assignment.id, completions, setLogs, ref),
  };
}

function latestSetLogDate(assignmentId: string, setLogs: SetCompletionLog[]): string | null {
  const mine = setLogs
    .filter((l) => l.assignmentId === assignmentId)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  return mine[0]?.completedAt ?? null;
}

function findNextSession(
  assignments: ProgramAssignment[],
  completions: SessionCompletion[],
  setLogs: SetCompletionLog[],
  athlete: Athlete | undefined,
  exercises: Exercise[],
  exName: (id: string) => string,
): AthleteNextSession | null {
  for (const assignment of assignments) {
    for (const w of assignment.program.weeks) {
      for (const day of w.days) {
        const done = isDayCompleteWithSets(
          completions,
          setLogs,
          assignment.id,
          w.weekNumber,
          day.dayNumber,
          day.session.exercises,
          athlete,
          exercises,
          exName,
        );
        if (!done) {
          return {
            assignmentId: assignment.id,
            programName: assignment.program.name,
            weekNumber: w.weekNumber,
            dayNumber: day.dayNumber,
            dayLabel: day.label,
          };
        }
      }
    }
  }
  return null;
}

function buildRecentActivity(
  assignments: ProgramAssignment[],
  completions: SessionCompletion[],
  setLogs: SetCompletionLog[],
  isEs: boolean,
  limit = 12,
): AthleteRecentActivity[] {
  const nameById = Object.fromEntries(assignments.map((a) => [a.id, a.program.name] as const));
  const items: AthleteRecentActivity[] = [];

  for (const c of completions) {
    if (c.exerciseIndex != null) continue;
    items.push({
      id: `c-${c.assignmentId}-${c.weekNumber}-${c.dayNumber}-${c.completedAt}`,
      at: c.completedAt,
      programName: nameById[c.assignmentId] ?? '—',
      label: isEs
        ? `Sesión S${c.weekNumber} · D${c.dayNumber}`
        : `Session W${c.weekNumber} · D${c.dayNumber}`,
      kind: 'session',
    });
  }

  const setByDay = new Map<string, SetCompletionLog>();
  for (const l of setLogs) {
    const key = `${l.assignmentId}-${l.weekNumber}-${l.dayNumber}-${l.completedAt.slice(0, 10)}`;
    const prev = setByDay.get(key);
    if (!prev || new Date(l.completedAt).getTime() > new Date(prev.completedAt).getTime()) {
      setByDay.set(key, l);
    }
  }
  for (const l of setByDay.values()) {
    items.push({
      id: `l-${l.assignmentId}-${l.weekNumber}-${l.dayNumber}-${l.completedAt}`,
      at: l.completedAt,
      programName: nameById[l.assignmentId] ?? '—',
      label: isEs
        ? `Registro S${l.weekNumber} · D${l.dayNumber}`
        : `Log W${l.weekNumber} · D${l.dayNumber}`,
      kind: 'set',
    });
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

function computeStreakDays(completions: SessionCompletion[], setLogs: SetCompletionLog[]): number {
  const activeDays = new Set<string>();
  for (const c of completions) {
    activeDays.add(isoDayKey(c.completedAt));
  }
  for (const l of setLogs) {
    activeDays.add(isoDayKey(l.completedAt));
  }
  if (activeDays.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  for (let i = 0; i < 120; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (activeDays.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function lastTrainingTimestamp(completions: SessionCompletion[], setLogs: SetCompletionLog[]): string | null {
  const times = [
    ...completions.map((c) => c.completedAt),
    ...setLogs.map((l) => l.completedAt),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return times[0] ?? null;
}

export function buildAthleteDashboardModel(input: {
  linkedProfileId?: string;
  displayName: string;
  assignments: ProgramAssignment[];
  completions: SessionCompletion[];
  setLogs: SetCompletionLog[];
  wlAthletes: Athlete[];
  motorExercises: Exercise[];
  intakes: IntakeData[];
  appAthletes: AppAthlete[];
  exName: (id: string) => string;
  isEs: boolean;
  ref?: Date;
}): AthleteDashboardModel {
  const {
    linkedProfileId,
    displayName,
    assignments,
    completions,
    setLogs,
    wlAthletes,
    motorExercises,
    intakes,
    appAthletes,
    exName,
    isEs,
    ref = new Date(),
  } = input;

  const profileId = linkedProfileId ?? assignments[0]?.athleteProfileId;
  const baseProfile = profileId ? wlAthletes.find((a) => a.id === profileId) : undefined;
  const intakeList = profileId ? intakesForWlProfile(profileId, intakes, baseProfile?.name, appAthletes) : [];
  const latestIntake = profileId ? latestIntakeForWlProfile(profileId, intakes, baseProfile?.name, appAthletes) : null;
  const athlete = baseProfile ? mergeAthleteWithLatestIntake(baseProfile, latestIntake) : undefined;

  const scopedCompletions = assignments.length
    ? completions.filter((c) => assignments.some((a) => a.id === c.assignmentId))
    : [];
  const scopedLogs = assignments.length
    ? setLogs.filter((l) => assignments.some((a) => a.id === l.assignmentId))
    : [];

  const programs = assignments.map((a) =>
    buildProgramSnapshot(a, scopedCompletions, scopedLogs, athlete, motorExercises, exName, ref),
  );

  const aggregate = programs.reduce(
    (acc, p) => ({
      daysDone: acc.daysDone + p.daysDone,
      daysTotal: acc.daysTotal + p.daysTotal,
      setsLogged: acc.setsLogged + p.setsLogged,
      setsTotal: acc.setsTotal + p.setsTotal,
      volumeLoggedKg: acc.volumeLoggedKg + p.volumeLoggedKg,
      sessionsThisWeek: acc.sessionsThisWeek + p.sessionsThisWeek,
      exercisesDone: acc.exercisesDone + p.exercisesDone,
      exercisesTotal: acc.exercisesTotal + p.exercisesTotal,
    }),
    {
      daysDone: 0,
      daysTotal: 0,
      setsLogged: 0,
      setsTotal: 0,
      volumeLoggedKg: 0,
      sessionsThisWeek: 0,
      exercisesDone: 0,
      exercisesTotal: 0,
    },
  );

  const daysPct =
    aggregate.daysTotal > 0 ? Math.min(100, Math.round((aggregate.daysDone / aggregate.daysTotal) * 100)) : 0;
  const setsPct =
    aggregate.setsTotal > 0 ? Math.min(100, Math.round((aggregate.setsLogged / aggregate.setsTotal) * 100)) : 0;

  const totalLift = athlete ? athlete.oneRM.snatch + athlete.oneRM.cleanJerk : 0;
  const sinclair = athlete ? computeSinclair(totalLift, athlete.bodyweight) : undefined;

  const activeProgram =
    programs.find((p) => p.daysDone < p.daysTotal) ?? programs[0] ?? null;

  return {
    displayName: athlete?.name ?? displayName,
    level: athlete?.level ?? 'intermediate',
    bodyweight: athlete?.bodyweight ?? 0,
    readinessScore: athlete?.readinessScore ?? 0,
    fatigueScore: athlete?.fatigueScore ?? 0,
    oneRM: athlete?.oneRM ?? { snatch: 0, cleanJerk: 0, backSquat: 0, frontSquat: 0 },
    deadliftKg: parseIntakeDeadlift(latestIntake) ?? undefined,
    sinclair,
    programs,
    activeProgram,
    aggregate: { ...aggregate, daysPct, setsPct },
    prsThisWeek: countPrsFromIntakesThisWeek(intakeList, ref),
    intakesCount: intakeList.length,
    volumeSpark: volumeSparklineFromIntakes(intakeList, 8),
    recentActivity: buildRecentActivity(assignments, scopedCompletions, scopedLogs, isEs),
    nextSession: findNextSession(assignments, scopedCompletions, scopedLogs, athlete, motorExercises, exName),
    streakDays: computeStreakDays(scopedCompletions, scopedLogs),
    lastTrainingAt: lastTrainingTimestamp(scopedCompletions, scopedLogs),
    hasLinkedProfile: Boolean(profileId && baseProfile),
  };
}
