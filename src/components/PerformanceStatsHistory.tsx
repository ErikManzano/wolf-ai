import React, { useMemo, useState } from 'react';
import './PerformanceStatsHistory.css';
import { Activity, Award, ClipboardList, TrendingUp } from 'lucide-react';
import type { IntakeData, Athlete as AppAthlete } from '../context/AppContext';
import type { WolfAppRole } from '../models/training';
import { appAthleteIdForWlProfile } from '../utils/wlStatsBridge';

function parseKg(s: string): number {
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

interface PerformanceStatsHistoryProps {
  language: 'ES' | 'EN';
  persona: WolfAppRole;
  linkedWlAthleteId?: string;
  intakes: IntakeData[];
  appAthletes: AppAthlete[];
  onGoToStats: () => void;
}

const PerformanceStatsHistory: React.FC<PerformanceStatsHistoryProps> = ({
  language,
  persona,
  linkedWlAthleteId,
  intakes,
  appAthletes,
  onGoToStats,
}) => {
  const isEs = language === 'ES';
  const [coachFilterId, setCoachFilterId] = useState<number | 'all'>('all');

  const selfAppAthleteId = useMemo(
    () => appAthleteIdForWlProfile(linkedWlAthleteId ?? 'ath-you') ?? 1,
    [linkedWlAthleteId],
  );

  const visibleIntakes = useMemo(() => {
    if (persona === 'athlete') {
      return intakes.filter((i) => i.athleteId === selfAppAthleteId).sort((a, b) => a.date.localeCompare(b.date));
    }
    if (coachFilterId === 'all') return [...intakes].sort((a, b) => a.date.localeCompare(b.date));
    return intakes.filter((i) => i.athleteId === coachFilterId).sort((a, b) => a.date.localeCompare(b.date));
  }, [intakes, persona, selfAppAthleteId, coachFilterId]);

  const maxSn = useMemo(
    () => Math.max(1, ...visibleIntakes.map((i) => parseKg(i.responses.snatch))),
    [visibleIntakes],
  );
  const maxCj = useMemo(
    () => Math.max(1, ...visibleIntakes.map((i) => parseKg(i.responses.cleanJerk))),
    [visibleIntakes],
  );

  const t = isEs
    ? {
        title: 'Historial Stats y PRs',
        sub: 'Cada envío desde «Stats y PRs» queda registrado. Tu coach (Ivan Hellequin) puede pedirte una nueva tanda cuando lo necesite.',
        coachPick: 'Filtrar por atleta',
        all: 'Todos',
        empty: 'Aún no hay registros. Envía tu perfil desde Stats y PRs.',
        tableDate: 'Fecha',
        tableSn: 'Snatch',
        tableCj: 'C&J',
        tableSq: 'Sent.',
        tableGoals: 'Objetivo',
        tableNote: 'Nota',
        chartSn: 'Evolución snatch (kg)',
        chartCj: 'Evolución C&J (kg)',
        cta: 'Nuevo registro / actualizar Stats',
      }
    : {
        title: 'Stats & PR history',
        sub: 'Each submission from “Stats & PRs” is stored. Your coach can ask for a fresh update when needed.',
        coachPick: 'Filter by athlete',
        all: 'All',
        empty: 'No entries yet. Submit your profile from Stats & PRs.',
        tableDate: 'Date',
        tableSn: 'Snatch',
        tableCj: 'C&J',
        tableSq: 'Squat',
        tableGoals: 'Goal',
        tableNote: 'Note',
        chartSn: 'Snatch trend (kg)',
        chartCj: 'C&J trend (kg)',
        cta: 'New entry / update Stats',
      };

  return (
    <div className="perf-stats-history">
      <div className="perf-stats-head">
        <ClipboardList size={22} strokeWidth={2} aria-hidden />
        <div>
          <h2 className="perf-stats-title">{t.title}</h2>
          <p className="perf-stats-sub">{t.sub}</p>
        </div>
      </div>

      {persona === 'coach' && (
        <label className="perf-stats-filter">
          <span>{t.coachPick}</span>
          <select value={coachFilterId === 'all' ? 'all' : String(coachFilterId)} onChange={(e) => setCoachFilterId(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">{t.all}</option>
            {appAthletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {visibleIntakes.length === 0 ? (
        <p className="perf-stats-empty">{t.empty}</p>
      ) : (
        <>
          <div className="perf-stats-charts">
            <div className="micro-card glass perf-chart-card">
              <h3>
                <TrendingUp size={18} /> {t.chartSn}
              </h3>
              <div className="perf-bar-row" role="img" aria-label={t.chartSn}>
                {visibleIntakes.map((row) => {
                  const v = parseKg(row.responses.snatch);
                  return (
                    <div key={`sn-${row.id}`} className="perf-bar-wrap">
                      <div className="perf-bar-fill" style={{ height: `${(v / maxSn) * 100}%` }} title={`${row.date}: ${v} kg`} />
                      <span className="perf-bar-label">{row.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="micro-card glass perf-chart-card">
              <h3>
                <Activity size={18} /> {t.chartCj}
              </h3>
              <div className="perf-bar-row" role="img" aria-label={t.chartCj}>
                {visibleIntakes.map((row) => {
                  const v = parseKg(row.responses.cleanJerk);
                  return (
                    <div key={`cj-${row.id}`} className="perf-bar-wrap">
                      <div className="perf-bar-fill perf-bar-fill--secondary" style={{ height: `${(v / maxCj) * 100}%` }} title={`${row.date}: ${v} kg`} />
                      <span className="perf-bar-label">{row.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="micro-card glass perf-table-card">
            <h3>
              <Award size={18} /> PRs por envío
            </h3>
            <div className="perf-table-scroll">
              <table className="perf-table">
                <thead>
                  <tr>
                    <th>{t.tableDate}</th>
                    <th>{t.tableSn}</th>
                    <th>{t.tableCj}</th>
                    <th>{t.tableSq}</th>
                    <th>{t.tableGoals}</th>
                    <th>{t.tableNote}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleIntakes.map((row) => (
                    <tr key={row.id}>
                      <td>{row.date}</td>
                      <td>{row.responses.snatch} kg</td>
                      <td>{row.responses.cleanJerk} kg</td>
                      <td>{row.responses.backSquat} kg</td>
                      <td className="perf-table-goals">{row.responses.goals}</td>
                      <td className="perf-table-note">{row.coachNote ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {persona === 'athlete' && (
        <div className="perf-stats-actions">
          <button type="button" className="btn-primary" onClick={onGoToStats}>
            {t.cta}
          </button>
        </div>
      )}
    </div>
  );
};

export default PerformanceStatsHistory;
