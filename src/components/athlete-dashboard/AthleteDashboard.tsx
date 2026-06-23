import React, { useMemo } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  CalendarCheck,
  ClipboardCheck,
  Dumbbell,
  Flame,
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
import './AthleteDashboard.css';
import '../SuperDashboard.css';

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
  } = useWolfAssign();

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

  return (
    <div className="athlete-dashboard super-dashboard">
      <header className="ad-hero" aria-labelledby="ad-main-title">
        <div className="ad-hero__inner">
          <div className="ad-hero__copy">
            <p className="sd-hero__eyebrow">{isEs ? 'Panel de rendimiento' : 'Performance panel'}</p>
            <div className="ad-hero__title-row">
              <h1 id="ad-main-title" className="sd-hero__title">
                {model.displayName}
              </h1>
              <LevelBadge level={model.level} isEs={isEs} />
            </div>
            <p className="sd-hero__sub">
              {isEs
                ? 'Datos en vivo de tus planes WL, series registradas y PRs — sin estimaciones de demo.'
                : 'Live data from your WL plans, logged sets, and PRs — no demo placeholders.'}
            </p>
            <div className="ad-hero__signals">
              <span className="ad-signal" title={isEs ? 'Preparación' : 'Readiness'}>
                <Gauge size={14} aria-hidden />
                {isEs ? 'Listo' : 'Ready'} {model.readinessScore}%
              </span>
              <span className="ad-signal" title={isEs ? 'Fatiga acumulada' : 'Fatigue'}>
                <Activity size={14} aria-hidden />
                {isEs ? 'Fatiga' : 'Fatigue'} {model.fatigueScore}%
              </span>
              {model.bodyweight > 0 ? (
                <span className="ad-signal">
                  {model.bodyweight} kg BW
                </span>
              ) : null}
            </div>
          </div>
          <div className="ad-hero__cta">
            {next ? (
              <button type="button" className="ad-cta-btn" onClick={onOpenPlan}>
                <Zap size={18} aria-hidden />
                <span>
                  {isEs ? 'Continuar entreno' : 'Resume training'}
                  <small>
                    S{next.weekNumber} · D{next.dayNumber}
                    {next.dayLabel ? ` · ${next.dayLabel}` : ''}
                  </small>
                </span>
                <ArrowRight size={18} aria-hidden />
              </button>
            ) : (
              <button type="button" className="ad-cta-btn ad-cta-btn--ghost" onClick={onOpenPlan}>
                <ClipboardCheck size={18} aria-hidden />
                {isEs ? 'Abrir mi plan WL' : 'Open my WL plan'}
              </button>
            )}
          </div>
        </div>
      </header>

      {!model.hasLinkedProfile && myAssignments.length === 0 && !assignmentsLoading ? (
        <div className="sd-banner" role="status">
          {isEs
            ? 'Aún no tienes planes asignados. Tu coach debe asignarte un programa desde Programas.'
            : 'No plans assigned yet. Your coach must assign a program from Programs.'}
        </div>
      ) : null}

      <section className="sd-kpi-grid" aria-label={isEs ? 'Indicadores' : 'Metrics'}>
        <article className="sd-kpi">
          <div className="sd-kpi__icon">
            <CalendarCheck size={26} color="var(--color-accent)" aria-hidden />
          </div>
          <h3 className="sd-kpi__label">{isEs ? 'Sesiones completadas' : 'Sessions completed'}</h3>
          <p className="sd-kpi__value">
            {model.aggregate.daysDone}
            <span className="ad-kpi__unit">/{model.aggregate.daysTotal || '—'}</span>
          </p>
          <p className="sd-kpi__hint">{model.aggregate.daysPct}% {isEs ? 'del mesociclo' : 'of mesocycle'}</p>
        </article>
        <article className="sd-kpi">
          <div className="sd-kpi__icon">
            <Dumbbell size={26} color="var(--color-success)" aria-hidden />
          </div>
          <h3 className="sd-kpi__label">{isEs ? 'Series registradas' : 'Sets logged'}</h3>
          <p className="sd-kpi__value">
            {model.aggregate.setsLogged}
            <span className="ad-kpi__unit">/{model.aggregate.setsTotal || '—'}</span>
          </p>
          <p className="sd-kpi__hint">{model.aggregate.setsPct}% {isEs ? 'adherencia granular' : 'granular adherence'}</p>
        </article>
        <article className="sd-kpi">
          <div className="sd-kpi__icon">
            <BarChart3 size={26} color="var(--color-warning)" aria-hidden />
          </div>
          <h3 className="sd-kpi__label">{isEs ? 'Volumen registrado' : 'Logged volume'}</h3>
          <p className="sd-kpi__value">{model.aggregate.volumeLoggedKg.toLocaleString()}</p>
          <p className="sd-kpi__hint">kg · {isEs ? 'carga × reps reales' : 'actual load × reps'}</p>
        </article>
        <article className="sd-kpi">
          <div className="sd-kpi__icon">
            <Flame size={26} color="var(--color-accent)" aria-hidden />
          </div>
          <h3 className="sd-kpi__label">{isEs ? 'Racha / semana' : 'Streak / week'}</h3>
          <p className="sd-kpi__value">
            {model.streakDays}
            <span className="ad-kpi__unit">d</span>
          </p>
          <p className="sd-kpi__hint">
            {model.aggregate.sessionsThisWeek} {isEs ? 'sesiones esta semana' : 'sessions this week'}
          </p>
        </article>
      </section>

      <section className="ad-pr-strip" aria-label={isEs ? 'Marcas actuales' : 'Current marks'}>
        {[
          { key: 'sn', label: 'Snatch', value: model.oneRM.snatch },
          { key: 'cj', label: 'C&J', value: model.oneRM.cleanJerk },
          { key: 'bs', label: isEs ? 'Sentadilla' : 'Back squat', value: model.oneRM.backSquat },
          { key: 'fs', label: isEs ? 'Front squat' : 'Front squat', value: model.oneRM.frontSquat },
          ...(model.deadliftKg ? [{ key: 'dl', label: 'Deadlift', value: model.deadliftKg }] : []),
        ].map((pr) => (
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
      </section>

      {model.programs.length > 0 ? (
        <section className="sd-section" aria-labelledby="ad-plans-title">
          <div className="sd-section__head">
            <h2 id="ad-plans-title" className="sd-section__title">
              {isEs ? 'Planes activos' : 'Active plans'}
            </h2>
            <p className="sd-section__desc">
              {isEs ? 'Progreso por programa asignado en el motor WL.' : 'Progress per WL engine assignment.'}
            </p>
          </div>
          <div className="ad-plan-grid">
            {model.programs.map((p) => (
              <article key={p.assignmentId} className="ad-plan-card">
                <header className="ad-plan-card__head">
                  <h3>{p.programName}</h3>
                  <span className="ad-plan-card__pct">{p.completionPct}%</span>
                </header>
                <div className="ad-progress">
                  <div className="ad-progress__bar" style={{ width: `${p.completionPct}%` }} />
                </div>
                <ul className="ad-plan-card__stats">
                  <li>
                    {isEs ? 'Sesiones' : 'Sessions'}: {p.daysDone}/{p.daysTotal}
                  </li>
                  <li>
                    {isEs ? 'Series' : 'Sets'}: {p.setsLogged}/{p.setsTotal} ({p.setsPct}%)
                  </li>
                  <li>
                    {isEs ? 'Ejercicios' : 'Exercises'}: {p.exercisesDone}/{p.exercisesTotal}
                  </li>
                  <li>
                    {isEs ? 'Volumen' : 'Volume'}: {p.volumeLoggedKg.toLocaleString()} kg
                  </li>
                </ul>
                <footer className="ad-plan-card__foot">
                  <span>{isEs ? 'Asignado' : 'Assigned'} {p.assignedAt}</span>
                  <span>{formatRelativeDate(p.lastActivityAt, isEs)}</span>
                </footer>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="sd-section">
        <div className="sd-insights">
          <div className="sd-insight">
            <h3>
              <Target size={18} color="var(--color-accent)" aria-hidden />
              {isEs ? 'Próxima sesión' : 'Next session'}
            </h3>
            {!next ? (
              <p className="sd-insight__hint" style={{ margin: 0 }}>
                {myAssignments.length === 0
                  ? isEs
                    ? 'Sin planes asignados.'
                    : 'No assigned plans.'
                  : isEs
                    ? 'Mesociclo completado — consulta con tu coach el siguiente bloque.'
                    : 'Mesocycle complete — check with your coach for the next block.'}
              </p>
            ) : (
              <>
                <p className="ad-next-session">
                  <strong>{next.programName}</strong>
                  <span>
                    {isEs ? 'Semana' : 'Week'} {next.weekNumber} · {isEs ? 'Día' : 'Day'} {next.dayNumber}
                    {next.dayLabel ? ` — ${next.dayLabel}` : ''}
                  </span>
                </p>
                <button type="button" className="btn-outline ad-inline-btn" onClick={onOpenPlan}>
                  {isEs ? 'Ir al entreno' : 'Go to workout'}
                </button>
              </>
            )}
          </div>

          <div className="sd-insight">
            <h3>
              <TrendingUp size={18} color="var(--color-success)" aria-hidden />
              {isEs ? 'Tendencia olímpica' : 'Olympic trend'}
            </h3>
            {model.volumeSpark.length === 0 ? (
              <p className="sd-insight__hint" style={{ margin: 0 }}>
                {isEs ? 'Sin envíos Stats vinculados aún.' : 'No linked Stats submissions yet.'}
              </p>
            ) : (
              <>
                <div className="sd-spark" role="img" aria-label={isEs ? 'Snatch + C&J' : 'Snatch + C&J'}>
                  {model.volumeSpark.map((b) => (
                    <div key={b.id} className="sd-spark__bar">
                      <div className="sd-spark__fill" style={{ height: `${Math.max(8, b.h)}%` }} title={b.label} />
                      <span className="sd-spark__label">{b.label}</span>
                    </div>
                  ))}
                </div>
                <p className="sd-insight__hint">
                  {isEs ? 'Snatch + C&J por envío Stats.' : 'Snatch + C&J per Stats entry.'}
                </p>
              </>
            )}
          </div>

          <div className="sd-insight">
            <h3>
              <Award size={18} color="var(--color-warning)" aria-hidden />
              {isEs ? 'Última actividad' : 'Last activity'}
            </h3>
            <p className="ad-next-session">
              <strong>{formatRelativeDate(model.lastTrainingAt, isEs)}</strong>
              {active ? (
                <span>
                  {active.programName} · {active.daysDone}/{active.daysTotal}{' '}
                  {isEs ? 'sesiones' : 'sessions'}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      {model.recentActivity.length > 0 ? (
        <section className="sd-section" aria-labelledby="ad-activity-title">
          <div className="sd-section__head">
            <h2 id="ad-activity-title" className="sd-section__title">
              {isEs ? 'Actividad reciente' : 'Recent activity'}
            </h2>
          </div>
          <ul className="ad-activity-list">
            {model.recentActivity.map((item) => (
              <li key={item.id} className="ad-activity-item">
                <span className={`ad-activity-item__dot ad-activity-item__dot--${item.kind}`} aria-hidden />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.programName}</span>
                </div>
                <time dateTime={item.at}>{formatRelativeDate(item.at, isEs)}</time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="ad-performance" className="sd-section" aria-labelledby="ad-perf-title">
        <div className="sd-section__head">
          <h2 id="ad-perf-title" className="sd-section__title">
            {isEs ? 'Historial Stats & PRs' : 'Stats & PR history'}
          </h2>
        </div>
        <div className="sd-perf-embed">
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
