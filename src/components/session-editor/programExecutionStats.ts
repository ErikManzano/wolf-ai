import type { ProgramWeek, Session, SessionCompletion, SetCompletionLog } from '../../models/training';
import { sessionTotalSets } from './blockMetrics';
import { isDayComplete, isSessionMarkedComplete } from '../../utils/completionHelpers';

export type ExecutionStatus = 'none' | 'pending' | 'in_progress' | 'completed';

export interface SessionExecutionSummary {
  assignmentId: string;
  prescribedSets: number;
  completedSets: number;
  completionPct: number;
  status: ExecutionStatus;
  sessionMarkedComplete: boolean;
}

export interface SessionExecutionContext {
  assignmentId?: string | null;
  completions: SessionCompletion[];
  setLogs: SetCompletionLog[];
}

function countPrescribedSets(session: Session): number {
  return sessionTotalSets(session.exercises);
}

function countLoggedSetsForDay(
  setLogs: SetCompletionLog[],
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
): number {
  return setLogs.filter(
    (log) =>
      log.assignmentId === assignmentId &&
      log.weekNumber === weekNumber &&
      log.dayNumber === dayNumber,
  ).length;
}

function resolveExecutionStatus(
  prescribedSets: number,
  completedSets: number,
  sessionMarkedComplete: boolean,
  dayMarkedComplete: boolean,
): ExecutionStatus {
  if (sessionMarkedComplete || dayMarkedComplete) return 'completed';
  if (prescribedSets <= 0) return 'pending';
  if (completedSets <= 0) return 'pending';
  if (completedSets >= prescribedSets) return 'completed';
  return 'in_progress';
}

export function computeSessionExecution(
  session: Session,
  weekNumber: number,
  dayNumber: number,
  ctx: SessionExecutionContext,
): SessionExecutionSummary | null {
  const assignmentId = ctx.assignmentId?.trim();
  if (!assignmentId) return null;

  const prescribedSets = countPrescribedSets(session);
  const completedSets = countLoggedSetsForDay(ctx.setLogs, assignmentId, weekNumber, dayNumber);
  const sessionMarkedComplete = isSessionMarkedComplete(
    ctx.completions,
    assignmentId,
    weekNumber,
    dayNumber,
  );
  const dayMarkedComplete = isDayComplete(
    ctx.completions,
    assignmentId,
    weekNumber,
    dayNumber,
    session.exercises.length,
  );
  const status = resolveExecutionStatus(
    prescribedSets,
    completedSets,
    sessionMarkedComplete,
    dayMarkedComplete,
  );
  const completionPct =
    prescribedSets > 0 ? Math.min(100, Math.round((completedSets / prescribedSets) * 100)) : 0;

  return {
    assignmentId,
    prescribedSets,
    completedSets,
    completionPct,
    status,
    sessionMarkedComplete: sessionMarkedComplete || dayMarkedComplete,
  };
}

export function executionStatusLabel(status: ExecutionStatus, isEs: boolean): string {
  switch (status) {
    case 'completed':
      return isEs ? 'Completado' : 'Completed';
    case 'in_progress':
      return isEs ? 'En curso' : 'In progress';
    case 'pending':
      return isEs ? 'Pendiente' : 'Pending';
    default:
      return isEs ? 'Solo prescripción' : 'Prescription only';
  }
}

export interface AggregateExecutionSummary {
  prescribedSets: number;
  completedSets: number;
  completionPct: number;
  completedDays: number;
  totalDays: number;
  status: ExecutionStatus;
}

export function computeWeekExecution(
  weekData: ProgramWeek | undefined,
  weekNumber: number,
  ctx: SessionExecutionContext,
): AggregateExecutionSummary | null {
  const assignmentId = ctx.assignmentId?.trim();
  if (!assignmentId || !weekData?.days.length) return null;

  let prescribedSets = 0;
  let completedSets = 0;
  let completedDays = 0;

  for (const day of weekData.days) {
    const prescribed = countPrescribedSets(day.session);
    const completed = countLoggedSetsForDay(ctx.setLogs, assignmentId, weekNumber, day.dayNumber);
    prescribedSets += prescribed;
    completedSets += completed;
    if (
      isDayComplete(
        ctx.completions,
        assignmentId,
        weekNumber,
        day.dayNumber,
        day.session.exercises.length,
      )
    ) {
      completedDays += 1;
    }
  }

  const totalDays = weekData.days.length;
  const completionPct =
    prescribedSets > 0 ? Math.min(100, Math.round((completedSets / prescribedSets) * 100)) : 0;
  const status: ExecutionStatus =
    completedDays >= totalDays && totalDays > 0
      ? 'completed'
      : completedSets > 0
        ? 'in_progress'
        : 'pending';

  return {
    prescribedSets,
    completedSets,
    completionPct,
    completedDays,
    totalDays,
    status,
  };
}

export function computeProgramExecution(
  program: { weeks: ProgramWeek[] },
  ctx: SessionExecutionContext,
): AggregateExecutionSummary | null {
  const assignmentId = ctx.assignmentId?.trim();
  if (!assignmentId || !program.weeks.length) return null;

  let prescribedSets = 0;
  let completedSets = 0;
  let completedDays = 0;
  let totalDays = 0;

  for (const week of program.weeks) {
    for (const day of week.days) {
      totalDays += 1;
      const prescribed = countPrescribedSets(day.session);
      const completed = countLoggedSetsForDay(
        ctx.setLogs,
        assignmentId,
        week.weekNumber,
        day.dayNumber,
      );
      prescribedSets += prescribed;
      completedSets += completed;
      if (
        isDayComplete(
          ctx.completions,
          assignmentId,
          week.weekNumber,
          day.dayNumber,
          day.session.exercises.length,
        )
      ) {
        completedDays += 1;
      }
    }
  }

  const completionPct =
    prescribedSets > 0 ? Math.min(100, Math.round((completedSets / prescribedSets) * 100)) : 0;
  const status: ExecutionStatus =
    completedDays >= totalDays && totalDays > 0
      ? 'completed'
      : completedSets > 0
        ? 'in_progress'
        : 'pending';

  return {
    prescribedSets,
    completedSets,
    completionPct,
    completedDays,
    totalDays,
    status,
  };
}
