import React, { useEffect, useMemo } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  Bell,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import PerformanceStatsHistory from '../PerformanceStatsHistory';
import { buildAthleteDashboardModel } from '../../utils/athleteDashboardStats';
import { LevelBadge } from '../wl-athletes/LevelBadge';
import {
  type ProgramStatsKpiCard,
  ProgramStatsKpiGrid,
} from '../session-editor/programStatsShared';
import './AthleteDashboard.css';
import '../coach-dashboard/coach-dashboard.css';
import '../session-editor/session-sheet-spreadsheet.css';

interface AthleteDashboardProps {
  language: 'ES' | 'EN';
  onOpenPlan: () => void;
}

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

const AthleteDashboard: React.FC<AthleteDashboardProps> = ({ language, onOpenPlan }) => {
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
    markPlanChangeNotificationRead,
    loadPlanChangeNotifications,
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

  const next = model.nextSession;
  const active = model.activeProgram;
  const coachNotices = useMemo(
    () => planChangeNotifications.slice(0, 12),
    [planChangeNotifications],
  );

  const kpiCards: ProgramStatsKpiCard[] = [
    {
      id: 'sessions',
      label: isEs ? 'Sesiones completadas' : 'Sessions completed',
      value: `${model.aggregate.daysDone}/${model.aggregate.daysTotal || '—'}`,
      sub: `${model.aggregate.daysPct}% ${isEs ? 'del mesociclo' : 'of mesocycle'}`,
      subAccent: 'muted',
      accent: 'default',
      visualValue: model.aggregate.daysPct,
    },
    {
      id: 'sets',
      label: isEs ? 'Series registradas' : 'Sets logged',
      value: `${model.aggregate.setsLogged}/${model.aggregate.setsTotal || '—'}`,
      sub: `${model.aggregate.setsPct}% ${isEs ? 'adherencia' : 'adherence'}`,
      subAccent: model.aggregate.setsPct >= 70 ? 'success' : 'muted',
      accent: 'sets',
      visualValue: model.aggregate.setsPct,
    },
    {
      id: 'volume',
      label: isEs ? 'Volumen registrado' : 'Logged volume',
      value: model.aggregate.volumeLoggedKg.toLocaleString(),
      sub: `kg · ${isEs ? 'carga × reps reales' : 'actual load × reps'}`,
      subAccent: 'muted',
      accent: 'volume',
    },
    {
      id: 'streak',
      label: isEs ? 'Racha / semana' : 'Streak / week',
      value: `${model.streakDays}d`,
      sub: `${model.aggregate.sessionsThisWeek} ${isEs ? 'sesiones esta semana' : 'sessions this week'}`,
      subAccent: 'success',
      accent: 'intensity',
    },
  ];

  const prMarks = [
    { key: 'sn', label: 'Snatch', value: model.oneRM.snatch },
    { key: 'cj', label: 'C&J', value: model.oneRM.cleanJerk },
    { key: 'bs', label: isEs ? 'Sentadilla' : 'Back squat', value: model.oneRM.backSquat },
    { key: 'fs', label: 'Front squat', value: model.oneRM.frontSquat },
    ...(model.deadliftKg ? [{ key: 'dl', label: 'Deadlift', value: model.deadliftKg }] : []),
  ];

  return (
    <div className="mock-view super-dashboard athlete-dashboard">
      <div className="cd-toolbar ad-toolbar">
        <div className="ad-toolbar__identity">
          <p className="ad-toolbar__eyebrow">{isEs ? 'Panel de rendimiento' : 'Performance panel'}</p>
          <div className="ad-toolbar__title-row">
            <h1 className="ad-toolbar__title">{model.displayName}</h1>
            <LevelBadge level={model.level} isEs={isEs} />
          </div>
          <div className="ad-toolbar__signals">
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
        </div>
        <div className="ad-toolbar__actions">
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

      {!model.hasLinkedProfile && myAssignments.length === 0 && !assignmentsLoading ? (
        <div className="cd-alert cd-alert--ok ad-banner" role="status">
          <p>
            {isEs
              ? 'Aún no tienes planes asignados. Tu coach debe asignarte un programa desde Programas.'
              : 'No plans assigned yet. Your coach must assign a program from Programs.'}
          </p>
        </div>
      ) : null}

      <div className="wolf-program-day-stats wolf-program-day-stats--dashboard cd-kpis">
        <ProgramStatsKpiGrid cards={kpiCards} />
      </div>

      <section className="cd-panel cd-panel--dense ad-pr-panel" aria-label={isEs ? 'Marcas actuales' : 'Current marks'}>
        <div className="cd-panel__head">
          <h2 className="cd-panel__title">
            <Award size={16} aria-hidden />
            {isEs ? 'Marcas actuales' : 'Current marks'}
          </h2>
        </div>
        <div className="cd-panel__body ad-pr-panel__body">
          <div className="ad-pr-strip">
            {prMarks.map((pr) => (
              <div key={pr.key} className="ad-pr-card">
                <span className="ad-pr-card__label">{pr.label}</span>
                <strong className="ad-pr-card__value">{pr.value > 0 ? `${pr.value} kg` : '—'}</strong>
              </div>
            ))}
            {model.sinclair ? (
              <div className="ad-pr-card ad-pr-card--accent">
                <span className="ad-pr-card__label">Sinclair</span>
                <strong className="ad-pr-card__value">{model.sinclair}</strong>
              </div>
            ) : null}
            <div className="ad-pr-card ad-pr-card--meta">
              <span className="ad-pr-card__label">{isEs ? 'PRs semana' : 'PRs this week'}</span>
              <strong className="ad-pr-card__value">{model.prsThisWeek}</strong>
              <span className="ad-pr-card__sub">
                {model.intakesCount} {isEs ? 'envíos Stats' : 'Stats entries'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="cd-quad-grid">
        <section className="cd-panel cd-panel--dense" aria-labelledby="ad-next-title">
          <div className="cd-panel__head">
            <h2 id="ad-next-title" className="cd-panel__title">
              <Target size={16} aria-hidden />
              {isEs ? 'Próxima sesión' : 'Next session'}
            </h2>
            {next ? (
              <button type="button" className="cd-link-btn" onClick={onOpenPlan}>
                {isEs ? 'Ir al entreno' : 'Go to workout'}
              </button>
            ) : null}
          </div>
          <div className="cd-panel__body">
            {!next ? (
              <p className="cd-empty-hint">
                {myAssignments.length === 0
                  ? isEs
                    ? 'Sin planes asignados.'
                    : 'No assigned plans.'
                  : isEs
                    ? 'Mesociclo completado — consulta con tu coach el siguiente bloque.'
                    : 'Mesocycle complete — check with your coach for the next block.'}
              </p>
            ) : (
              <div className="ad-next-session">
                <strong>{next.programName}</strong>
                <span>
                  {isEs ? 'Semana' : 'Week'} {next.weekNumber} · {isEs ? 'Día' : 'Day'} {next.dayNumber}
                  {next.dayLabel ? ` — ${next.dayLabel}` : ''}
                </span>
              </div>
            )}
          </div>
        </section>

        {coachNotices.length > 0 ? (
          <section className="cd-panel cd-panel--dense" aria-labelledby="ad-notices-title">
            <div className="cd-panel__head">
              <h2 id="ad-notices-title" className="cd-panel__title">
                <Bell size={16} aria-hidden />
                {isEs ? 'Avisos del coach' : 'Coach notices'}
                {unreadPlanChangeCount > 0 ? (
                  <span className="ad-coach-notices__badge">{unreadPlanChangeCount}</span>
                ) : null}
              </h2>
            </div>
            <div className="cd-panel__body">
              <ul className="cd-alert-feed ad-coach-notices__list">
                {coachNotices.map((notice) => (
                  <li key={notice.id} className={`cd-alert-item ad-coach-notice${notice.readAt ? ' is-read' : ''}`}>
                    <span className="cd-alert-item__dot" style={{ background: 'var(--color-accent)' }} aria-hidden />
                    <div className="cd-alert-item__body">
                      <strong>{isEs ? notice.messageEs : notice.messageEn}</strong>
                      <p>
                        {notice.coachName} · {formatRelativeDate(notice.changedAt, isEs)}
                      </p>
                    </div>
                    {!notice.readAt ? (
                      <button
                        type="button"
                        className="cd-link-btn cd-link-btn--compact"
                        onClick={() => void markPlanChangeNotificationRead(notice.id)}
                      >
                        {isEs ? 'Leído' : 'Read'}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : (
          <section className="cd-panel cd-panel--dense" aria-labelledby="ad-trend-title">
            <div className="cd-panel__head">
              <h2 id="ad-trend-title" className="cd-panel__title">
                <TrendingUp size={16} aria-hidden />
                {isEs ? 'Tendencia olímpica' : 'Olympic trend'}
              </h2>
            </div>
            <div className="cd-panel__body">
              {model.volumeSpark.length === 0 ? (
                <p className="cd-empty-hint">
                  {isEs ? 'Sin envíos Stats vinculados aún.' : 'No linked Stats submissions yet.'}
                </p>
              ) : (
                <>
                  <div className="ad-spark" role="img" aria-label={isEs ? 'Snatch + C&J' : 'Snatch + C&J'}>
                    {model.volumeSpark.map((b) => (
                      <div key={b.id} className="ad-spark__bar">
                        <div className="ad-spark__fill" style={{ height: `${Math.max(8, b.h)}%` }} title={b.label} />
                        <span className="ad-spark__label">{b.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="cd-empty-hint" style={{ marginTop: 8 }}>
                    {isEs ? 'Snatch + C&J por envío Stats.' : 'Snatch + C&J per Stats entry.'}
                  </p>
                </>
              )}
            </div>
          </section>
        )}

        <section className="cd-panel cd-panel--dense" aria-labelledby="ad-plans-title">
          <div className="cd-panel__head">
            <h2 id="ad-plans-title" className="cd-panel__title">
              <ClipboardList size={16} aria-hidden />
              {isEs ? 'Planes activos' : 'Active plans'}
            </h2>
            <button type="button" className="cd-link-btn" onClick={onOpenPlan}>
              {isEs ? 'Abrir plan' : 'Open plan'}
            </button>
          </div>
          <div className="cd-panel__body">
            {model.programs.length === 0 ? (
              <p className="cd-empty-hint">{isEs ? 'Sin programas asignados.' : 'No assigned programs.'}</p>
            ) : (
              <ul className="cd-program-list">
                {model.programs.map((p) => (
                  <li key={p.assignmentId} className="cd-program-item">
                    <div className="cd-program-item__head">
                      <strong title={p.programName}>{p.programName}</strong>
                      <span className="cd-program-item__stats">
                        <span>
                          {p.daysDone}/{p.daysTotal} {isEs ? 'ses.' : 'sess.'}
                        </span>
                        <span>{p.completionPct}%</span>
                      </span>
                    </div>
                    <div className="cd-progress" aria-hidden>
                      <span className="cd-progress__fill" style={{ width: `${p.completionPct}%` }} />
                    </div>
                    <div className="cd-program-item__meta">
                      <span>
                        {isEs ? 'Series' : 'Sets'}: {p.setsLogged}/{p.setsTotal} ({p.setsPct}%)
                      </span>
                      <span>{p.volumeLoggedKg.toLocaleString()} kg</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="cd-panel cd-panel--dense" aria-labelledby="ad-activity-title">
          <div className="cd-panel__head">
            <h2 id="ad-activity-title" className="cd-panel__title">
              <Activity size={16} aria-hidden />
              {isEs ? 'Actividad reciente' : 'Recent activity'}
            </h2>
          </div>
          <div className="cd-panel__body">
            {model.recentActivity.length === 0 ? (
              <p className="cd-empty-hint">
                {active ? (
                  <>
                    {formatRelativeDate(model.lastTrainingAt, isEs)} · {active.programName} ·{' '}
                    {active.daysDone}/{active.daysTotal} {isEs ? 'sesiones' : 'sessions'}
                  </>
                ) : (
                  isEs ? 'Sin actividad registrada aún.' : 'No activity logged yet.'
                )}
              </p>
            ) : (
              <ul className="cd-activity-feed">
                {model.recentActivity.map((item) => (
                  <li key={item.id} className={`cd-activity-item cd-activity-item--${item.kind === 'session' ? 'session' : 'pr'}`}>
                    <span className="cd-activity-item__dot" aria-hidden />
                    <div className="cd-activity-item__body">
                      <p>
                        <strong>{item.label}</strong> · {item.programName}
                      </p>
                      <time dateTime={item.at}>{formatRelativeDate(item.at, isEs)}</time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section id="ad-performance" className="cd-panel cd-panel--dense" aria-labelledby="ad-perf-title">
        <div className="cd-panel__head">
          <h2 id="ad-perf-title" className="cd-panel__title">
            <Award size={16} aria-hidden />
            {isEs ? 'Historial Stats & PRs' : 'Stats & PR history'}
          </h2>
        </div>
        <div className="cd-panel__body ad-perf-panel__body">
          <PerformanceStatsHistory
            language={language}
            persona="athlete"
            linkedWlAthleteId={athleteUser?.linkedAthleteId}
            intakes={intakes}
            appAthletes={appAthletes}
            embedded
          />
        </div>
      </section>
    </div>
  );
};

export default AthleteDashboard;
