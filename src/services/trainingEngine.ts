/**
 * Pure training math — Prilepin-style %1RM + bloques complejos (reps por movimiento).
 *
 * K-value (Vorobyev / Prilepin, como definición de coach):
 *   K = (I_promedio / T_ref) × 100
 * donde I_promedio es la intensidad media prescrita (%1RM) ponderada por las repeticiones
 * del NBL técnico (sin calentamiento). Para una sesión, T_ref = 100 (% escala 1RM).
 * Ejemplo coach: (70×9 + 80×6 + 85×3) / 18 ≈ 75.8 → K ≈ 75.8 cuando T_ref = 100.
 */
import type { Athlete, Exercise, ExerciseLoadAnchor, Session, SessionExerciseBlock, SetScheme } from '../models/training';
import { coerceLoadScale } from '../utils/exerciseCatalog';

/** Referencia total en escala %1RM para una sesión (denominador del cociente del coach). */
export const K_REFERENCE_TOTAL_SESSION = 100;

function exerciseById(exercises: Exercise[], id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}

function rawOneRmForAnchor(anchor: Exclude<ExerciseLoadAnchor, 'auto'>, athlete: Athlete): number {
  switch (anchor) {
    case 'snatch':
      return athlete.oneRM.snatch;
    case 'clean_jerk':
      return athlete.oneRM.cleanJerk;
    case 'back_squat':
      return athlete.oneRM.backSquat;
    case 'front_squat':
      return athlete.oneRM.frontSquat;
    default:
      return athlete.oneRM.snatch;
  }
}

/** Legacy anchor when `loadAnchor` is omitted or `auto` — matches previous Wolf behaviour. */
export function resolveLegacyBaseOneRm(exercise: Exercise, athlete: Athlete): number {
  switch (exercise.category) {
    case 'snatch':
      return athlete.oneRM.snatch;
    case 'clean_jerk':
      return athlete.oneRM.cleanJerk;
    case 'squat':
      return exercise.name.toLowerCase().includes('front')
        ? athlete.oneRM.frontSquat
        : athlete.oneRM.backSquat;
    case 'accessory': {
      const n = exercise.name.toLowerCase();
      if (n.includes('jerk') || n.includes('press') || n.includes('overhead')) {
        return athlete.oneRM.cleanJerk * 0.55;
      }
      if (n.includes('deadlift') || n.includes('good morning') || n.includes('romanian')) {
        return athlete.oneRM.backSquat * 1.15;
      }
      return athlete.oneRM.snatch * 0.45;
    }
    default:
      return athlete.oneRM.snatch;
  }
}

/**
 * Base kg for `SetScheme.percentage` (before multiplying by %/100).
 * Uses `exercise.loadAnchor` + `exercise.loadScale` when set; otherwise legacy resolution.
 */
export function resolveBaseOneRm(exercise: Exercise, athlete: Athlete): number {
  const anchor = exercise.loadAnchor ?? 'auto';
  const base =
    anchor === 'auto' ? resolveLegacyBaseOneRm(exercise, athlete) : rawOneRmForAnchor(anchor, athlete);
  const scale = coerceLoadScale(exercise.loadScale ?? 1);
  return Math.round(base * scale * 100) / 100;
}

/** Suma reps tipo "1", "2", "1+1+3" */
export function parseRepTokens(s: string): number {
  if (!s || !String(s).trim()) return 0;
  return String(s)
    .split('+')
    .reduce((acc, p) => acc + (parseInt(p.trim(), 10) || 0), 0);
}

export function normalizeBlockType(block: SessionExerciseBlock): 'single' | 'complex' {
  return block.blockType === 'complex' && block.segments && block.segments.length >= 2 ? 'complex' : 'single';
}

/** %1RM enteros — rango habitual halterofilia 40–120 (pulls/overloads). */
export const WL_PCT_MIN = 40;
export const WL_PCT_MAX = 120;

export function roundPercentagePrilepin(pct: number): number {
  return Math.round(Math.min(WL_PCT_MAX, Math.max(WL_PCT_MIN, pct)));
}

function roundPercentagesDeep(session: Session): Session {
  return {
    ...session,
    exercises: session.exercises.map((b) => ({
      ...b,
      sets: b.sets.map((sch) => ({
        ...sch,
        percentage: roundPercentagePrilepin(sch.percentage),
      })),
    })),
  };
}

/** Bloques que cuentan para NBL técnico, K y tonelaje de trabajo (excluye calentamiento si flag false). */
export function exercisesForTechnicalNBL(session: Session): SessionExerciseBlock[] {
  return session.exercises.filter((b) => b.countsTowardTechnicalNBL !== false);
}

/** Repeticiones en una “entrada” de tabla (una fila de series) antes de multiplicar por series. */
export function repsPerRoundForScheme(block: SessionExerciseBlock, scheme: SetScheme): number {
  if (normalizeBlockType(block) === 'complex' && block.segments?.length && scheme.segmentReps?.length) {
    let sum = 0;
    for (let i = 0; i < block.segments.length; i++) {
      sum += parseRepTokens(scheme.segmentReps[i] ?? '0');
    }
    return Math.max(1, sum);
  }
  return Math.max(1, scheme.reps);
}

/** Total reps NBL técnico */
export function calcularTotalReps(session: Session): number {
  return calcularTotalRepsBlocks(exercisesForTechnicalNBL(session));
}

