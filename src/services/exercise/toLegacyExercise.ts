import type { Exercise, ExerciseCategory, ExerciseComplexity, ExerciseGoal, ExerciseSubtype, StartPosition } from '../../models/training';
import type { ExerciseDefinition, ExerciseTaxonomyBundle, TrainingObjectiveItem } from '../../models/exercise';
import { isComplexComposition, isSingleComposition } from '../../models/exercise';

const FAMILY_TO_CATEGORY: Record<string, ExerciseCategory> = {
  snatch: 'snatch',
  clean: 'clean_jerk',
  jerk: 'clean_jerk',
  pull: 'snatch',
  squat: 'squat',
  press: 'accessory',
  accessory: 'accessory',
};

const VARIATION_TO_SUBTYPE: Record<string, ExerciseSubtype> = {
  classic: 'classic',
  power: 'power',
  hang: 'classic',
  block: 'classic',
  muscle: 'classic',
  tall: 'power',
  pull: 'pull',
  high_pull: 'pull',
  complex: 'complex',
};

const OBJECTIVE_TO_GOAL: Record<string, ExerciseGoal> = {
  technique: 'technique',
  strength: 'strength',
  speed: 'power',
  positional: 'technique',
  pulling_strength: 'strength',
  recovery: 'technique',
};

function objectiveBand(objective: string, objectives: TrainingObjectiveItem[]): [number, number] {
  const o = objectives.find((x) => x.code === objective);
  if (o) return [o.intensityMin, o.intensityMax];
  return [65, 85];
}

/**
 * Maps composable definition → legacy {@link Exercise} for motor WL compatibility.
 */
export function toLegacyExercise(def: ExerciseDefinition, bundle: ExerciseTaxonomyBundle): Exercise {
  const comp = def.composition;
  const objectives = bundle.objectives;
  const [lo, hi] = objectiveBand(def.objective, objectives);

  let category: ExerciseCategory = 'accessory';
  let subtype: ExerciseSubtype = 'classic';
  let startPosition: StartPosition = 'floor';
  let complexity: ExerciseComplexity = def.kind === 'complex' ? 'complex' : 'single';

  if (isSingleComposition(comp)) {
    category = FAMILY_TO_CATEGORY[comp.family] ?? 'accessory';
    subtype = VARIATION_TO_SUBTYPE[comp.variation] ?? 'classic';
    startPosition = comp.startPosition as StartPosition;
    if (comp.variation === 'pull' || comp.variation === 'high_pull') subtype = 'pull';
    if (comp.variation === 'power') subtype = 'power';
  } else if (isComplexComposition(comp) && comp.segments[0]) {
    const s0 = comp.segments[0];
    category = FAMILY_TO_CATEGORY[s0.family] ?? 'snatch';
    subtype = 'complex';
    startPosition = s0.startPosition as StartPosition;
  }

  const goal = OBJECTIVE_TO_GOAL[def.objective] ?? 'technique';

  const ex: Exercise = {
    id: def.legacyExerciseId ?? def.id,
    name: def.displayName,
    category,
    subtype,
    startPosition,
    complexity,
    goal,
    intensityRange: [lo, hi],
  };

  if (def.loadAnchor && def.loadAnchor !== 'auto') {
    ex.loadAnchor = def.loadAnchor;
  }
  if (def.tags.length) ex.tags = [...def.tags];
  const grupoTag = def.tags.find((t) => /^grupo_\d+$/.test(t));
  if (grupoTag) ex.catalogGroup = grupoTag;

  return ex;
}

export function definitionsToLegacyExercises(
  defs: ExerciseDefinition[],
  bundle: ExerciseTaxonomyBundle,
): Exercise[] {
  return defs.map((d) => toLegacyExercise(d, bundle));
}
