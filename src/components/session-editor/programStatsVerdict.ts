import type { Athlete, Exercise, Session } from '../../models/training';
import { K_VALUE_RANGES } from '../../models/training';
import { evaluateSession } from '../../services/sessionEvaluator';
import { purposePct, sessionPurposeBreakdown } from './sessionSummaryMetrics';

export type DayVerdictTone = 'optimal' | 'light' | 'heavy' | 'technical' | 'intense' | 'empty';

export interface DayVerdict {
  tone: DayVerdictTone;
  title: string;
  message: string;
}

export function sessionIntensityRange(blocks: Session['exercises']): { min: number; max: number } {
  let min = 100;
  let max = 0;
  let found = false;
  for (const block of blocks) {
    for (const row of block.sets) {
      found = true;
      min = Math.min(min, row.percentage);
      max = Math.max(max, row.percentage);
    }
  }
  if (!found) return { min: 0, max: 0 };
  return { min, max };
}

export function evaluateDayVerdict(
  session: Session,
  athlete: Athlete,
  exercises: Exercise[],
  isEs: boolean,
): DayVerdict {
  if (session.exercises.length === 0) {
    return {
      tone: 'empty',
      title: isEs ? 'Sin ejercicios' : 'No exercises',
      message: isEs
        ? 'Añade bloques en la pestaña Sesión para ver el análisis del día.'
        : 'Add blocks in the Session tab to analyze this day.',
    };
  }

  const evaluation = evaluateSession(session, athlete, exercises);
  const purpose = sessionPurposeBreakdown(session.exercises);
  const techniquePct = purposePct(purpose, 'technique');
  const intensityPct = purposePct(purpose, 'intensity');
  const [kMin, kMax] = K_VALUE_RANGES[athlete.level];

  if (evaluation.status === 'overtrained' || evaluation.kValue > kMax + 2) {
    return {
      tone: 'heavy',
      title: isEs ? 'Carga elevada' : 'High load',
      message: isEs
        ? `K ${evaluation.kValue.toFixed(1)} por encima del rango (${kMin}–${kMax}). Considera bajar volumen o intensidad.`
        : `K ${evaluation.kValue.toFixed(1)} above target range (${kMin}–${kMax}). Consider lowering volume or intensity.`,
    };
  }

  if (evaluation.status === 'undertrained' || evaluation.kValue < kMin - 2) {
    return {
      tone: 'light',
      title: isEs ? 'Día ligero' : 'Light day',
      message: isEs
        ? `K ${evaluation.kValue.toFixed(1)} por debajo del rango (${kMin}–${kMax}). Puedes añadir trabajo o técnica.`
        : `K ${evaluation.kValue.toFixed(1)} below target range (${kMin}–${kMax}). You may add work or technique volume.`,
    };
  }

  if (techniquePct >= 45) {
    return {
      tone: 'technical',
      title: isEs ? 'Sesión técnica' : 'Technical session',
      message: isEs
        ? `${techniquePct}% de series técnicas. Buen día para movimiento y posiciones.`
        : `${techniquePct}% technique sets. Good day for movement quality.`,
    };
  }

  if (intensityPct >= 40) {
    return {
      tone: 'intense',
      title: isEs ? 'Sesión intensa' : 'Intense session',
      message: isEs
        ? `${intensityPct}% de series de intensidad. Prioriza recuperación entre bloques pesados.`
        : `${intensityPct}% intensity sets. Prioritize recovery between heavy blocks.`,
    };
  }

  return {
    tone: 'optimal',
    title: isEs ? 'Según lo programado' : 'On plan',
    message: isEs
      ? 'Buen balance de volumen e intensidad.'
      : 'Good balance of volume and intensity.',
  };
}
