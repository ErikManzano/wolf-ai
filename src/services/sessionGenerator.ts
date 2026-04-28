import type { Athlete, Exercise, Session, SessionExerciseBlock, SessionGoal, SetScheme } from '../models/training';
import { applySessionMetrics } from './trainingEngine';

export function newSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Construye sesión desde bloques ya definidos (editor / programa multi-semanal).
 */
export function buildSessionFromBlocks(
  athleteId: string,
  blocks: SessionExerciseBlock[],
  athlete: Athlete,
  exercises: Exercise[],
  existingSessionId?: string,
): Session {
  const base: Session = {
    id: existingSessionId ?? newSessionId(),
    athleteId,
    exercises: blocks,
    totalReps: 0,
    avgRelativeIntensity: 0,
    avgAbsoluteIntensity: 0,
    load: 0,
    kValue: 0,
  };
  return applySessionMetrics(base, athlete, exercises);
}

/** Pool ordenado por id para reproducibilidad en MVP */
export function getExercisePoolForGoal(goal: SessionGoal, catalog: Exercise[]): Exercise[] {
  let pool = catalog.filter((e) => e.goal === goal);
  if (pool.length < 3) {
    pool = [...catalog];
  }
  return [...pool].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Tres bloques secuenciales (acumulación → intensidad → pico) con % Prilepin típicos.
 * Bloque 1: ~72% ×3×3 | Bloque 2: ~82% ×2×3 | Bloque 3: ~87% ×1×3
 */
const BLOCK_SCHEMES: SetScheme[][] = [
  [{ percentage: 72, reps: 3, sets: 3 }],
  [{ percentage: 82, reps: 2, sets: 3 }],
  [{ percentage: 87, reps: 1, sets: 3 }],
];

/**
 * Genera una sesión completa para un objetivo (técnica / fuerza / potencia).
 * Selección de ejercicios determinista a partir del catálogo y el `goal`.
 */
export function generateSession(
  athleteId: string,
  goal: SessionGoal,
  athlete: Athlete,
  exercises: Exercise[],
): Session {
  const pool = getExercisePoolForGoal(goal, exercises);
  const blocks: SessionExerciseBlock[] = BLOCK_SCHEMES.map((sets, i) => ({
    exerciseId: pool[i % pool.length]!.id,
    sets,
  }));

  return buildSessionFromBlocks(athleteId, blocks, athlete, exercises);
}

/** Plantillas base exportadas para programa periodizado */
export function getDefaultBlockTemplates(): SetScheme[][] {
  return BLOCK_SCHEMES.map((s) => s.map((x) => ({ ...x })));
}
