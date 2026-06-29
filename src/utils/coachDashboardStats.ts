import type { Athlete as AppAthlete, IntakeData } from '../context/AppContext';
import type {
  Athlete,
  Exercise,
  ProgramAssignment,
  SessionCompletion,
  SetCompletionLog,
} from '../models/training';
import { purposeForScheme, type SetPurpose } from '../components/session-editor/spreadsheetPurposeUtils';
import { countCompletedDaysWithSets, countCompletedDays, isDayCompleteWithSets } from './completionHelpers';
import {
  type DashboardAlert,
  isIsoDateInWeek,
  wlAssignmentStatus,
  wlLastCompletionDate,
  wlSlots,
} from './dashboardStats';
export type CoachDashboardScope = 'today' | 'week' | 'month';

export type CoachWeeklyLoadDay = {
  dayNumber: number;
  label: string;
  tonnage: number;
};

export type CoachStimulusSlice = {
  key: SetPurpose;
  label: string;
  tonnage: number;
  pct: number;
};

export type CoachAthleteStatusRow = {
  assignmentId: string;
  athleteProfileId: string;
  athleteName: string;
  programName: string;
  weekLabel: string;
  completionPct: number;
  status: 'good' | 'adapting' | 'review' | 'complete';
  statusLabel: string;
};

export type CoachActiveProgramRow = {
  programName: string;
  weekLabel: string;
  completionPct: number;
  athleteCount: number;
};

export type CoachRecentActivityItem = {
  id: string;
  at: string;
  athleteName: string;
  label: string;
  kind: 'session' | 'pr' | 'stats';
};

export type CoachDashboardKpis = {
  athletes: number;
  athletesActiveDelta: number | null;
  activePrograms: number;
  sessionsInScope: number;
  sessionsDelta: number | null;
  alertsCount: number;
};

export type CoachDashboardModel = {
  scope: CoachDashboardScope;
  ref: Date;
  periodLabel: string;
  kpis: CoachDashboardKpis;
  weeklyLoad: CoachWeeklyLoadDay[];
  weeklyLoadTotalKg: number;
  weeklyLoadTrendPct: number | null;
  stimulusSlices: CoachStimulusSlice[];
  athleteRows: CoachAthleteStatusRow[];
  activePrograms: CoachActiveProgramRow[];
  recentActivity: CoachRecentActivityItem[];
  alerts: DashboardAlert[];
};

const LIFT_KEYS = ['snatch', 'cleanJerk', 'deadlift', 'backSquat', 'frontSquat'] as const;

const LIFT_LABELS_ES: Record<(typeof LIFT_KEYS)[number], string> = {
  snatch: 'Snatch',
  cleanJerk: 'C&J',
  deadlift: 'Peso muerto',
  backSquat: 'Back squat',
  frontSquat: 'Front squat',
};

const LIFT_LABELS_EN: Record<(typeof LIFT_KEYS)[number], string> = {
  snatch: 'Snatch',
  cleanJerk: 'C&J',
  deadlift: 'Deadlift',
  backSquat: 'Back squat',
  frontSquat: 'Front squat',
};

