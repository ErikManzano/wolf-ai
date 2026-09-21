import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  CalendarRange,
  ClipboardCheck,
  Gauge,
  Zap,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { buildAthleteDashboardModel } from '../../utils/athleteDashboardStats';
import {
  buildAthleteModuleSnapshots,
  type AthleteHubModuleId,
} from '../../utils/athleteModuleHub';
import { LevelBadge } from '../wl-athletes/LevelBadge';
import { WlPrsFlow } from '../wl-prs/WlPrsFlow';
import type { PrLiftId } from '../../models/liftLogs';
import './AthleteDashboard.css';
import '../coach-dashboard/coach-dashboard.css';
import '../SuperDashboard.css';

interface AthleteDashboardProps {
  language: 'ES' | 'EN';
  onOpenPlan: () => void;
  onOpenCalendar: () => void;
}

const MODULE_ICONS: Record<AthleteHubModuleId, React.ReactNode> = {
  'my-wl-plan': <ClipboardCheck size={20} aria-hidden />,
  prs: <Award size={20} aria-hidden />,
  calendar: <CalendarRange size={20} aria-hidden />,
};

function greeting(isEs: boolean, ref: Date): string {
  const hour = ref.getHours();
  if (hour < 12) return isEs ? 'Buenos días' : 'Good morning';
  if (hour < 18) return isEs ? 'Buenas tardes' : 'Good afternoon';
  return isEs ? 'Buenas noches' : 'Good evening';
}

