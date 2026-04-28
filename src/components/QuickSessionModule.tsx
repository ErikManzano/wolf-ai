import React, { useCallback, useMemo, useState } from 'react';
import { Gauge, Play, RefreshCw, Sparkles } from 'lucide-react';
import type { Session, SessionGoal } from '../models/training';
import { mockAthletes, mockExercises } from '../data/loadMockData';
import { generateSession } from '../services/sessionGenerator';
import { adaptSession } from '../services/adaptiveEngine';
import { simulateMicrocycle, type MicrocycleSimulationResult } from '../services/simulateMicrocycle';
import { evaluateSessionFull } from '../services/sessionEvaluator';
import OlympicSessionEditor from './OlympicSessionEditor';
import './OlympicEnginePanel.css';

const GOALS: SessionGoal[] = ['technique', 'strength', 'power'];

interface QuickSessionModuleProps {
  language: 'ES' | 'EN';
}

const QuickSessionModule: React.FC<QuickSessionModuleProps> = ({ language }) => {
  const isEs = language === 'ES';
  const [athleteId, setAthleteId] = useState(() => mockAthletes.find((a) => a.id === 'ath-you')?.id ?? mockAthletes[0]?.id ?? '');
  const [goal, setGoal] = useState<SessionGoal>('strength');
  const [fatigueOverride, setFatigueOverride] = useState(48);
  const [quickSession, setQuickSession] = useState<Session | null>(null);
  const [simResult, setSimResult] = useState<MicrocycleSimulationResult | null>(null);

  const athlete = useMemo(() => mockAthletes.find((a) => a.id === athleteId) ?? null, [athleteId]);
  const athleteForEngine = useMemo(() => (athlete ? { ...athlete, fatigueScore: fatigueOverride } : null), [athlete, fatigueOverride]);

  const t = useMemo(
    () => ({
      title: isEs ? 'Sesión rápida WL' : 'WL quick session',
      subtitle: isEs ? 'Genera, adapta y simula sesiones sin tocar tu plan principal.' : 'Generate, adapt, and simulate sessions without touching your main plan.',
      athlete: isEs ? 'Atleta' : 'Athlete',
      goal: isEs ? 'Objetivo' : 'Goal',
      fatigue: isEs ? 'Fatiga (sim.)' : 'Fatigue (sim.)',
      gen: isEs ? 'Generar sesión' : 'Generate session',
      adapt: isEs ? 'Adaptar (motor)' : 'Adapt (engine)',
      sim: isEs ? 'Simular 4 semanas' : 'Simulate 4 weeks',
      metrics: isEs ? 'Resumen' : 'Summary',
      status: isEs ? 'Estado' : 'Status',
      under: isEs ? 'Infra-carga' : 'Undertrained',
      optimal: isEs ? 'Óptimo' : 'Optimal',
      over: isEs ? 'Sobre-carga' : 'Overtrained',
      empty: isEs ? 'Genera una sesión para editarla aquí.' : 'Generate a session to edit here.',
      weeks: isEs ? 'Microciclo simulado' : 'Microcycle simulation',
      technique: isEs ? 'Técnica' : 'Technique',
      strength: isEs ? 'Fuerza' : 'Strength',
      power: isEs ? 'Potencia' : 'Power',
    }),
    [isEs],
  );

  const goalLabel = (g: SessionGoal) => (g === 'technique' ? t.technique : g === 'strength' ? t.strength : t.power);
  const statusLabel = (s: string) => (s === 'undertrained' ? t.under : s === 'optimal' ? t.optimal : t.over);

  const quickEval = useMemo(() => {
    if (!quickSession || !athleteForEngine) return null;
    return evaluateSessionFull(quickSession, athleteForEngine, mockExercises).evaluation;
  }, [quickSession, athleteForEngine]);

  const handleQuickGenerate = useCallback(() => {
    if (!athleteForEngine) return;
    const next = generateSession(athleteForEngine.id, goal, athleteForEngine, mockExercises);
    setQuickSession(next);
    setSimResult(null);
  }, [athleteForEngine, goal]);

  const handleQuickAdapt = useCallback(() => {
    if (!quickSession || !athleteForEngine) return;
    setQuickSession(adaptSession(quickSession, athleteForEngine, mockExercises));
  }, [quickSession, athleteForEngine]);

  const handleSimulate = useCallback(() => {
    if (!athleteForEngine) return;
    setSimResult(simulateMicrocycle(athleteForEngine, mockExercises, goal));
  }, [athleteForEngine, goal]);

  return (
    <div className="wolf-engine">
      <header className="wolf-coach-hero">
        <div className="wolf-coach-hero-accent" aria-hidden />
        <div className="wolf-coach-hero-inner">
          <div className="wolf-coach-hero-icon-wrap">
            <Gauge size={26} strokeWidth={2} />
          </div>
          <div className="wolf-coach-hero-text">
            <h1 className="wolf-coach-title view-title">{t.title}</h1>
            <p className="wolf-coach-sub">{t.subtitle}</p>
          </div>
        </div>
      </header>

      <div className="wolf-engine-controls-card">
        <div className="wolf-engine-shared-controls">
          <label className="wolf-engine-field">
            <span>{t.athlete}</span>
            <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
              {mockAthletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.level})
                </option>
              ))}
            </select>
          </label>
          <label className="wolf-engine-field">
            <span>{t.goal}</span>
            <select value={goal} onChange={(e) => setGoal(e.target.value as SessionGoal)}>
              {GOALS.map((g) => (
                <option key={g} value={g}>
                  {goalLabel(g)}
                </option>
              ))}
            </select>
          </label>
          <label className="wolf-engine-field wolf-engine-field-wide">
            <span>
              {t.fatigue}: {fatigueOverride}
            </span>
            <input type="range" min={0} max={100} value={fatigueOverride} onChange={(e) => setFatigueOverride(Number(e.target.value))} />
          </label>
        </div>
      </div>

      <div className="content-area wolf-engine-content">
        <div className="wolf-engine-quick-panel">
          <div className="wolf-quick-actions">
            <button type="button" className="btn-primary" onClick={handleQuickGenerate}>
              <Play size={18} /> {t.gen}
            </button>
            <button type="button" className="btn-secondary" onClick={handleQuickAdapt} disabled={!quickSession}>
              <RefreshCw size={18} /> {t.adapt}
            </button>
            <button type="button" className="btn-outline" onClick={handleSimulate}>
              <Sparkles size={18} /> {t.sim}
            </button>
          </div>

          {quickEval && (
            <section className="wolf-engine-metrics wolf-engine-metrics--card">
              <h2>{t.metrics}</h2>
              <div className="wolf-engine-metric-grid">
                <div><span className="muted">K</span><strong>{quickEval.kValue}</strong></div>
                <div><span className="muted">{isEs ? 'kg tot.' : 'Load'}</span><strong>{quickEval.load}</strong></div>
                <div><span className="muted">Reps</span><strong>{quickEval.totalReps}</strong></div>
                <div><span className="muted">%∅</span><strong>{quickEval.avgRelativeIntensity}</strong></div>
                <div><span className="muted">{t.status}</span><strong className={`wolf-status wolf-status--${quickEval.status}`}>{statusLabel(quickEval.status)}</strong></div>
              </div>
            </section>
          )}

          {quickSession && athleteForEngine ? (
            <OlympicSessionEditor session={quickSession} athlete={athleteForEngine} exercises={mockExercises} isEs={isEs} onChange={setQuickSession} />
          ) : (
            <p className="wolf-engine-empty">{t.empty}</p>
          )}

          {simResult && (
            <section className="wolf-engine-sim wolf-engine-sim--card">
              <h2>{t.weeks}</h2>
              <div className="wolf-engine-week-grid">
                {simResult.weeks.map((w) => (
                  <div key={w.weekIndex} className="wolf-engine-week-card">
                    <div className="wolf-engine-week-head">{isEs ? 'Semana' : 'Week'} {w.weekIndex}</div>
                    <div className="wolf-engine-week-stats">
                      <span>K ∅ {w.avgK}</span>
                      <span>{isEs ? 'Fatiga' : 'Fatigue'} {w.fatigueScore}</span>
                      <span>{isEs ? 'Listo' : 'Ready'} {w.readinessScore}</span>
                      <span>{isEs ? 'Rend.' : 'Perf.'} {w.estimatedPerformance}</span>
                    </div>
                    <div className="wolf-engine-k-bar">
                      <div className="wolf-engine-k-fill" style={{ width: `${Math.min(100, w.avgK)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickSessionModule;
