import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Users,
} from 'lucide-react';
import type { Athlete as AppAthlete, IntakeData } from '../../context/AppContext';
import type {
  Athlete,
  Exercise,
  ProgramAssignment,
  SessionCompletion,
  SetCompletionLog,
  WolfAppRole,
} from '../../models/training';
import type { DashboardAlert } from '../../utils/dashboardStats';
import {
  buildCoachDashboardModel,
  type CoachDashboardScope,
} from '../../utils/coachDashboardStats';
import PerformanceStatsHistory from '../PerformanceStatsHistory';
import {
  ProgramStatsDonutChart,
  ProgramStatsWeekVolumeChart,
  type ProgramStatsKpiCard,
  ProgramStatsKpiGrid,
} from '../session-editor/programStatsShared';
import '../SuperDashboard.css';
import './coach-dashboard.css';
import '../session-editor/session-sheet-spreadsheet.css';

export interface CoachDashboardProps {
  language: 'ES' | 'EN';
  persona: WolfAppRole;
  intakes: IntakeData[];
  appAthletes: AppAthlete[];
  wlProgramAssignments: ProgramAssignment[];
  completions: SessionCompletion[];
  setLogs: SetCompletionLog[];
  wlAthletes: Athlete[];
  motorExercises: Exercise[];
  alerts: DashboardAlert[];
  onAlertNavigate: (alert: DashboardAlert) => void;
  onOpenPrograms: (coachProgramId?: string) => void;
  onOpenAthletes: () => void;
}

function formatRelativeTime(iso: string, isEs: boolean): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString(isEs ? 'es' : 'en', { hour: '2-digit', minute: '2-digit' });
    }
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 1) return isEs ? 'Ayer' : 'Yesterday';
    return d.toLocaleDateString(isEs ? 'es' : 'en', { day: 'numeric', month: 'short' });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatTrend(delta: number | null, isEs: boolean, unit?: string): string | undefined {
  if (delta == null || delta === 0) return isEs ? '— vs periodo anterior' : '— vs prior period';
  const sign = delta > 0 ? '↑' : '↓';
  const abs = Math.abs(delta);
  const suffix = unit ?? (isEs ? 'vs periodo anterior' : 'vs prior period');
  return `${sign} ${abs} ${suffix}`;
}

function formatLoadTrend(pct: number | null, isEs: boolean): string | undefined {
  if (pct == null) return undefined;
  if (pct === 0) return isEs ? '— vs periodo anterior' : '— vs prior period';
  const sign = pct > 0 ? '↑' : '↓';
  return `${sign} ${Math.abs(pct)}% ${isEs ? 'vs periodo anterior' : 'vs prior period'}`;
}

function athleteInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