const AthleteDashboard: React.FC<AthleteDashboardProps> = ({
  language,
  onOpenPlan,
  onOpenCalendar,
}) => {
  const isEs = language === 'ES';
  const { intakes, athletes: appAthletes } = useAppContext();
  const {
    athleteUser,
    currentUser,
    myAssignments,
    completions,
    setLogs,
    wlAthletes,
    motorExercises,
    assignmentsLoading,
    planChangeNotifications,
    unreadPlanChangeCount,
    loadPlanChangeNotifications,
    reloadWlAthletesFromApi,
  } = useWolfAssign();

  useEffect(() => {
    void loadPlanChangeNotifications();
  }, [loadPlanChangeNotifications]);

  const exName = useMemo(
    () => (id: string) => motorExercises.find((e) => e.id === id)?.name ?? id,
    [motorExercises],
  );

  const model = useMemo(
    () =>
      buildAthleteDashboardModel({
        linkedProfileId: athleteUser?.linkedAthleteId,
        displayName: currentUser?.name ?? (isEs ? 'Atleta' : 'Athlete'),
        assignments: myAssignments,
        completions,
        setLogs,
        wlAthletes,
        motorExercises,
        intakes,
        appAthletes,
        exName,
        isEs,
      }),
    [
      athleteUser?.linkedAthleteId,
      currentUser?.name,
      myAssignments,
      completions,
      setLogs,
      wlAthletes,
      motorExercises,
      intakes,
      appAthletes,
      exName,
      isEs,
    ],
  );

  const modules = useMemo(
    () =>
      buildAthleteModuleSnapshots({
        model,
        planChangeNotifications,
        unreadPlanChangeCount,
        hasAssignments: myAssignments.length > 0,
        isEs,
      }),
    [model, planChangeNotifications, unreadPlanChangeCount, myAssignments.length, isEs],
  );

  const next = model.nextSession;

  const [prsView, setPrsView] = useState<PrLiftId | 'hub' | null>(null);
  const linkedAthleteId = athleteUser?.linkedAthleteId;
  const profile = useMemo(
    () => wlAthletes.find((a) => a.id === linkedAthleteId),
    [wlAthletes, linkedAthleteId],
  );

  const openPrs = (liftId: PrLiftId | 'hub') => {
    if (!linkedAthleteId) return;
    setPrsView(liftId);
  };

  const openModule = (moduleId: AthleteHubModuleId) => {
    if (moduleId === 'my-wl-plan') onOpenPlan();
    else if (moduleId === 'prs') openPrs('hub');
    else if (moduleId === 'calendar') onOpenCalendar();
  };

  if (prsView && linkedAthleteId) {
    return (
      <WlPrsFlow
        athleteId={linkedAthleteId}
        athleteName={model.displayName}
        isEs={isEs}
        canLog
        oneRM={profile?.oneRM ?? model.oneRM}
        createdByUserId={currentUser?.id}
        initialLiftId={prsView === 'hub' ? null : prsView}
        onClose={() => setPrsView(null)}
        onLogsChanged={() => void reloadWlAthletesFromApi()}
      />
    );
  }

  const refDate = new Date();

  return (
    <div className="mock-view super-dashboard athlete-dashboard">
      <header className="sd-hero cd-hero">
        <div className="sd-hero__inner">
          <div className="sd-hero__titles">
            <p className="sd-hero__eyebrow">{isEs ? 'Inicio atleta' : 'Athlete home'}</p>
            <div className="ad-hero__title-row">
              <h1 className="sd-hero__title">{greeting(isEs, refDate)}, {model.displayName.split(' ')[0]}</h1>
              <LevelBadge level={model.level} isEs={isEs} />
            </div>
            <div className="ad-hero__signals">
              <span className="ad-signal" title={isEs ? 'Preparación' : 'Readiness'}>
                <Gauge size={13} aria-hidden />
                {isEs ? 'Listo' : 'Ready'} {model.readinessScore}%
              </span>
              <span className="ad-signal" title={isEs ? 'Fatiga acumulada' : 'Fatigue'}>
                <Activity size={13} aria-hidden />
                {isEs ? 'Fatiga' : 'Fatigue'} {model.fatigueScore}%
              </span>
              {model.bodyweight > 0 ? (
                <span className="ad-signal">{model.bodyweight} kg BW</span>
              ) : null}
            </div>
            <p className="sd-hero__sub">
              {isEs
                ? 'Entrena, revisa tu progreso y atiende avisos del coach desde un solo lugar.'
                : 'Train, track progress, and handle coach notices from one place.'}
            </p>
          </div>
          <div className="sd-hero__actions">
            {next ? (
              <button type="button" className="ad-resume-btn" onClick={onOpenPlan}>
                <Zap size={16} aria-hidden />
                <span>
                  {isEs ? 'Continuar entreno' : 'Resume training'}
                  <small>
                    S{next.weekNumber} · D{next.dayNumber}
                    {next.dayLabel ? ` · ${next.dayLabel}` : ''}
                  </small>
                </span>
                <ArrowRight size={16} aria-hidden />
              </button>
            ) : (
              <button type="button" className="ad-resume-btn ad-resume-btn--ghost" onClick={onOpenPlan}>
                <ClipboardCheck size={16} aria-hidden />
                {isEs ? 'Abrir mi plan WL' : 'Open my WL plan'}
              </button>
            )}
          </div>
        </div>
        <div className="cd-metrics cd-metrics--hero">
          <div className="cd-metric">
            <span className="cd-metric__label">{isEs ? 'Sesiones completadas' : 'Sessions completed'}</span>
            <strong className="cd-metric__value">
              {model.aggregate.daysDone}/{model.aggregate.daysTotal || '—'}
            </strong>
            <span className="cd-metric__sub">{model.aggregate.daysPct}%</span>
          </div>
          <div className="cd-metric">
            <span className="cd-metric__label">{isEs ? 'Adherencia series' : 'Set adherence'}</span>
            <strong className="cd-metric__value">{model.aggregate.setsPct}%</strong>
            <span className="cd-metric__sub">
              {model.aggregate.setsLogged}/{model.aggregate.setsTotal || '—'}
            </span>
          </div>
          <div className="cd-metric">
            <span className="cd-metric__label">{isEs ? 'Racha / semana' : 'Streak / week'}</span>
            <strong className="cd-metric__value">{model.streakDays}d</strong>
            <span className="cd-metric__sub">
              {model.aggregate.sessionsThisWeek} {isEs ? 'sesiones' : 'sessions'}
            </span>
          </div>
          <div className={`cd-metric${unreadPlanChangeCount > 0 ? ' cd-metric--warn' : ''}`}>
            <span className="cd-metric__label">{isEs ? 'Avisos coach' : 'Coach notices'}</span>
            <strong className="cd-metric__value">{unreadPlanChangeCount}</strong>
            <span className="cd-metric__sub">{isEs ? 'sin leer' : 'unread'}</span>
          </div>
        </div>
      </header>

      {!model.hasLinkedProfile && myAssignments.length === 0 && !assignmentsLoading ? (
        <div className="cd-alert cd-alert--ok ad-banner" role="status">
          <p>
            {isEs
              ? 'Aún no tienes planes asignados. Tu coach debe asignarte un programa desde Programas.'
              : 'No plans assigned yet. Your coach must assign a program from Programs.'}
          </p>
        </div>
      ) : null}

      <section className="sd-section" aria-labelledby="ad-modules-title">
        <div className="sd-section__head">
          <div>
            <h2 id="ad-modules-title" className="sd-section__title">
              {isEs ? 'Tus módulos' : 'Your modules'}
            </h2>
            <p className="sd-section__desc">
              {isEs
                ? 'Entra directo a entrenar, revisar PRs o consultar tu calendario.'
                : 'Jump straight to training, PRs, or your calendar.'}
            </p>
          </div>
        </div>
        <div className="cd-module-grid ad-module-grid">
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
                <p className="cd-module-card__ok">{isEs ? 'Todo al día' : 'All caught up'}</p>
              )}
              <span className="cd-module-card__cta">
                {isEs ? 'Abrir módulo' : 'Open module'}
                <ArrowRight size={14} aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AthleteDashboard;
