import type { Athlete, Assignment, Program, Exercise, ExerciseSet, IntakeData } from '../context/AppContext';
import type { ProgramAssignment, SessionCompletion } from '../models/training';

const LIFT_KEYS = ['snatch', 'cleanJerk', 'deadlift', 'backSquat', 'frontSquat'] as const;

export type DashboardAlert = {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
  actionLabel: string;
  targetView: 'athletes' | 'wolf-engine' | 'onboarding' | 'my-wl-plan';
  athleteId?: number;
};

export type AppAssignmentRow = {
  athleteId: number;
  athleteName: string;
  programId: number;
  programName: string;
  startDate: string;
  hasPersonalizedCopy: boolean;
  completionPct: number;
  exercisesLogged: number;
  exerciseSlots: number;
};

export type WlAssignmentRow = {
  assignmentId: string;
  athleteProfileId: string;
  athleteName: string;
  programName: string;
  assignedAt: string;
  completionPct: number;
  sessionsDone: number;
  sessionSlots: number;
};

function mondayStart(ref: Date): Date {
  const d = new Date(ref);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isIsoDateInWeek(isoDate: string, ref: Date): boolean {
  const t = new Date(`${isoDate}T12:00:00`).getTime();
  const start = mondayStart(ref).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return t >= start && t < end;
}

export function countPrsFromIntakesThisWeek(intakes: IntakeData[], ref: Date): number {
  const byAthlete = new Map<number, IntakeData[]>();
  for (const i of intakes) {
    if (i.athleteId == null) continue;
    const arr = byAthlete.get(i.athleteId) ?? [];
    arr.push(i);
    byAthlete.set(i.athleteId, arr);
  }
  let prs = 0;
  for (const [, list] of byAthlete) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date) || (a.id as number) - (b.id as number));
    for (let idx = 0; idx < sorted.length; idx++) {
      const cur = sorted[idx];
      if (!isIsoDateInWeek(cur.date, ref)) continue;
      const prev = sorted[idx - 1];
      if (!prev) continue;
      for (const k of LIFT_KEYS) {
        const n = parseFloat(String(cur.responses[k]).replace(',', '.')) || 0;
        const o = parseFloat(String(prev.responses[k]).replace(',', '.')) || 0;
        if (n > o && n > 0) prs += 1;
      }
    }
  }
  return prs;
}

export function countIntakesSubmittedThisWeek(intakes: IntakeData[], ref: Date): number {
  return intakes.filter((i) => isIsoDateInWeek(i.date, ref)).length;
}

function slotDoneForExercise(ex: Exercise): { done: number; total: number } {
  if (ex.seriesRows?.length) {
    const total = ex.seriesRows.length;
    const done = ex.seriesRows.filter(
      (r: ExerciseSet) => !!(r.actualLoad?.trim() || r.actualReps?.trim() || r.completed),
    ).length;
    return { done, total };
  }
  const done =
    (ex.actualLoad?.trim() && ex.actualReps?.trim()) || (typeof ex.tonnage === 'number' && ex.tonnage > 0) ? 1 : 0;
  return { done, total: 1 };
}

export function countLoggedSlots(prog: Program): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const w of prog.weeks) {
    for (const d of w.days) {
      for (const ex of d.exercises) {
        const s = slotDoneForExercise(ex);
        done += s.done;
        total += s.total;
      }
    }
  }
  return { done, total };
}

export function getProgramForAssignment(a: Assignment, programs: Program[]): Program | null {
  return a.personalizedProgram ?? programs.find((p) => p.id === a.programId) ?? null;
}

