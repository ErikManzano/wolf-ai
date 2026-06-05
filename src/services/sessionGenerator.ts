import type { Athlete, Exercise, Session, SessionExerciseBlock, SessionGoal, SetScheme } from '../models/training';
import { getExerciseTaxonomy, intensityRangeForExercise } from './exercise';
import { applySessionMetrics } from './trainingEngine';

const GOAL_OBJECTIVES: Record<SessionGoal, string[]> = {
  technique: ['technique', 'positional', 'recovery'],
  strength: ['strength', 'pulling_strength'],
  power: ['speed'],
};

const GOAL_TO_LEGACY: Record<SessionGoal, Exercise['goal'][]> = {
  technique: ['technique'],
  strength: ['strength'],
  power: ['power'],
};

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

const HEAVY_TECHNIQUE_TAGS = new Set(['four_stops', 'slow_eccentric', 'pulling_strength']);

function isHeavyForTechniqueDay(ex: Exercise): boolean {
  if (ex.tags?.some((t) => HEAVY_TECHNIQUE_TAGS.has(t))) return true;
  if (ex.subtype === 'pull' && (ex.intensityRange[0] ?? 0) >= 88) return true;
  if (ex.catalogGroup === 'grupo_4' || ex.catalogGroup === 'grupo_9') return true;
  if (ex.complexity === 'complex' && ex.name.toLowerCase().includes('pull')) return true;
  return false;
}

/** Pool ordenado por id; prioriza objetivo semántico y tags cuando el catálogo viene de definitions. */
export function getExercisePoolForGoal(goal: SessionGoal, catalog: Exercise[]): Exercise[] {
  const taxonomy = getExerciseTaxonomy();
  const legacyGoals = GOAL_TO_LEGACY[goal];
  const semanticTags = new Set(GOAL_OBJECTIVES[goal]);

  let pool = catalog.filter((e) => {
    if (goal === 'technique' && isHeavyForTechniqueDay(e)) return false;
    if (legacyGoals.includes(e.goal)) return true;
    const tags = e.tags;
    if (tags?.some((t) => semanticTags.has(t))) return true;
    return false;
  });

  if (pool.length < 3) {
    pool = catalog.filter((e) => {
      const [lo, hi] = intensityRangeForExercise(e, taxonomy);
      const mid = (lo + hi) / 2;
      if (goal === 'technique') return mid <= 80;
      if (goal === 'strength') return mid >= 75;
      return mid >= 70;
    });
  }
  if (pool.length < 3) pool = [...catalog];
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