export function calcularTotalRepsBlocks(blocks: SessionExerciseBlock[]): number {
  let total = 0;
  for (const block of blocks) {
    for (const scheme of block.sets) {
      total += repsPerRoundForScheme(block, scheme) * scheme.sets;
    }
  }
  return Math.round(total);
}

/** Media ponderada de %1RM (intensidad prescrita por rep técnica) — base del ejemplo del coach. */
export function calcularIntensidadRelativaPromedio(session: Session): number {
  return calcularIntensidadRelativaPromedioBlocks(exercisesForTechnicalNBL(session));
}

export function calcularIntensidadRelativaPromedioBlocks(blocks: SessionExerciseBlock[]): number {
  let weighted = 0;
  let reps = 0;
  for (const block of blocks) {
    for (const scheme of block.sets) {
      const r = repsPerRoundForScheme(block, scheme) * scheme.sets;
      weighted += scheme.percentage * r;
      reps += r;
    }
  }
  return reps > 0 ? weighted / reps : 0;
}

/** Intensidad absoluta media = kg medio por repetición (solo bloques NBL técnico). */
export function calcularIntensidadAbsolutaPromedio(
  session: Session,
  athlete: Athlete,
  exercises: Exercise[],
): number {
  return calcularIntensidadAbsolutaPromedioBlocks(exercisesForTechnicalNBL(session), athlete, exercises);
}

export function calcularIntensidadAbsolutaPromedioBlocks(
  blocks: SessionExerciseBlock[],
  athlete: Athlete,
  exercises: Exercise[],
): number {
  let weightedKg = 0;
  let reps = 0;

  for (const block of blocks) {
    if (normalizeBlockType(block) === 'complex' && block.segments?.length) {
      for (const scheme of block.sets) {
        const rounds = scheme.sets;
        for (let si = 0; si < block.segments.length; si++) {
          const seg = block.segments[si];
          if (!seg) continue;
          const ex = exerciseById(exercises, seg.exerciseId);
          if (!ex) continue;
          const base = resolveBaseOneRm(ex, athlete);
          const kgPerRep = (scheme.percentage / 100) * base;
          const n = parseRepTokens(scheme.segmentReps?.[si] ?? '0');
          const subReps = n * rounds;
          weightedKg += kgPerRep * subReps;
          reps += subReps;
        }
      }
    } else {
      const ex = exerciseById(exercises, block.exerciseId);
      if (!ex) continue;
      const base = resolveBaseOneRm(ex, athlete);
      for (const scheme of block.sets) {
        const kgPerRep = (scheme.percentage / 100) * base;
        const r = scheme.reps * scheme.sets;
        weightedKg += kgPerRep * r;
        reps += r;
      }
    }
  }
  return reps > 0 ? weightedKg / reps : 0;
}

/** Carga total (kg levantados en trabajo técnico): Σ kg × reps × series */
export function calcularCargaTotal(session: Session, athlete: Athlete, exercises: Exercise[]): number {
  return calcularCargaTotalBlocks(exercisesForTechnicalNBL(session), athlete, exercises);
}

export function calcularCargaTotalBlocks(blocks: SessionExerciseBlock[], athlete: Athlete, exercises: Exercise[]): number {
  let tonnage = 0;

  for (const block of blocks) {
    if (normalizeBlockType(block) === 'complex' && block.segments?.length) {
      for (const scheme of block.sets) {
        const rounds = scheme.sets;
        for (let si = 0; si < block.segments.length; si++) {
          const seg = block.segments[si];
          if (!seg) continue;
          const ex = exerciseById(exercises, seg.exerciseId);
          if (!ex) continue;
          const base = resolveBaseOneRm(ex, athlete);
          const kg = (scheme.percentage / 100) * base;
          const n = parseRepTokens(scheme.segmentReps?.[si] ?? '0');
          tonnage += kg * n * rounds;
        }
      }
    } else {
      const ex = exerciseById(exercises, block.exerciseId);
      if (!ex) continue;
      const base = resolveBaseOneRm(ex, athlete);
      for (const scheme of block.sets) {
        tonnage += (scheme.percentage / 100) * base * scheme.reps * scheme.sets;
      }
    }
  }
  return Math.round(tonnage * 10) / 10;
}

/**
 * K-value según definición coach: (intensidad media prescrita / referencia total) × 100.
 * Sesión: numerador = media ponderada %1RM sobre NBL técnico; denominador = {@link K_REFERENCE_TOTAL_SESSION}.
 */
export function calcularKValue(session: Session): number {
  const techBlocks = exercisesForTechnicalNBL(session);
  const intensidadMediaPct = calcularIntensidadRelativaPromedioBlocks(techBlocks);
  const raw = (intensidadMediaPct / K_REFERENCE_TOTAL_SESSION) * 100;
  return Math.round(raw * 10) / 10;
}

export function applySessionMetrics(session: Session, athlete: Athlete, exercises: Exercise[]): Session {
  const s = roundPercentagesDeep(session);
  const techBlocks = exercisesForTechnicalNBL(s);
  return {
    ...s,
    totalReps: calcularTotalRepsBlocks(techBlocks),
    avgRelativeIntensity: Math.round(calcularIntensidadRelativaPromedioBlocks(techBlocks) * 10) / 10,
    avgAbsoluteIntensity: Math.round(calcularIntensidadAbsolutaPromedioBlocks(techBlocks, athlete, exercises) * 10) / 10,
    load: calcularCargaTotalBlocks(techBlocks, athlete, exercises),
    kValue: calcularKValue(s),
  };
}