export function buildAppAssignmentRows(
  athletes: Athlete[],
  assignments: Assignment[],
  programs: Program[],
): AppAssignmentRow[] {
  return assignments.map((a) => {
    const athlete = athletes.find((x) => x.id === a.athleteId);
    const base = programs.find((p) => p.id === a.programId);
    const prog = getProgramForAssignment(a, programs);
    const slots = prog ? countLoggedSlots(prog) : { done: 0, total: 0 };
    const completionPct =
      slots.total > 0 ? Math.min(100, Math.round((slots.done / slots.total) * 100)) : 0;
    return {
      athleteId: a.athleteId,
      athleteName: athlete?.name ?? `#${a.athleteId}`,
      programId: a.programId,
      programName: base?.name ?? prog?.name ?? `Program ${a.programId}`,
      startDate: a.startDate,
      hasPersonalizedCopy: Boolean(a.personalizedProgram),
      completionPct,
      exercisesLogged: slots.done,
      exerciseSlots: slots.total,
    };
  });
}

export function aggregateTemplateLogging(
  assignments: Assignment[],
  programs: Program[],
): { done: number; total: number; pct: number } {
  let done = 0;
  let total = 0;
  for (const a of assignments) {
    const prog = getProgramForAssignment(a, programs);
    if (!prog) continue;
    const s = countLoggedSlots(prog);
    done += s.done;
    total += s.total;
  }
  return {
    done,
    total,
    pct: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

export function buildAlertsAppCoach(input: {
  athletes: Athlete[];
  assignments: Assignment[];
  programs: Program[];
  intakes: IntakeData[];
  isEs: boolean;
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const { athletes, assignments, programs, intakes, isEs } = input;
  const assigned = new Set(assignments.map((x) => x.athleteId));
  for (const ath of athletes) {
    if (!assigned.has(ath.id)) {
      alerts.push({
        id: `unassigned-${ath.id}`,
        severity: 'warning',
        title: isEs ? 'Sin programa plantilla' : 'No template program',
        description: isEs
          ? `${ath.name} no tiene programa asignado desde la sección Atletas.`
          : `${ath.name} has no template program assigned from Athletes.`,
        actionLabel: isEs ? 'Ir a Atletas' : 'Go to Athletes',
        targetView: 'athletes',
        athleteId: ath.id,
      });
    }
  }
  for (const a of assignments) {
    const ath = athletes.find((x) => x.id === a.athleteId);
    const hasIntake = intakes.some((i) => i.athleteId === a.athleteId);
    if (hasIntake && !a.personalizedProgram) {
      alerts.push({
        id: `no-personal-${a.athleteId}`,
        severity: 'info',
        title: isEs ? 'Personalización pendiente' : 'Personalization pending',
        description: isEs
          ? `${ath?.name ?? 'Atleta'} tiene Stats/PRs pero el plan plantilla no está copiado como personalizado. Asigna de nuevo desde Atletas.`
          : `${ath?.name ?? 'Athlete'} has stats on file but the template plan is not in personalized form. Re-assign from Athletes.`,
        actionLabel: isEs ? 'Atletas' : 'Athletes',
        targetView: 'athletes',
        athleteId: a.athleteId,
      });
    }
    const prog = getProgramForAssignment(a, programs);
    if (!prog) continue;
    const { done, total } = countLoggedSlots(prog);
    if (total > 8 && done / total < 0.08) {
      alerts.push({
        id: `low-adherence-${a.athleteId}`,
        severity: 'danger',
        title: isEs ? 'Baja adherencia al plan' : 'Low plan adherence',
        description: isEs
          ? `${ath?.name ?? 'Atleta'}: menos del 8% de bloques con registro en el plan plantilla.`
          : `${ath?.name ?? 'Athlete'}: under 8% of training blocks logged on the template plan.`,
        actionLabel: isEs ? 'Abrir motor WL' : 'Open WL engine',
        targetView: 'wolf-engine',
        athleteId: a.athleteId,
      });
    }
  }
  return alerts;
}

export function wlSlots(program: ProgramAssignment['program']): number {
  return program.weeks.reduce((acc, w) => acc + w.days.length, 0);
}

export function buildWlAssignmentRows(
  wlAssignments: ProgramAssignment[],
  completions: SessionCompletion[],
  nameByProfileId: Record<string, string>,
): WlAssignmentRow[] {
  return wlAssignments.map((a) => {
    const slots = wlSlots(a.program);
    const done = completions.filter((c) => c.assignmentId === a.id).length;
    return {
      assignmentId: a.id,
      athleteProfileId: a.athleteProfileId,
      athleteName: nameByProfileId[a.athleteProfileId] ?? a.athleteProfileId,
      programName: a.program.name,
      assignedAt: a.assignedAt.slice(0, 10),
      completionPct: slots > 0 ? Math.min(100, Math.round((done / slots) * 100)) : 0,
      sessionsDone: done,
      sessionSlots: slots,
    };
  });
}

export function aggregateWlAttendance(
  wlAssignments: ProgramAssignment[],
  completions: SessionCompletion[],
): { done: number; total: number; pct: number } {
  let done = 0;
  let total = 0;
  for (const a of wlAssignments) {
    const slots = wlSlots(a.program);
    total += slots;
    done += completions.filter((c) => c.assignmentId === a.id).length;
  }
  return {
    done,
    total,
    pct: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

export function buildAlertsWl(input: {
  wlAssignments: ProgramAssignment[];
  completions: SessionCompletion[];
  isEs: boolean;
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const now = Date.now();
  const DAY = 86400000;
  for (const a of input.wlAssignments) {
    const slots = wlSlots(a.program);
    const done = input.completions.filter((c) => c.assignmentId === a.id).length;
    const ageDays = (now - new Date(a.assignedAt).getTime()) / DAY;
    if (slots > 0 && done === 0 && ageDays > 10) {
      alerts.push({
        id: `wl-stale-${a.id}`,
        severity: 'warning',
        title: input.isEs ? 'WL: sin sesiones marcadas' : 'WL: no sessions marked done',
        description: input.isEs
          ? `«${a.program.name}» lleva más de 10 días sin sesiones completadas en el calendario del motor.`
          : `“${a.program.name}” has had no sessions marked complete in the WL calendar for 10+ days.`,
        actionLabel: input.isEs ? 'Abrir motor' : 'Open engine',
        targetView: 'wolf-engine',
      });
    }
  }
  return alerts;
}

export function mergedAttendancePct(
  template: { done: number; total: number },
  wl: { done: number; total: number },
): number {
  const parts: number[] = [];
  if (template.total > 0) parts.push((template.done / template.total) * 100);
  if (wl.total > 0) parts.push((wl.done / wl.total) * 100);
  if (parts.length === 0) return 0;
  return Math.round(parts.reduce((x, y) => x + y, 0) / parts.length);
}

export function sortAlerts(alerts: DashboardAlert[]): DashboardAlert[] {
  const order: Record<DashboardAlert['severity'], number> = { danger: 0, warning: 1, info: 2 };
  return [...alerts].sort((a, b) => order[a.severity] - order[b.severity]);
}

export function parseIntakeKgInput(s: string | undefined): number {
  const n = parseFloat(String(s ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export type VolumeSparkBar = { id: number; h: number; label: string };

/** Últimos envíos de Stats: suma snatch+C&J normalizada para mini-barras del dashboard. */
export function volumeSparklineFromIntakes(intakes: IntakeData[], maxBars = 8): VolumeSparkBar[] {
  const sorted = [...intakes].sort((a, b) => a.date.localeCompare(b.date)).slice(-maxBars);
  const vals = sorted.map(
    (i) => parseIntakeKgInput(i.responses.snatch) + parseIntakeKgInput(i.responses.cleanJerk),
  );
  const max = Math.max(1, ...vals);
  return sorted.map((row, i) => ({
    id: typeof row.id === 'number' ? row.id : i,
    h: Math.round((vals[i] / max) * 100),
    label: row.date.length >= 10 ? row.date.slice(5, 10) : row.date.slice(5),
  }));
}
