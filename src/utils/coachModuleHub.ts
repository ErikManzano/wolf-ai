import type { DashboardAlert } from './dashboardStats';
import type { CoachAthleteStatusRow } from './coachDashboardStats';

export type CoachHubModuleId = 'athletes' | 'programs' | 'exercise-intelligence';

export type CoachHubToolId = 'praxiogram' | 'global-calendar';

export type CoachToolSnapshot = {
  id: CoachHubToolId;
  label: string;
  actionHint: string;
  summary: string;
};

export type CoachModuleSnapshot = {
  id: CoachHubModuleId;
  label: string;
  actionHint: string;
  pendingCount: number;
  pendingLabel: string;
  summary: string;
  items: { id: string; text: string; severity: DashboardAlert['severity'] }[];
};

const MODULE_META: Record<
  CoachHubModuleId,
  { labelEs: string; labelEn: string; hintEs: string; hintEn: string; pendingEs: string; pendingEn: string }
> = {
  athletes: {
    labelEs: 'Atletas',
    labelEn: 'Athletes',
    hintEs: 'Revisa roster, PRs y asignaciones',
    hintEn: 'Review roster, PRs, and assignments',
    pendingEs: 'pendientes',
    pendingEn: 'pending',
  },
  programs: {
    labelEs: 'Programas',
    labelEn: 'Programs',
    hintEs: 'Asigna mesociclos y revisa adherencia',
    hintEn: 'Assign mesocycles and check adherence',
    pendingEs: 'por revisar',
    pendingEn: 'to review',
  },
  'exercise-intelligence': {
    labelEs: 'Ejercicios',
    labelEn: 'Exercises',
    hintEs: 'Organiza familias y personaliza el catálogo',
    hintEn: 'Organize families and customize the catalog',
    pendingEs: 'acciones',
    pendingEn: 'actions',
  },
};

const TOOL_META: Record<
  CoachHubToolId,
  { labelEs: string; labelEn: string; hintEs: string; hintEn: string; summaryEs: string; summaryEn: string }
> = {
  praxiogram: {
    labelEs: 'Praxiograma',
    labelEn: 'Praxiogram',
    hintEs: 'Diseña periodización visual del mesociclo',
    hintEn: 'Design visual mesocycle periodization',
    summaryEs: 'Mapas tácticos de bloques y semanas',
    summaryEn: 'Tactical block and week maps',
  },
  'global-calendar': {
    labelEs: 'Calendario',
    labelEn: 'Calendar',
    hintEs: 'Vista global de entrenamientos y eventos',
    hintEn: 'Global training and events view',
    summaryEs: 'Competiciones, sesiones y carga del roster',
    summaryEn: 'Competitions, sessions, and roster load',
  },
};

function alertsForModule(alerts: DashboardAlert[], module: CoachHubModuleId): DashboardAlert[] {
  if (module === 'athletes') {
    return alerts.filter((alert) => alert.targetView === 'athletes' || alert.targetView === 'my-wl-plan');
  }
  if (module === 'programs') {
    return alerts.filter((alert) => alert.targetView === 'programs');
  }
  return [];
}