function mondayStart(ref: Date): Date {
  const d = new Date(ref);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoToday(ref: Date): string {
  return ref.toISOString().slice(0, 10);
}

function isIsoDateToday(isoDate: string, ref: Date): boolean {
  return isoDate === isoToday(ref);
}

function isIsoDateInMonth(isoDate: string, ref: Date): boolean {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function periodPredicate(scope: CoachDashboardScope, ref: Date): (iso: string) => boolean {
  if (scope === 'today') return (iso) => isIsoDateToday(iso, ref);
  if (scope === 'week') return (iso) => isIsoDateInWeek(iso, ref);
  return (iso) => isIsoDateInMonth(iso, ref);
}

function previousRef(scope: CoachDashboardScope, ref: Date): Date {
  const d = new Date(ref);
  if (scope === 'today') {
    d.setDate(d.getDate() - 1);
    return d;
  }
  if (scope === 'week') {
    d.setDate(d.getDate() - 7);
    return d;
  }
  d.setMonth(d.getMonth() - 1);
  return d;
}

function formatPeriodLabel(scope: CoachDashboardScope, ref: Date, isEs: boolean): string {
  const loc = isEs ? 'es' : 'en';
  if (scope === 'today') {
    return ref.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (scope === 'week') {
    const start = mondayStart(ref);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString(loc, opts)} – ${end.toLocaleDateString(loc, { ...opts, year: 'numeric' })}`;
  }
  return ref.toLocaleDateString(loc, { month: 'long', year: 'numeric' });
}

function dayLabels(isEs: boolean): string[] {
  return isEs
    ? ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
    : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
}

function stimulusLabel(key: SetPurpose, isEs: boolean): string {
  if (isEs) {
    if (key === 'technique') return 'Técnica';
    if (key === 'work') return 'Fuerza';
    return 'Potencia';
  }
  if (key === 'technique') return 'Technique';
  if (key === 'work') return 'Strength';
  return 'Power';
}

function countSessionsInPeriod(
  assignmentIds: Set<string>,
  completions: SessionCompletion[],
  setLogs: SetCompletionLog[],
  inPeriod: (iso: string) => boolean,
): number {
  const days = new Set<string>();
  for (const c of completions) {
    if (!assignmentIds.has(c.assignmentId)) continue;
    if (c.exerciseIndex != null) continue;
    const iso = c.completedAt.slice(0, 10);
    if (!inPeriod(iso)) continue;
    days.add(`${c.assignmentId}-${c.weekNumber}-${c.dayNumber}`);
  }
  for (const l of setLogs) {
    if (!assignmentIds.has(l.assignmentId)) continue;
    const iso = l.completedAt.slice(0, 10);
    if (!inPeriod(iso)) continue;
    days.add(`${l.assignmentId}-${l.weekNumber}-${l.dayNumber}`);
  }
  return days.size;
}

function countAthletesActiveInPeriod(
  assignments: ProgramAssignment[],
  completions: SessionCompletion[],
  setLogs: SetCompletionLog[],
  inPeriod: (iso: string) => boolean,
): number {
  const activeProfiles = new Set<string>();
  const byId = Object.fromEntries(assignments.map((a) => [a.id, a] as const));
  for (const c of completions) {
    const iso = c.completedAt.slice(0, 10);
    if (!inPeriod(iso)) continue;
    const a = byId[c.assignmentId];
    if (a) activeProfiles.add(a.athleteProfileId);
  }
  for (const l of setLogs) {
    const iso = l.completedAt.slice(0, 10);
    if (!inPeriod(iso)) continue;
    const a = byId[l.assignmentId];
    if (a) activeProfiles.add(a.athleteProfileId);
  }
  return activeProfiles.size;
}

function volumeFromLog(log: SetCompletionLog): number {
  const kg = log.actualKg ?? 0;
  const reps = log.actualReps ?? 0;
  return kg > 0 && reps > 0 ? kg * reps : 0;
}

function aggregateWeeklyLoad(
  assignments: ProgramAssignment[],
  setLogs: SetCompletionLog[],
  scope: CoachDashboardScope,
  ref: Date,
  isEs: boolean,
): { days: CoachWeeklyLoadDay[]; totalKg: number } {
  const assignmentIds = new Set(assignments.map((a) => a.id));
  const labels = dayLabels(isEs);

  if (scope === 'week') {
    const tonnageByDow = [0, 0, 0, 0, 0, 0, 0];
    for (const log of setLogs) {
      if (!assignmentIds.has(log.assignmentId)) continue;
      const iso = log.completedAt.slice(0, 10);
      if (!isIsoDateInWeek(iso, ref)) continue;
      const vol = volumeFromLog(log);
      if (vol <= 0) continue;
      const d = new Date(`${iso}T12:00:00`);
      let dow = d.getDay();
      dow = dow === 0 ? 6 : dow - 1;
      tonnageByDow[dow] += vol;
    }
    const days = tonnageByDow.map((tonnage, i) => ({
      dayNumber: i + 1,
      label: labels[i]!,
      tonnage: Math.round(tonnage),
    }));
    const totalKg = days.reduce((sum, d) => sum + d.tonnage, 0);
    return { days, totalKg };
  }

  if (scope === 'today') {
    let total = 0;
    for (const log of setLogs) {
      if (!assignmentIds.has(log.assignmentId)) continue;
      if (!isIsoDateToday(log.completedAt.slice(0, 10), ref)) continue;
      total += volumeFromLog(log);
    }
    return {
      days: [{ dayNumber: 1, label: isEs ? 'HOY' : 'TODAY', tonnage: Math.round(total) }],
      totalKg: Math.round(total),
    };
  }

  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const weekBuckets: { label: string; tonnage: number }[] = [];
  let cursor = mondayStart(start);
  let bucketIndex = 1;
  while (cursor <= end) {
    weekBuckets.push({ label: isEs ? `S${bucketIndex}` : `W${bucketIndex}`, tonnage: 0 });
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
    bucketIndex += 1;
  }
  if (weekBuckets.length === 0) weekBuckets.push({ label: isEs ? 'S1' : 'W1', tonnage: 0 });

  for (const log of setLogs) {
    if (!assignmentIds.has(log.assignmentId)) continue;
    const iso = log.completedAt.slice(0, 10);
    if (!isIsoDateInMonth(iso, ref)) continue;
    const vol = volumeFromLog(log);
    if (vol <= 0) continue;
    const logDate = new Date(`${iso}T12:00:00`);
    const monthStart = mondayStart(start);
    const diffDays = Math.floor((logDate.getTime() - monthStart.getTime()) / 86400000);
    const idx = Math.min(weekBuckets.length - 1, Math.max(0, Math.floor(diffDays / 7)));
    weekBuckets[idx]!.tonnage += vol;
  }

  const days = weekBuckets.map((bucket, i) => ({
    dayNumber: i + 1,
    label: bucket.label,
    tonnage: Math.round(bucket.tonnage),
  }));
  const totalKg = days.reduce((sum, d) => sum + d.tonnage, 0);
  return { days, totalKg };
}

function aggregateStimulus(
  assignments: ProgramAssignment[],
  setLogs: SetCompletionLog[],
  inPeriod: (iso: string) => boolean,
): Record<SetPurpose, number> {
  const tonnage: Record<SetPurpose, number> = { technique: 0, work: 0, intensity: 0 };
  const assignmentById = Object.fromEntries(assignments.map((a) => [a.id, a] as const));

  for (const log of setLogs) {
    const iso = log.completedAt.slice(0, 10);
    if (!inPeriod(iso)) continue;
    const assignment = assignmentById[log.assignmentId];
    if (!assignment) continue;
    const vol = volumeFromLog(log);
    if (vol <= 0) continue;

    const week = assignment.program.weeks.find((w) => w.weekNumber === log.weekNumber);
    const day = week?.days.find((d) => d.dayNumber === log.dayNumber);
    const block = day?.session.exercises[log.exerciseIndex];
    const scheme = block?.sets[log.schemeIndex];
    const purpose = scheme ? purposeForScheme(scheme) : 'work';
    tonnage[purpose] += vol;
  }

  return {
    technique: Math.round(tonnage.technique),
    work: Math.round(tonnage.work),
    intensity: Math.round(tonnage.intensity),
  };
}

function findCurrentWeek(
  assignment: ProgramAssignment,
  completions: SessionCompletion[],
  setLogs: SetCompletionLog[],
  athlete: Athlete | undefined,
  exercises: Exercise[],
  exName: (id: string) => string,
): number {
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
      if (!done) return w.weekNumber;
    }
  }
  return assignment.program.weeks.length || 1;
}

function athleteStatusForAssignment(
  assignment: ProgramAssignment,
  completions: SessionCompletion[],
  isEs: boolean,
): { status: CoachAthleteStatusRow['status']; statusLabel: string } {
  const status = wlAssignmentStatus(assignment, completions);
  const lastAt = wlLastCompletionDate(assignment.id, completions);
  const ageDays = lastAt ? (Date.now() - new Date(lastAt).getTime()) / 86400000 : Infinity;

  if (status === 'complete') {
    return { status: 'complete', statusLabel: isEs ? 'Completado' : 'Complete' };
  }
  if (status === 'idle' || ageDays > 10) {
    return { status: 'review', statusLabel: isEs ? 'Revisar' : 'Review' };
  }
  const slots = wlSlots(assignment.program);
  const done = countCompletedDays(completions, assignment.id, assignment.program);
  const pct = slots > 0 ? (done / slots) * 100 : 0;
  if (pct < 40) {
    return { status: 'adapting', statusLabel: isEs ? 'Adaptando' : 'Adapting' };
  }
  return { status: 'good', statusLabel: isEs ? 'Bien' : 'On track' };
}

function buildAthleteRows(
  assignments: ProgramAssignment[],
  completions: SessionCompletion[],
  setLogs: SetCompletionLog[],
  nameByProfileId: Record<string, string>,
  exercises: Exercise[],
  exName: (id: string) => string,
  wlAthletes: Athlete[],
  isEs: boolean,
): CoachAthleteStatusRow[] {
  return assignments.map((assignment) => {
    const profile = wlAthletes.find((a) => a.id === assignment.athleteProfileId);
    const weeksTotal = assignment.program.weeks.length || 1;
    const currentWeek = findCurrentWeek(assignment, completions, setLogs, profile, exercises, exName);
    const slots = wlSlots(assignment.program);
    const done = countCompletedDaysWithSets(
      completions,
      setLogs,
      assignment.id,
      assignment.program,
      profile,
      exercises,
      exName,
    );
    const completionPct = slots > 0 ? Math.min(100, Math.round((done / slots) * 100)) : 0;
    const { status, statusLabel } = athleteStatusForAssignment(assignment, completions, isEs);

    return {
      assignmentId: assignment.id,
      athleteProfileId: assignment.athleteProfileId,
      athleteName: nameByProfileId[assignment.athleteProfileId] ?? assignment.athleteProfileId,
      programName: assignment.program.name,
      weekLabel: isEs ? `Semana ${currentWeek}/${weeksTotal}` : `Week ${currentWeek}/${weeksTotal}`,
      completionPct,
      status,
      statusLabel,
    };
  });
}

function buildActivePrograms(rows: CoachAthleteStatusRow[]): CoachActiveProgramRow[] {
  const byName = new Map<string, { completionSum: number; weekLabels: string[]; count: number }>();
  for (const row of rows) {
    const prev = byName.get(row.programName) ?? { completionSum: 0, weekLabels: [], count: 0 };
    prev.completionSum += row.completionPct;
    prev.weekLabels.push(row.weekLabel);
    prev.count += 1;
    byName.set(row.programName, prev);
  }
  return [...byName.entries()]
    .map(([programName, data]) => ({
      programName,
      weekLabel: data.weekLabels[0] ?? '—',
      completionPct: Math.round(data.completionSum / Math.max(1, data.count)),
      athleteCount: data.count,
    }))
    .sort((a, b) => b.athleteCount - a.athleteCount);
}

function detectRecentPrs(
  intakes: IntakeData[],
  appAthletes: AppAthlete[],
  isEs: boolean,
  limit: number,
): CoachRecentActivityItem[] {
  const items: CoachRecentActivityItem[] = [];
  const labels = isEs ? LIFT_LABELS_ES : LIFT_LABELS_EN;
  const byAthlete = new Map<number, IntakeData[]>();
  for (const intake of intakes) {
    if (intake.athleteId == null) continue;
    const arr = byAthlete.get(intake.athleteId) ?? [];
    arr.push(intake);
    byAthlete.set(intake.athleteId, arr);
  }

  for (const [athleteId, list] of byAthlete) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date) || Number(a.id) - Number(b.id));
    const athleteName = appAthletes.find((a) => a.id === athleteId)?.name ?? `#${athleteId}`;
    for (let idx = 1; idx < sorted.length; idx += 1) {
      const cur = sorted[idx]!;
      const prev = sorted[idx - 1]!;
      for (const key of LIFT_KEYS) {
        const n = parseFloat(String(cur.responses[key]).replace(',', '.')) || 0;
        const o = parseFloat(String(prev.responses[key]).replace(',', '.')) || 0;
        if (n > o && n > 0) {
          items.push({
            id: `pr-${cur.id}-${key}`,
            at: `${cur.date}T12:00:00`,
            athleteName,
            label: isEs
              ? `Nuevo PR en ${labels[key]} (${n} kg)`
              : `New PR in ${labels[key]} (${n} kg)`,
            kind: 'pr',
          });
        }
      }
    }
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}

function buildRecentActivity(
  assignments: ProgramAssignment[],
  completions: SessionCompletion[],
  setLogs: SetCompletionLog[],
  intakes: IntakeData[],
  appAthletes: AppAthlete[],
  nameByProfileId: Record<string, string>,
  isEs: boolean,
  limit = 10,
): CoachRecentActivityItem[] {
  const profileByAssignment = Object.fromEntries(
    assignments.map((a) => [a.id, a.athleteProfileId] as const),
  );
  const programByAssignment = Object.fromEntries(
    assignments.map((a) => [a.id, a.program.name] as const),
  );
  const items: CoachRecentActivityItem[] = [];

  for (const c of completions) {
    if (c.exerciseIndex != null) continue;
    const profileId = profileByAssignment[c.assignmentId];
    if (!profileId) continue;
    const athleteName = nameByProfileId[profileId] ?? profileId;
    const programName = programByAssignment[c.assignmentId] ?? '—';
    items.push({
      id: `c-${c.assignmentId}-${c.weekNumber}-${c.dayNumber}-${c.completedAt}`,
      at: c.completedAt,
      athleteName,
      label: isEs
        ? `completó D${c.dayNumber} — ${programName}`
        : `completed D${c.dayNumber} — ${programName}`,
      kind: 'session',
    });
  }

  const seenDays = new Set<string>();
  for (const l of setLogs) {
    const key = `${l.assignmentId}-${l.weekNumber}-${l.dayNumber}-${l.completedAt.slice(0, 10)}`;
    if (seenDays.has(key)) continue;
    if (items.some((i) => i.id.startsWith(`c-${l.assignmentId}-${l.weekNumber}-${l.dayNumber}`))) continue;
    seenDays.add(key);
    const profileId = profileByAssignment[l.assignmentId];
    if (!profileId) continue;
    items.push({
      id: `l-${key}`,
      at: l.completedAt,
      athleteName: nameByProfileId[profileId] ?? profileId,
      label: isEs
        ? `registró S${l.weekNumber} · D${l.dayNumber}`
        : `logged W${l.weekNumber} · D${l.dayNumber}`,
      kind: 'session',
    });
  }

  for (const intake of intakes) {
    if (!intake.athleteId) continue;
    const athleteName = appAthletes.find((a) => a.id === intake.athleteId)?.name ?? `#${intake.athleteId}`;
    items.push({
      id: `stats-${intake.id}`,
      at: `${intake.date}T18:00:00`,
      athleteName,
      label: isEs ? 'envió formulario Stats' : 'submitted Stats form',
      kind: 'stats',
    });
  }

  const prItems = detectRecentPrs(intakes, appAthletes, isEs, 6);
  return [...items, ...prItems]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

function trendPct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildCoachDashboardModel(input: {
  scope: CoachDashboardScope;
  ref?: Date;
  wlAssignments: ProgramAssignment[];
  completions: SessionCompletion[];
  setLogs: SetCompletionLog[];
  wlAthletes: Athlete[];
  motorExercises: Exercise[];
  intakes: IntakeData[];
  appAthletes: AppAthlete[];
  alerts: DashboardAlert[];
  isEs: boolean;
  exName?: (id: string) => string;
}): CoachDashboardModel {
  const {
    scope,
    ref = new Date(),
    wlAssignments,
    completions,
    setLogs,
    wlAthletes,
    motorExercises,
    intakes,
    appAthletes,
    alerts,
    isEs,
  } = input;
  const exName = input.exName ?? ((id: string) => motorExercises.find((e) => e.id === id)?.name ?? id);

  const nameByProfileId = Object.fromEntries(wlAthletes.map((a) => [a.id, a.name] as const));
  const assignmentIds = new Set(wlAssignments.map((a) => a.id));
  const inPeriod = periodPredicate(scope, ref);
  const prevInPeriod = periodPredicate(scope, previousRef(scope, ref));

  const sessionsInScope = countSessionsInPeriod(assignmentIds, completions, setLogs, inPeriod);
  const sessionsPrev = countSessionsInPeriod(assignmentIds, completions, setLogs, prevInPeriod);
  const athletesActive = countAthletesActiveInPeriod(wlAssignments, completions, setLogs, inPeriod);
  const athletesActivePrev = countAthletesActiveInPeriod(wlAssignments, completions, setLogs, prevInPeriod);

  const activeProgramStatuses = wlAssignments.filter(
    (a) => wlAssignmentStatus(a, completions) !== 'complete',
  );
  const activeProgramsCount = new Set(activeProgramStatuses.map((a) => a.program.name)).size;

  const { days: weeklyLoad, totalKg: weeklyLoadTotalKg } = aggregateWeeklyLoad(
    wlAssignments,
    setLogs,
    scope,
    ref,
    isEs,
  );
  const prevLoad = aggregateWeeklyLoad(wlAssignments, setLogs, scope, previousRef(scope, ref), isEs);

  const stimulusRaw = aggregateStimulus(wlAssignments, setLogs, inPeriod);
  const stimulusTotal = stimulusRaw.technique + stimulusRaw.work + stimulusRaw.intensity;
  const stimulusSlices: CoachStimulusSlice[] = (['technique', 'work', 'intensity'] as SetPurpose[])
    .map((key) => ({
      key,
      label: stimulusLabel(key, isEs),
      tonnage: stimulusRaw[key],
      pct: stimulusTotal > 0 ? Math.round((stimulusRaw[key] / stimulusTotal) * 100) : 0,
    }))
    .filter((slice) => slice.tonnage > 0);

  const athleteRows = buildAthleteRows(
    wlAssignments,
    completions,
    setLogs,
    nameByProfileId,
    motorExercises,
    exName,
    wlAthletes,
    isEs,
  );

  return {
    scope,
    ref,
    periodLabel: formatPeriodLabel(scope, ref, isEs),
    kpis: {
      athletes: wlAthletes.length,
      athletesActiveDelta:
        scope === 'week' ? athletesActive - athletesActivePrev : athletesActive > 0 ? athletesActive : null,
      activePrograms: activeProgramsCount || wlAssignments.length,
      sessionsInScope,
      sessionsDelta: sessionsInScope - sessionsPrev,
      alertsCount: alerts.length,
    },
    weeklyLoad,
    weeklyLoadTotalKg,
    weeklyLoadTrendPct: trendPct(weeklyLoadTotalKg, prevLoad.totalKg),
    stimulusSlices,
    athleteRows,
    activePrograms: buildActivePrograms(athleteRows),
    recentActivity: buildRecentActivity(
      wlAssignments,
      completions,
      setLogs,
      intakes,
      appAthletes,
      nameByProfileId,
      isEs,
    ),
    alerts,
  };
}
