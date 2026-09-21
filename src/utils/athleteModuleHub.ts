import type { PlanChangeNotification } from '../models/notifications';
import type { AthleteDashboardModel } from './athleteDashboardStats';

export type AthleteHubModuleId = 'my-wl-plan' | 'prs' | 'calendar';

export type AthleteModuleSnapshot = {
  id: AthleteHubModuleId;
  label: string;
  actionHint: string;
  pendingCount: number;
  pendingLabel: string;
  summary: string;
  items: { id: string; text: string; severity: 'info' | 'warning' }[];
};

const MODULE_META: Record<
  AthleteHubModuleId,
  { labelEs: string; labelEn: string; hintEs: string; hintEn: string; pendingEs: string; pendingEn: string }
> = {
  'my-wl-plan': {
    labelEs: 'Mi plan WL',
    labelEn: 'My WL plan',
    hintEs: 'Continúa tu mesociclo y revisa avisos del coach',
    hintEn: 'Continue your mesocycle and review coach notices',
    pendingEs: 'avisos',
    pendingEn: 'notices',
  },
  prs: {
    labelEs: 'Mis PRs',
    labelEn: 'My PRs',
    hintEs: 'Consulta y registra marcas personales',
    hintEn: 'View and log personal records',
    pendingEs: 'pendientes',
    pendingEn: 'pending',
  },
  calendar: {
    labelEs: 'Calendario',
    labelEn: 'Calendar',
    hintEs: 'Revisa entrenamientos y actividad reciente',
    hintEn: 'Review workouts and recent activity',
    pendingEs: 'pendientes',
    pendingEn: 'pending',
  },
};

function formatRelativeDate(iso: string | null, isEs: boolean): string {
  if (!iso) return isEs ? 'Sin registro' : 'No activity';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return isEs ? 'Hoy' : 'Today';
    if (diffDays === 1) return isEs ? 'Ayer' : 'Yesterday';
    return d.toLocaleDateString(isEs ? 'es' : 'en', { day: 'numeric', month: 'short' });
  } catch {
    return iso.slice(0, 10);
  }
}

