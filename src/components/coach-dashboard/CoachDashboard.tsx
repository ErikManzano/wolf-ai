import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookMarked,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListTree,
  Users,
} from 'lucide-react';
import type { Athlete as AppAthlete, IntakeData } from '../../context/AppContext';
import type {
  Athlete,
  Exercise,
  ProgramAssignment,
  SessionCompletion,
  SetCompletionLog,
} from '../../models/training';
import type { DashboardAlert } from '../../utils/dashboardStats';
import {
  buildCoachDashboardModel,
  type CoachDashboardScope,
} from '../../utils/coachDashboardStats';
import {
  buildCoachModuleSnapshots,
  buildCoachToolSnapshots,
  type CoachHubModuleId,
  type CoachHubToolId,
} from '../../utils/coachModuleHub';
import './coach-dashboard.css';
import '../SuperDashboard.css';

export interface CoachDashboardProps {
  language: 'ES' | 'EN';
  intakes: IntakeData[];
  appAthletes: AppAthlete[];
  wlProgramAssignments: ProgramAssignment[];
  completions: SessionCompletion[];
  setLogs: SetCompletionLog[];
  wlAthletes: Athlete[];
  motorExercises: Exercise[];
  alerts: DashboardAlert[];
  customExerciseCount: number;
  customFamilyCount: number;
  onOpenPrograms: (coachProgramId?: string) => void;
  onOpenAthletes: () => void;
  onOpenExercises: () => void;
  onOpenPraxiogram: () => void;
  onOpenCalendar: () => void;
}

const MODULE_ICONS: Record<CoachHubModuleId, React.ReactNode> = {
  athletes: <Users size={20} aria-hidden />,
  programs: <BookMarked size={20} aria-hidden />,
  'exercise-intelligence': <ListTree size={20} aria-hidden />,
};

const TOOL_ICONS: Record<CoachHubToolId, React.ReactNode> = {
  praxiogram: <LayoutGrid size={20} aria-hidden />,
  'global-calendar': <CalendarRange size={20} aria-hidden />,
};

function greeting(isEs: boolean, ref: Date): string {
  const hour = ref.getHours();
  if (hour < 12) return isEs ? 'Buenos días' : 'Good morning';
  if (hour < 18) return isEs ? 'Buenas tardes' : 'Good afternoon';
  return isEs ? 'Buenas noches' : 'Good evening';
}

