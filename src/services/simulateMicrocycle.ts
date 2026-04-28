import type { Athlete, Exercise, Session, SessionGoal, SessionEvaluation } from '../models/training';
import { K_VALUE_RANGES } from '../models/training';
import { generateSession } from './sessionGenerator';
import { evaluateSession } from './sessionEvaluator';
import { adaptSession } from './adaptiveEngine';

export interface MicrocycleWeekChart {
  weekIndex: number;
  /** Promedio K de las sesiones simuladas en la semana */
  avgK: number;
  fatigueScore: number;
  readinessScore: number;
  /** 0–100: progreso estimado según proximidad a banda K óptima y tendencia de fatiga */
  estimatedPerformance: number;
  sessions: Session[];
  evaluations: SessionEvaluation[];
}

export interface MicrocycleSimulationResult {
  athleteId: string;
  /** 4 semanas, listo para librerías de gráficos */
  weeks: MicrocycleWeekChart[];
  /** Serie temporal plana (K por sesión) */
  kSeries: { sessionIndex: number; weekIndex: number; kValue: number }[];
  fatigueSeries: { sessionIndex: number; weekIndex: number; fatigue: number }[];
}

/**
 * Simula 4 microciclos semanales con 2 sesiones/semana.
 * Tras cada sesión se adapta según K y se actualiza fatiga/readiness de forma heurística.
 */
export function simulateMicrocycle(
  athlete: Athlete,
  exercises: Exercise[],
  goal: SessionGoal = 'strength',
): MicrocycleSimulationResult {
  const sim: Athlete = { ...athlete };
  const weeks: MicrocycleWeekChart[] = [];
  const kSeries: MicrocycleSimulationResult['kSeries'] = [];
  const fatigueSeries: MicrocycleSimulationResult['fatigueSeries'] = [];
  let sessionIndex = 0;
  const [kLo, kHi] = K_VALUE_RANGES[athlete.level];

  for (let w = 1; w <= 4; w++) {
    const weekSessions: Session[] = [];
    const weekEvals: SessionEvaluation[] = [];

    for (let d = 0; d < 2; d++) {
      let session = generateSession(sim.id, goal, sim, exercises);
      session = adaptSession(session, sim, exercises);
      const finalEval = evaluateSession(session, sim, exercises);

      weekSessions.push(session);
      weekEvals.push(finalEval);
      kSeries.push({ sessionIndex, weekIndex: w, kValue: finalEval.kValue });
      fatigueSeries.push({ sessionIndex, weekIndex: w, fatigue: sim.fatigueScore });
      sessionIndex++;

      if (finalEval.status === 'overtrained') {
        sim.fatigueScore = Math.min(100, sim.fatigueScore + 14);
      } else if (finalEval.status === 'undertrained') {
        sim.fatigueScore = Math.max(0, sim.fatigueScore - 8);
      } else {
        sim.fatigueScore = Math.min(100, sim.fatigueScore + 4);
      }
      sim.readinessScore = Math.min(100, Math.max(0, 100 - sim.fatigueScore + (finalEval.status === 'optimal' ? 6 : 0)));
    }

    const avgK = weekEvals.reduce((a, e) => a + e.kValue, 0) / weekEvals.length;
    const inBand = avgK >= kLo && avgK <= kHi ? 1 : 0;
    const estimatedPerformance = Math.min(
      100,
      Math.round(48 + w * 9 + inBand * 12 - Math.max(0, sim.fatigueScore - 60) * 0.35),
    );

    weeks.push({
      weekIndex: w,
      avgK: Math.round(avgK * 10) / 10,
      fatigueScore: Math.round(sim.fatigueScore),
      readinessScore: Math.round(sim.readinessScore),
      estimatedPerformance,
      sessions: weekSessions,
      evaluations: weekEvals,
    });
  }

  return { athleteId: athlete.id, weeks, kSeries, fatigueSeries };
}