export function buildAthleteModuleSnapshots(input: {
  model: AthleteDashboardModel;
  planChangeNotifications: PlanChangeNotification[];
  unreadPlanChangeCount: number;
  hasAssignments: boolean;
  isEs: boolean;
}): AthleteModuleSnapshot[] {
  const { model, planChangeNotifications, unreadPlanChangeCount, hasAssignments, isEs } = input;
  const meta = (id: AthleteHubModuleId) => MODULE_META[id];

  const unreadNotices = planChangeNotifications.filter((n) => !n.readAt);
  const planItems: AthleteModuleSnapshot['items'] = [
    ...unreadNotices.slice(0, 2).map((notice) => ({
      id: notice.id,
      text: isEs ? notice.messageEs : notice.messageEn,
      severity: 'warning' as const,
    })),
  ];
  if (!hasAssignments) {
    planItems.push({
      id: 'no-plan',
      text: isEs
        ? 'Aún no tienes planes asignados'
        : 'No plans assigned yet',
      severity: 'info',
    });
  } else if (model.nextSession) {
    const { weekNumber, dayNumber, dayLabel, programName } = model.nextSession;
    planItems.push({
      id: 'next-session',
      text: isEs
        ? `Próxima: S${weekNumber} · D${dayNumber}${dayLabel ? ` — ${dayLabel}` : ''} · ${programName}`
        : `Next: W${weekNumber} · D${dayNumber}${dayLabel ? ` — ${dayLabel}` : ''} · ${programName}`,
      severity: 'info',
    });
  }

  const active = model.activeProgram;
  const planSummary = !hasAssignments
    ? isEs
      ? 'Esperando asignación del coach'
      : 'Waiting for coach assignment'
    : active
      ? isEs
        ? `${active.programName} · ${active.daysDone}/${active.daysTotal} sesiones (${active.completionPct}%)`
        : `${active.programName} · ${active.daysDone}/${active.daysTotal} sessions (${active.completionPct}%)`
      : isEs
        ? 'Mesociclo completado'
        : 'Mesocycle complete';

  const planPendingCount = unreadPlanChangeCount + (!hasAssignments ? 1 : 0);

  const prItems: AthleteModuleSnapshot['items'] = [];
  if (!model.hasLinkedProfile) {
    prItems.push({
      id: 'no-profile',
      text: isEs ? 'Perfil WL no vinculado' : 'WL profile not linked',
      severity: 'info',
    });
  } else {
    const lifts: string[] = [];
    if (model.oneRM.snatch > 0) lifts.push(`Sn ${model.oneRM.snatch} kg`);
    if (model.oneRM.cleanJerk > 0) lifts.push(`C&J ${model.oneRM.cleanJerk} kg`);
    if (model.oneRM.backSquat > 0) {
      lifts.push(isEs ? `Sq ${model.oneRM.backSquat} kg` : `BS ${model.oneRM.backSquat} kg`);
    }
    if (lifts.length > 0) {
      prItems.push({
        id: 'top-lifts',
        text: lifts.join(' · '),
        severity: 'info',
      });
    }
    if (model.prsThisWeek > 0) {
      prItems.push({
        id: 'prs-week',
        text: isEs
          ? `${model.prsThisWeek} PR${model.prsThisWeek === 1 ? '' : 's'} esta semana`
          : `${model.prsThisWeek} PR${model.prsThisWeek === 1 ? '' : 's'} this week`,
        severity: 'info',
      });
    }
  }

  const prSummary =
    model.sinclair != null
      ? `Sinclair ${model.sinclair}`
      : model.oneRM.snatch + model.oneRM.cleanJerk > 0
        ? isEs
          ? `Total olímpico ${model.oneRM.snatch + model.oneRM.cleanJerk} kg`
          : `Olympic total ${model.oneRM.snatch + model.oneRM.cleanJerk} kg`
        : isEs
          ? 'Registra tus marcas personales'
          : 'Log your personal records';

  const calendarItems: AthleteModuleSnapshot['items'] = [];
  if (model.lastTrainingAt) {
    calendarItems.push({
      id: 'last-activity',
      text: isEs
        ? `Último entreno: ${formatRelativeDate(model.lastTrainingAt, isEs)}`
        : `Last workout: ${formatRelativeDate(model.lastTrainingAt, isEs)}`,
      severity: 'info',
    });
  } else {
    calendarItems.push({
      id: 'no-activity',
      text: isEs ? 'Sin actividad registrada aún' : 'No activity logged yet',
      severity: 'info',
    });
  }

  const calendarSummary = isEs
    ? `${model.aggregate.sessionsThisWeek} sesión${model.aggregate.sessionsThisWeek === 1 ? '' : 'es'} esta semana`
    : `${model.aggregate.sessionsThisWeek} session${model.aggregate.sessionsThisWeek === 1 ? '' : 's'} this week`;

  return [
    {
      id: 'my-wl-plan',
      label: isEs ? meta('my-wl-plan').labelEs : meta('my-wl-plan').labelEn,
      actionHint: isEs ? meta('my-wl-plan').hintEs : meta('my-wl-plan').hintEn,
      pendingCount: planPendingCount,
      pendingLabel: isEs ? meta('my-wl-plan').pendingEs : meta('my-wl-plan').pendingEn,
      summary: planSummary,
      items: planItems,
    },
    {
      id: 'prs',
      label: isEs ? meta('prs').labelEs : meta('prs').labelEn,
      actionHint: isEs ? meta('prs').hintEs : meta('prs').hintEn,
      pendingCount: 0,
      pendingLabel: isEs ? meta('prs').pendingEs : meta('prs').pendingEn,
      summary: prSummary,
      items: prItems,
    },
    {
      id: 'calendar',
      label: isEs ? meta('calendar').labelEs : meta('calendar').labelEn,
      actionHint: isEs ? meta('calendar').hintEs : meta('calendar').hintEn,
      pendingCount: 0,
      pendingLabel: isEs ? meta('calendar').pendingEs : meta('calendar').pendingEn,
      summary: calendarSummary,
      items: calendarItems,
    },
  ];
}
