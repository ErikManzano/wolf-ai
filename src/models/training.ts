/**
 * Domain model — Olympic weightlifting training engine (MVP).
 * Prilepin-style prescriptions + K-value banding by athlete level.
 */

export type AthleteLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Athlete {
  id: string;
  name: string;
  level: AthleteLevel;
  bodyweight: number;
  oneRM: {
    snatch: number;
    cleanJerk: number;
    backSquat: number;
    frontSquat: number;
  };
  /** Accumulated stress 0–100 */
  fatigueScore: number;
  /** Readiness to train 0–100 */
  readinessScore: number;
}

export type ExerciseCategory = 'snatch' | 'clean_jerk' | 'squat' | 'accessory';

export type ExerciseSubtype = 'classic' | 'power' | 'pull' | 'complex';

export type StartPosition = 'floor' | 'below_knee' | 'at_knee' | 'above_knee' | 'blocks';

export type ExerciseComplexity = 'single' | 'complex';

export type ExerciseGoal = 'technique' | 'strength' | 'power';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  subtype: ExerciseSubtype;
  startPosition: StartPosition;
  complexity: ExerciseComplexity;
  goal: ExerciseGoal;
  /** Sensible %1RM window for classical prescriptions (Prilepin band) */
  intensityRange: [number, number];
}

export interface SetScheme {
  /** % of movement-specific 1RM (e.g. 72 = 72%) */
  percentage: number;
  /** Single movement: reps por serie. Complejo: suele ser la suma de segmentReps (derivada). */
  reps: number;
  /** Number of work sets at this scheme */
  sets: number;
  /**
   * Solo bloques complejos: reps por movimiento en el mismo orden que `segments`.
   * Ej: ["1","1","3"] = clean 1 + jerk 1 + front squat 3 en esa entrada de tabla.
   */
  segmentReps?: string[];
}

/** Movimiento dentro de un complejo (misma barra / misma entrada de %). */
export interface ComplexSegmentDef {
  exerciseId: string;
  /** Etiqueta corta opcional */
  label?: string;
}

export type SessionBlockType = 'single' | 'complex';

export interface SessionExerciseBlock {
  exerciseId: string;
  /** Por defecto `single` si falta (datos antiguos). */
  blockType?: SessionBlockType;
  /** Si `complex`: orden de movimientos; las reps van en cada fila de `sets[].segmentReps`. */
  segments?: ComplexSegmentDef[];
  sets: SetScheme[];
  /**
   * Si `false`: bloque de calentamiento — no entra en NBL técnico, tonelaje de trabajo ni K-value.
   * Omitido = cuenta como trabajo (compatibilidad datos antiguos).
   */
  countsTowardTechnicalNBL?: boolean;
}

/** Usuario de la app (coach o atleta). */
export type WolfAppRole = 'coach' | 'athlete';

export interface WolfUser {
  id: string;
  name: string;
  role: WolfAppRole;
  coachId?: string;
  /** Perfil Motor WL (`Athlete.id`) cuando role === athlete */
  linkedAthleteId?: string;
  email?: string;
}

/** Programa generado asignado por el coach a un atleta (usuario). */
export interface ProgramAssignmentVersion {
  version: number;
  editedAt: string;
  program: GeneratedProgram;
}

export interface ProgramAssignment {
  id: string;
  coachId: string;
  /**
   * `WolfUser.id` del atleta si tiene cuenta y está enlazado a este `athleteProfileId`.
   * Omitido cuando el perfil solo existe en la plantilla del coach (sin login).
   */
  athleteUserId?: string;
  /** Perfil `Athlete.id` usado para métricas/K-value */
  athleteProfileId: string;
  /** Versión activa del plan asignado (empieza en 1). */
  version: number;
  program: GeneratedProgram;
  /** Historial de versiones previas (sin incluir la activa). */
  versionHistory: ProgramAssignmentVersion[];
  assignedAt: string;
}

/** Sesión marcada como realizada (disciplina / asistencia). */
export interface SessionCompletion {
  assignmentId: string;
  weekNumber: number;
  dayNumber: number;
  completedAt: string;
}

export interface Session {
  id: string;
  athleteId: string;
  exercises: SessionExerciseBlock[];
  totalReps: number;
  /** Mean prescription %1RM weighted by reps */
  avgRelativeIntensity: number;
  /** Mean absolute load (kg) per repetition */
  avgAbsoluteIntensity: number;
  /** Total tonnage (kg) — Σ (kg × reps × sets) */
  load: number;
  /**
   * K-value (Vorobyev / Prilepin): (intensidad media prescrita %1RM sobre NBL técnico / referencia) × 100.
   * Sesión: referencia = 100 (% escala); coincide con media ponderada % cuando el denominador es 100.
   */
  kValue: number;
}

export type SessionGoal = ExerciseGoal;

export type TrainingStatus = 'undertrained' | 'optimal' | 'overtrained';

export interface SessionEvaluation {
  totalReps: number;
  avgRelativeIntensity: number;
  avgAbsoluteIntensity: number;
  load: number;
  kValue: number;
  status: TrainingStatus;
}

export interface SessionGenerationGoal {
  /** Primary bias for exercise selection */
  goal: SessionGoal;
}

/** Target K band by level (business rules) */
export const K_VALUE_RANGES: Record<AthleteLevel, [number, number]> = {
  beginner: [65, 70],
  intermediate: [71, 75],
  advanced: [76, 82],
};

/** Day inside a generated mesocycle plan */
export interface ProgramDay {
  dayNumber: number;
  label: string;
  session: Session;
}

export interface ProgramWeek {
  weekNumber: number;
  days: ProgramDay[];
}

/** Full multi-week prescription (e.g. 12 mesociclos) */
export interface GeneratedProgram {
  id: string;
  name: string;
  athleteId: string;
  createdAt: string;
  totalWeeks: number;
  daysPerWeek: number;
  primaryGoal: ExerciseGoal;
  weeks: ProgramWeek[];
}