export function buildCoachModuleSnapshots(input: {
  isEs: boolean;
  alerts: DashboardAlert[];
  athleteRows: CoachAthleteStatusRow[];
  wlAthleteCount: number;
  assignmentCount: number;
  activeProgramCount: number;
  exerciseCatalogCount: number;
  customExerciseCount: number;
  customFamilyCount: number;
}): CoachModuleSnapshot[] {
  const isEs = input.isEs;

  const reviewAthletes = input.athleteRows.filter((row) => row.status === 'review' || row.status === 'adapting');
  const athleteAlerts = alertsForModule(input.alerts, 'athletes');
  const programAlerts = alertsForModule(input.alerts, 'programs');

  const athleteItems = [
    ...athleteAlerts.slice(0, 3).map((alert) => ({
      id: alert.id,
      text: alert.title,
      severity: alert.severity,
    })),
    ...reviewAthletes
      .slice(0, Math.max(0, 3 - athleteAlerts.length))
      .map((row) => ({
        id: `review-${row.assignmentId}`,
        text: isEs ? `${row.athleteName} · ${row.statusLabel}` : `${row.athleteName} · ${row.statusLabel}`,
        severity: row.status === 'review' ? ('warning' as const) : ('info' as const),
      })),
  ];

  const programItems = programAlerts.slice(0, 3).map((alert) => ({
    id: alert.id,
    text: alert.title,
    severity: alert.severity,
  }));

  const exerciseItems: CoachModuleSnapshot['items'] = [];
  if (input.customFamilyCount === 0) {
    exerciseItems.push({
      id: 'ex-families',
      text: isEs ? 'Crea tu primera familia de ejercicios' : 'Create your first exercise family',
      severity: 'info',
    });
  }
  if (input.customExerciseCount === 0) {
    exerciseItems.push({
      id: 'ex-custom',
      text: isEs ? 'Añade un ejercicio propio al catálogo' : 'Add a custom exercise to the library',
      severity: 'info',
    });
  }

  const modules: CoachModuleSnapshot[] = [
    {
      id: 'athletes',
      label: isEs ? MODULE_META.athletes.labelEs : MODULE_META.athletes.labelEn,
      actionHint: isEs ? MODULE_META.athletes.hintEs : MODULE_META.athletes.hintEn,
      pendingCount: athleteAlerts.length + reviewAthletes.length,
      pendingLabel: isEs ? MODULE_META.athletes.pendingEs : MODULE_META.athletes.pendingEn,
      summary: isEs
        ? `${input.wlAthleteCount} atletas · ${input.assignmentCount} asignaciones WL`
        : `${input.wlAthleteCount} athletes · ${input.assignmentCount} WL assignments`,
      items: athleteItems,
    },
    {
      id: 'programs',
      label: isEs ? MODULE_META.programs.labelEs : MODULE_META.programs.labelEn,
      actionHint: isEs ? MODULE_META.programs.hintEs : MODULE_META.programs.hintEn,
      pendingCount: programAlerts.length,
      pendingLabel: isEs ? MODULE_META.programs.pendingEs : MODULE_META.programs.pendingEn,
      summary: isEs
        ? `${input.activeProgramCount} programas activos`
        : `${input.activeProgramCount} active programs`,
      items: programItems,
    },
    {
      id: 'exercise-intelligence',
      label: isEs ? MODULE_META['exercise-intelligence'].labelEs : MODULE_META['exercise-intelligence'].labelEn,
      actionHint: isEs ? MODULE_META['exercise-intelligence'].hintEs : MODULE_META['exercise-intelligence'].hintEn,
      pendingCount: exerciseItems.length,
      pendingLabel: isEs ? MODULE_META['exercise-intelligence'].pendingEs : MODULE_META['exercise-intelligence'].pendingEn,
      summary: isEs
        ? `${input.exerciseCatalogCount} ejercicios · ${input.customFamilyCount} familias`
        : `${input.exerciseCatalogCount} exercises · ${input.customFamilyCount} families`,
      items: exerciseItems,
    },
  ];

  return modules;
}

export function buildCoachToolSnapshots(isEs: boolean): CoachToolSnapshot[] {
  return (Object.keys(TOOL_META) as CoachHubToolId[]).map((id) => {
    const meta = TOOL_META[id];
    return {
      id,
      label: isEs ? meta.labelEs : meta.labelEn,
      actionHint: isEs ? meta.hintEs : meta.hintEn,
      summary: isEs ? meta.summaryEs : meta.summaryEn,
    };
  });
}

export function alertTargetModule(alert: DashboardAlert): CoachHubModuleId {
  if (alert.targetView === 'programs') return 'programs';
  if (alert.targetView === 'athletes' || alert.targetView === 'my-wl-plan') return 'athletes';
  return 'programs';
}
