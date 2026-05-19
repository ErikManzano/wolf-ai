import type { Athlete, Exercise, Session } from '../models/training';
import { K_VALUE_RANGES } from '../models/training';
import { applySessionMetrics } from './trainingEngine';
import { evaluateSession } from './sessionEvaluator';

function cloneSession(s: Session): Session {
  return JSON.parse(JSON.stringify(s)) as Session;
}

function clampPct(p: number, lo: number, hi: number): number {
  return Math.round(Math.min(hi, Math.max(lo, p)));
}

/** Ejercicios técnicos o tirones cuando la fatiga es alta */
function fatigueFriendlyExercises(catalog: Exercise[]): Exercise[] {
  return catalog.filter(
    (e) =>
      (e.goal === 'technique' || e.subtype === 'pull') &&
      (e.category === 'snatch' || e.category === 'clean_jerk'),
  );
}

/**
 * Ajusta la sesión hacia la banda K del nivel del atleta.
 * - K bajo → sube % dentro del `intensityRange` del ejercicio.
 * - K alto → baja volumen (series o repeticiones).
 * - fatiga > 75 → prioriza pulls/técnica y suaviza carga (antes de recalcular K).
 */
export function adaptSession(session: Session, athlete: Athlete, exercises: Exercise[]): Session {
  const next = cloneSession(session);
  const [kMin, kMax] = K_VALUE_RANGES[athlete.level];
  const exById = new Map(exercises.map((e) => [e.id, e]));

  if (athlete.fatigueScore > 75) {
    const pool = fatigueFriendlyExercises(exercises);
    const fallback = exercises.filter((e) => e.subtype === 'pull').slice(0, 3);
    const use = pool.length >= 3 ? pool : fallback.length >= 3 ? fallback : exercises;
    const sorted = [...use].sort((a, b) => a.id.localeCompare(b.id));
    next.exercises = next.exercises.map((block, idx) => {
      const replacement = sorted[idx % sorted.length];
      if (!replacement) return block;
      const softened = block.sets.map((sch) => ({
        ...sch,
        percentage: clampPct(sch.percentage - 5, replacement.intensityRange[0], replacement.intensityRange[1]),
      }));
      return { exerciseId: replacement.id, sets: softened };
    });
  }

  const evaluation = evaluateSession(next, athlete, exercises);

  if (evaluation.kValue < kMin) {
    next.exercises = next.exercises.map((block) => {
      const ex = exById.get(block.exerciseId);
      if (!ex) return block;
      return {
        ...block,
        sets: block.sets.map((sch) => ({
          ...sch,
          percentage: clampPct(sch.percentage + 2, ex.intensityRange[0], ex.intensityRange[1]),
        })),
      };
    });
  } else if (evaluation.kValue > kMax) {
    next.exercises = next.exercises.map((block) => ({
      ...block,
      sets: block.sets.map((sch) => {
        if (sch.sets > 1) return { ...sch, sets: sch.sets - 1 };
        if (sch.reps > 1) return { ...sch, reps: sch.reps - 1 };
        const ex = exById.get(block.exerciseId);
        const lo = ex?.intensityRange[0] ?? 50;
        const hi = ex?.intensityRange[1] ?? 120;
        return { ...sch, percentage: clampPct(sch.percentage - 3, lo, hi) };
      }),
    }));
  }

  return applySessionMetrics(next, athlete, exercises);
}
