import type { Exercise } from '../../models/training';
import type { ExerciseDefinition, ExerciseTaxonomyBundle, TrainingObjectiveCode } from '../../models/exercise';

const GOAL_TO_OBJECTIVE: Record<string, TrainingObjectiveCode> = {
  technique: 'technique',
  strength: 'strength',
  power: 'speed',
};

export function objectiveIntensityBand(
  objective: TrainingObjectiveCode,
  bundle: ExerciseTaxonomyBundle,
): [number, number] {
  const o = bundle.objectives.find((x) => x.code === objective);
  if (o) return [o.intensityMin, o.intensityMax];
  return [65, 85];
}

export function intensityRangeForExercise(ex: Exercise, bundle: ExerciseTaxonomyBundle): [number, number] {
  const obj =
    (ex.tags?.find((t) => GOAL_TO_OBJECTIVE[t]) as TrainingObjectiveCode | undefined) ??
    GOAL_TO_OBJECTIVE[ex.goal] ??
    'technique';
  const fromObjective = objectiveIntensityBand(obj, bundle);
  if (ex.intensityRange[0] !== 50 || ex.intensityRange[1] !== 85) {
    return ex.intensityRange;
  }
  return fromObjective;
}

export function intensityRangeForDefinition(def: ExerciseDefinition, bundle: ExerciseTaxonomyBundle): [number, number] {
  return objectiveIntensityBand(def.objective, bundle);
}
