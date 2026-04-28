import type { Athlete, Exercise, Session, SessionEvaluation, TrainingStatus } from '../models/training';
import { K_VALUE_RANGES } from '../models/training';
import {
  applySessionMetrics,
  calcularCargaTotal,
  calcularIntensidadAbsolutaPromedio,
  calcularIntensidadRelativaPromedio,
  calcularKValue,
  calcularTotalReps,
} from './trainingEngine';

function kStatus(athlete: Athlete, kValue: number): TrainingStatus {
  const [min, max] = K_VALUE_RANGES[athlete.level];
  if (kValue < min) return 'undertrained';
  if (kValue > max) return 'overtrained';
  return 'optimal';
}

/**
 * Evalúa una sesión contra el atleta: tonelaje, intensidades medias, K-value y estado
 * (óptimo / infra / sobre según banda de K por nivel).
 */
export function evaluateSession(session: Session, athlete: Athlete, exercises: Exercise[]): SessionEvaluation {
  const totalReps = calcularTotalReps(session);
  const avgRelativeIntensity = Math.round(calcularIntensidadRelativaPromedio(session) * 10) / 10;
  const avgAbsoluteIntensity = Math.round(calcularIntensidadAbsolutaPromedio(session, athlete, exercises) * 10) / 10;
  const load = calcularCargaTotal(session, athlete, exercises);
  const kValue = calcularKValue(session, athlete, exercises);
  const status = kStatus(athlete, kValue);
  return { totalReps, avgRelativeIntensity, avgAbsoluteIntensity, load, kValue, status };
}

/** Sesión con campos numéricos actualizados + evaluación explícita */
export function evaluateSessionFull(session: Session, athlete: Athlete, exercises: Exercise[]) {
  const filled = applySessionMetrics(session, athlete, exercises);
  const evaluation = evaluateSession(filled, athlete, exercises);
  return { session: filled, evaluation };
}