const CoachDashboard: React.FC<CoachDashboardProps> = ({
  language,
  intakes,
  appAthletes,
  wlProgramAssignments,
  completions,
  setLogs,
  wlAthletes,
  motorExercises,
  alerts,
  customExerciseCount,
  customFamilyCount,
  onOpenPrograms,
  onOpenAthletes,
  onOpenExercises,
  onOpenPraxiogram,
  onOpenCalendar,
}) => {
  const isEs = language === 'ES';
  const [scope, setScope] = useState<CoachDashboardScope>('today');
  const [refDate, setRefDate] = useState(() => new Date());

  const model = useMemo(
    () =>
      buildCoachDashboardModel({
        scope,
        ref: refDate,
        wlAssignments: wlProgramAssignments,
        completions,
        setLogs,
        wlAthletes,
        motorExercises,
        intakes,
        appAthletes,
        alerts,
        isEs,
      }),
    [
      scope,
      refDate,
      wlProgramAssignments,
      completions,
      setLogs,
      wlAthletes,
      motorExercises,
      intakes,
      appAthletes,
      alerts,
      isEs,
    ],
  );

  const tools = useMemo(() => buildCoachToolSnapshots(isEs), [isEs]);

  const modules = useMemo(
    () =>
      buildCoachModuleSnapshots({
        isEs,
        alerts,
        athleteRows: model.athleteRows,
        wlAthleteCount: wlAthletes.length,
        assignmentCount: wlProgramAssignments.length,
        activeProgramCount: model.kpis.activePrograms,
        exerciseCatalogCount: motorExercises.length,
        customExerciseCount,
        customFamilyCount,
      }),
    [
      isEs,
      alerts,
      model.athleteRows,
      model.kpis.activePrograms,
      wlAthletes.length,
      wlProgramAssignments.length,
      motorExercises.length,
      customExerciseCount,
      customFamilyCount,
    ],
  );

  const shiftPeriod = (direction: -1 | 1) => {
    setRefDate((prev) => {
      const d = new Date(prev);
      if (scope === 'today') d.setDate(d.getDate() + direction);
      else if (scope === 'week') d.setDate(d.getDate() + direction * 7);
      else d.setMonth(d.getMonth() + direction);
      return d;
    });
  };

  const openModule = (moduleId: CoachHubModuleId) => {
    if (moduleId === 'athletes') onOpenAthletes();
    else if (moduleId === 'programs') onOpenPrograms();
    else if (moduleId === 'exercise-intelligence') onOpenExercises();
  };

  const openTool = (toolId: CoachHubToolId) => {
    if (toolId === 'praxiogram') onOpenPraxiogram();
    else if (toolId === 'global-calendar') onOpenCalendar();
  };

  const scopeTabs: { id: CoachDashboardScope; label: string }[] = [
    { id: 'today', label: isEs ? 'Hoy' : 'Today' },
    { id: 'week', label: isEs ? 'Semana' : 'Week' },
    { id: 'month', label: isEs ? 'Mes' : 'Month' },
  ];

  const sessionsLabel =
    scope === 'today'
      ? isEs
        ? 'Sesiones hoy'
        : 'Sessions today'
      : scope === 'week'
        ? isEs
          ? 'Sesiones semana'
          : 'Week sessions'
        : isEs
          ? 'Sesiones mes'
          : 'Month sessions';

  return (
    <div className="mock-view super-dashboard coach-dashboard">
      <header className="sd-hero cd-hero">
        <div className="sd-hero__inner">
          <div className="sd-hero__titles">
            <p className="sd-hero__eyebrow">{isEs ? 'Inicio coach' : 'Coach home'}</p>
            <h1 className="sd-hero__title">{greeting(isEs, refDate)}</h1>
            <p className="sd-hero__sub">
              {isEs
                ? 'Revisa qué hacer en cada módulo y atiende tus pendientes antes de programar.'
                : 'See what to do in each module and handle pending items before you program.'}
            </p>
          </div>
          <div className="cd-toolbar cd-toolbar--hero">
            <div className="cd-scope-tabs" role="tablist" aria-label={isEs ? 'Periodo' : 'Period'}>
              {scopeTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={scope === tab.id}
                  className={`cd-scope-tab${scope === tab.id ? ' is-active' : ''}`}
                  onClick={() => setScope(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="cd-period-nav">
              <button type="button" className="cd-period-nav__btn" onClick={() => shiftPeriod(-1)} aria-label={isEs ? 'Anterior' : 'Previous'}>
                <ChevronLeft size={18} aria-hidden />
              </button>
              <span className="cd-period-nav__label">{model.periodLabel}</span>
              <button type="button" className="cd-period-nav__btn" onClick={() => shiftPeriod(1)} aria-label={isEs ? 'Siguiente' : 'Next'}>
                <ChevronRight size={18} aria-hidden />
              </button>
            </div>
          </div>
        </div>
        <div className="cd-metrics cd-metrics--hero">
          <div className="cd-metric">
            <span className="cd-metric__label">{isEs ? 'Atletas' : 'Athletes'}</span>
            <strong className="cd-metric__value">{model.kpis.athletes}</strong>
          </div>
          <div className="cd-metric">
            <span className="cd-metric__label">{isEs ? 'Programas activos' : 'Active programs'}</span>
            <strong className="cd-metric__value">{model.kpis.activePrograms}</strong>
          </div>
          <div className="cd-metric">
            <span className="cd-metric__label">{sessionsLabel}</span>
            <strong className="cd-metric__value">{model.kpis.sessionsInScope}</strong>
          </div>
          <div className={`cd-metric${model.kpis.alertsCount > 0 ? ' cd-metric--warn' : ''}`}>
            <span className="cd-metric__label">{isEs ? 'Alertas' : 'Alerts'}</span>
            <strong className="cd-metric__value">{model.kpis.alertsCount}</strong>
          </div>
        </div>
      </header>

      <section className="sd-section" aria-labelledby="cd-modules-title">
        <div className="sd-section__head">
          <div>
            <h2 id="cd-modules-title" className="sd-section__title">
              {isEs ? 'Tus módulos' : 'Your modules'}
            </h2>
            <p className="sd-section__desc">
              {isEs
                ? 'Entra directo a donde tienes trabajo pendiente.'
                : 'Jump straight to where you have work waiting.'}
            </p>
          </div>
        </div>
        <div className="cd-module-grid">
          {modules.map((mod) => (
            <button
              key={mod.id}
              type="button"
              className={`cd-module-card${mod.pendingCount > 0 ? ' cd-module-card--pending' : ''}`}
              onClick={() => openModule(mod.id)}
            >
              <div className="cd-module-card__head">
                <span className="cd-module-card__icon">{MODULE_ICONS[mod.id]}</span>
                <span className="cd-module-card__label">{mod.label}</span>
                {mod.pendingCount > 0 ? (
                  <span className="cd-module-card__badge">{mod.pendingCount}</span>
                ) : null}
              </div>
              <p className="cd-module-card__hint">{mod.actionHint}</p>
              <p className="cd-module-card__summary">{mod.summary}</p>
              {mod.items.length > 0 ? (
                <ul className="cd-module-card__items">
                  {mod.items.map((item) => (
                    <li key={item.id} className={`cd-module-card__item cd-module-card__item--${item.severity}`}>
                      {item.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cd-module-card__ok">{isEs ? 'Sin pendientes urgentes' : 'No urgent pending items'}</p>
              )}
              <span className="cd-module-card__cta">
                {isEs ? 'Abrir módulo' : 'Open module'}
                <ArrowRight size={14} aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="sd-section" aria-labelledby="cd-tools-title">
        <div className="sd-section__head">
          <div>
            <h2 id="cd-tools-title" className="sd-section__title">
              {isEs ? 'Herramientas del coach' : 'Coach tools'}
            </h2>
            <p className="sd-section__desc">
              {isEs
                ? 'Utilidades de planificación fuera del flujo principal de programas.'
                : 'Planning utilities outside the main program workflow.'}
            </p>
          </div>
        </div>
        <div className="cd-module-grid cd-tool-grid">
          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className="cd-module-card cd-tool-card"
              onClick={() => openTool(tool.id)}
            >
              <div className="cd-module-card__head">
                <span className="cd-module-card__icon">{TOOL_ICONS[tool.id]}</span>
                <span className="cd-module-card__label">{tool.label}</span>
              </div>
              <p className="cd-module-card__hint">{tool.actionHint}</p>
              <p className="cd-module-card__summary">{tool.summary}</p>
              <span className="cd-module-card__cta">
                {isEs ? 'Abrir herramienta' : 'Open tool'}
                <ArrowRight size={14} aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CoachDashboard;