const CoachDashboard: React.FC<CoachDashboardProps> = ({
  language,
  persona,
  intakes,
  appAthletes,
  wlProgramAssignments,
  completions,
  setLogs,
  wlAthletes,
  motorExercises,
  alerts,
  onAlertNavigate,
  onOpenPrograms,
  onOpenAthletes,
}) => {
  const isEs = language === 'ES';
  const [scope, setScope] = useState<CoachDashboardScope>('week');
  const [refDate, setRefDate] = useState(() => new Date());
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const shiftPeriod = (direction: -1 | 1) => {
    setRefDate((prev) => {
      const d = new Date(prev);
      if (scope === 'today') d.setDate(d.getDate() + direction);
      else if (scope === 'week') d.setDate(d.getDate() + direction * 7);
      else d.setMonth(d.getMonth() + direction);
      return d;
    });
  };

  const loadTitle =
    scope === 'today'
      ? isEs
        ? 'Carga del día'
        : 'Daily load'
      : scope === 'week'
        ? isEs
          ? 'Carga total semanal'
          : 'Total weekly load'
        : isEs
          ? 'Carga del mes'
          : 'Monthly load';

  const loadCenter =
    model.weeklyLoadTotalKg >= 1000
      ? `${(model.weeklyLoadTotalKg / 1000).toFixed(1)} t`
      : `${model.weeklyLoadTotalKg.toLocaleString()} kg`;

  const kpiCards: ProgramStatsKpiCard[] = [
    {
      id: 'athletes',
      label: isEs ? 'Atletas' : 'Athletes',
      value: String(model.kpis.athletes),
      sub: formatTrend(model.kpis.athletesActiveDelta, isEs, isEs ? 'activos vs anterior' : 'active vs prior'),
      subAccent: (model.kpis.athletesActiveDelta ?? 0) >= 0 ? 'success' : 'muted',
      accent: 'default',
    },
    {
      id: 'programs',
      label: isEs ? 'Programas activos' : 'Active programs',
      value: String(model.kpis.activePrograms),
      sub: isEs ? `${wlProgramAssignments.length} asignaciones` : `${wlProgramAssignments.length} assignments`,
      subAccent: 'muted',
      accent: 'exercises',
    },
    {
      id: 'sessions',
      label:
        scope === 'today'
          ? isEs
            ? 'Sesiones hoy'
            : 'Sessions today'
          : scope === 'week'
            ? isEs
              ? 'Sesiones esta semana'
              : 'Sessions this week'
            : isEs
              ? 'Sesiones este mes'
              : 'Sessions this month',
      value: String(model.kpis.sessionsInScope),
      sub: formatTrend(model.kpis.sessionsDelta, isEs),
      subAccent: (model.kpis.sessionsDelta ?? 0) >= 0 ? 'success' : 'muted',
      accent: 'sets',
    },
    {
      id: 'alerts',
      label: isEs ? 'Alertas' : 'Alerts',
      value: String(model.kpis.alertsCount),
      sub:
        model.kpis.alertsCount > 0
          ? isEs
            ? 'Requieren atención'
            : 'Need attention'
          : isEs
            ? 'Todo en orden'
            : 'All clear',
      subAccent: model.kpis.alertsCount > 0 ? 'volume' : 'success',
      accent: 'intensity',
      visualValue: model.kpis.alertsCount > 0 ? Math.min(100, model.kpis.alertsCount * 25) : 0,
    },
  ];

  const donutSlices = model.stimulusSlices.map((slice) => ({
    label: slice.label,
    tonnage: slice.tonnage,
    pct: slice.pct,
  }));

  const scopeTabs: { id: CoachDashboardScope; label: string }[] = [
    { id: 'today', label: isEs ? 'Hoy' : 'Today' },
    { id: 'week', label: isEs ? 'Semana' : 'Week' },
    { id: 'month', label: isEs ? 'Mes' : 'Month' },
  ];

  const alertAccent = (s: DashboardAlert['severity']) =>
    s === 'danger' ? 'var(--color-danger)' : s === 'warning' ? 'var(--color-warning)' : 'var(--color-accent)';

  return (
    <div className="mock-view super-dashboard coach-dashboard">
      <div className="cd-toolbar">
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

      <div className="wolf-program-day-stats wolf-program-day-stats--dashboard cd-kpis">
        <ProgramStatsKpiGrid cards={kpiCards} />
      </div>

      <div className="cd-analytics-grid">
        <section className="cd-panel cd-panel--chart">
          <div className="cd-panel__head">
            <div>
              <h2 className="cd-panel__title">{loadTitle}</h2>
              <p className="cd-panel__metric">
                <strong>{loadCenter}</strong>
                {model.weeklyLoadTrendPct != null ? (
                  <span
                    className={`cd-panel__trend${
                      model.weeklyLoadTrendPct >= 0 ? ' cd-panel__trend--up' : ' cd-panel__trend--down'
                    }`}
                  >
                    {formatLoadTrend(model.weeklyLoadTrendPct, isEs)}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <div className="wolf-program-day-stats wolf-program-day-stats--dashboard">
            {model.weeklyLoad.some((d) => d.tonnage > 0) ? (
              <ProgramStatsWeekVolumeChart
                title=""
                days={model.weeklyLoad}
                isEs={isEs}
              />
            ) : (
              <p className="cd-empty-hint">
                {isEs ? 'Sin carga registrada en este periodo.' : 'No load logged in this period.'}
              </p>
            )}
          </div>
        </section>

        <section className="cd-panel">
          <div className="wolf-program-day-stats wolf-program-day-stats--dashboard">
            {donutSlices.length > 0 ? (
              <ProgramStatsDonutChart
                title={isEs ? 'Distribución de estímulo' : 'Stimulus distribution'}
                centerLabel={loadCenter}
                centerSub={isEs ? 'tonelaje' : 'tonnage'}
                slices={donutSlices}
                isEs={isEs}
              />
            ) : (
              <>
                <h2 className="cd-panel__title">{isEs ? 'Distribución de estímulo' : 'Stimulus distribution'}</h2>
                <p className="cd-empty-hint">
                  {isEs ? 'Registra series en el motor WL para ver el reparto.' : 'Log sets in the WL engine to see distribution.'}
                </p>
              </>
            )}
          </div>
        </section>
      </div>

      <div className="cd-split-grid">
        <section className="cd-panel" aria-labelledby="cd-athletes-title">
          <div className="cd-panel__head">
            <h2 id="cd-athletes-title" className="cd-panel__title">
              <Users size={18} aria-hidden />
              {isEs ? 'Estado de atletas' : 'Athlete status'}
            </h2>
            <button type="button" className="cd-link-btn" onClick={onOpenAthletes}>
              {isEs ? 'Ver todos' : 'View all'}
            </button>
          </div>
          <div className="cd-table-shell">
            {model.athleteRows.length === 0 ? (
              <p className="cd-empty-hint">{isEs ? 'No hay asignaciones WL.' : 'No WL assignments.'}</p>
            ) : (
              <table className="cd-athlete-table">
                <thead>
                  <tr>
                    <th>{isEs ? 'Atleta' : 'Athlete'}</th>
                    <th>{isEs ? 'Programa' : 'Program'}</th>
                    <th>{isEs ? 'Semana' : 'Week'}</th>
                    <th>%</th>
                    <th>{isEs ? 'Estado' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {model.athleteRows.slice(0, 8).map((row) => (
                    <tr key={row.assignmentId}>
                      <td>
                        <div className="cd-athlete-cell">
                          <span className="cd-avatar" aria-hidden>
                            {athleteInitials(row.athleteName)}
                          </span>
                          <span>{row.athleteName}</span>
                        </div>
                      </td>
                      <td>{row.programName}</td>
                      <td>{row.weekLabel}</td>
                      <td>{row.completionPct}%</td>
                      <td>
                        <span className={`cd-status cd-status--${row.status}`}>{row.statusLabel}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="cd-panel" aria-labelledby="cd-alerts-title">
          <div className="cd-panel__head">
            <h2 id="cd-alerts-title" className="cd-panel__title">
              <Bell size={18} aria-hidden />
              {isEs ? 'Alertas inteligentes' : 'Smart alerts'}
            </h2>
          </div>
          {model.alerts.length === 0 ? (
            <div className="cd-alert cd-alert--ok">
              <p>{isEs ? 'Sin alertas según los datos actuales.' : 'No alerts for the current data.'}</p>
            </div>
          ) : (
            <ul className="cd-alert-feed">
              {model.alerts.slice(0, 6).map((alert) => (
                <li key={alert.id} className="cd-alert-item">
                  <span className="cd-alert-item__dot" style={{ background: alertAccent(alert.severity) }} aria-hidden />
                  <div className="cd-alert-item__body">
                    <strong>{alert.title}</strong>
                    <p>{alert.description}</p>
                  </div>
                  <button type="button" className="cd-link-btn" onClick={() => onAlertNavigate(alert)}>
                    {alert.actionLabel}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="cd-split-grid">
        <section className="cd-panel" aria-labelledby="cd-programs-title">
          <div className="cd-panel__head">
            <h2 id="cd-programs-title" className="cd-panel__title">
              <ClipboardList size={18} aria-hidden />
              {isEs ? 'Programas activos' : 'Active programs'}
            </h2>
            <button type="button" className="cd-link-btn" onClick={() => onOpenPrograms()}>
              {isEs ? 'Ver todos' : 'View all'}
            </button>
          </div>
          {model.activePrograms.length === 0 ? (
            <p className="cd-empty-hint">{isEs ? 'Sin programas asignados.' : 'No assigned programs.'}</p>
          ) : (
            <ul className="cd-program-list">
              {model.activePrograms.slice(0, 6).map((prog) => (
                <li key={prog.programName} className="cd-program-item">
                  <div className="cd-program-item__head">
                    <strong>{prog.programName}</strong>
                    <span>{prog.weekLabel}</span>
                  </div>
                  <div className="cd-progress" aria-hidden>
                    <span className="cd-progress__fill" style={{ width: `${prog.completionPct}%` }} />
                  </div>
                  <div className="cd-program-item__meta">
                    <span>{prog.completionPct}%</span>
                    <span>
                      {prog.athleteCount} {isEs ? (prog.athleteCount === 1 ? 'atleta' : 'atletas') : prog.athleteCount === 1 ? 'athlete' : 'athletes'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cd-panel" aria-labelledby="cd-activity-title">
          <div className="cd-panel__head">
            <h2 id="cd-activity-title" className="cd-panel__title">
              <AlertTriangle size={18} aria-hidden />
              {isEs ? 'Actividad reciente' : 'Recent activity'}
            </h2>
          </div>
          {model.recentActivity.length === 0 ? (
            <p className="cd-empty-hint">{isEs ? 'Sin actividad registrada aún.' : 'No activity logged yet.'}</p>
          ) : (
            <ul className="cd-activity-feed">
              {model.recentActivity.map((item) => (
                <li key={item.id} className={`cd-activity-item cd-activity-item--${item.kind}`}>
                  <span className="cd-activity-item__icon" aria-hidden />
                  <div className="cd-activity-item__body">
                    <p>
                      <strong>{item.athleteName}</strong> {item.label}
                    </p>
                    <time dateTime={item.at}>{formatRelativeTime(item.at, isEs)}</time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="cd-panel cd-panel--history">
        <button
          type="button"
          className="cd-history-toggle"
          aria-expanded={historyOpen}
          onClick={() => setHistoryOpen((v) => !v)}
        >
          {historyOpen
            ? isEs
              ? 'Ocultar historial Stats / PRs'
              : 'Hide Stats / PR history'
            : isEs
              ? 'Ver historial Stats / PRs completo'
              : 'View full Stats / PR history'}
        </button>
        {historyOpen ? (
          <div className="sd-perf-embed">
            <PerformanceStatsHistory
              language={language}
              persona={persona}
              intakes={intakes}
              appAthletes={appAthletes}
              embedded
            />
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default CoachDashboard;
