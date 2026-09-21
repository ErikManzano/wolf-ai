import type { DashboardAlert } from './dashboardStats';
import type { CoachAthleteStatusRow } from './coachDashboardStats';

export type CoachHubModuleId = 'athletes' | 'programs' | 'exercise-intelligence' | 'praxiogram';

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
  praxiogram: {
    labelEs: 'Praxiograma',
    labelEn: 'Praxiogram',
    hintEs: 'Diseña periodización visual',
    hintEn: 'Design visual periodization',
    pendingEs: 'borradores',
    pendingEn: 'drafts',
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
    {
      id: 'praxiogram',
      label: isEs ? MODULE_META.praxiogram.labelEs : MODULE_META.praxiogram.labelEn,
      actionHint: isEs ? MODULE_META.praxiogram.hintEs : MODULE_META.praxiogram.hintEn,
      pendingCount: 0,
      pendingLabel: isEs ? MODULE_META.praxiogram.pendingEs : MODULE_META.praxiogram.pendingEn,
      summary: isEs ? 'Periodización visual del mesociclo' : 'Visual mesocycle periodization',
      items: [],
    },
  ];

  return modules;
}

export function alertTargetModule(alert: DashboardAlert): CoachHubModuleId {
  if (alert.targetView === 'programs') return 'programs';
  if (alert.targetView === 'athletes' || alert.targetView === 'my-wl-plan') return 'athletes';
  return 'programs';
}
