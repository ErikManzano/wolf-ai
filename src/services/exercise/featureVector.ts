import type { ExerciseDefinition, ExerciseFeatureVector } from '../../models/exercise';
import { isComplexComposition, isSingleComposition } from '../../models/exercise';
import { getExerciseTaxonomy } from './taxonomyLoader';

export function buildExerciseFeatureVector(def: ExerciseDefinition): ExerciseFeatureVector {
  const bundle = getExerciseTaxonomy();
  const familyOneHot: Record<string, number> = {};
  const variationOneHot: Record<string, number> = {};
  const objectiveOneHot: Record<string, number> = {};

  for (const f of bundle.families) familyOneHot[f.code] = 0;
  for (const v of bundle.variations) variationOneHot[v.code] = 0;
  for (const o of bundle.objectives) objectiveOneHot[o.code] = 0;

  objectiveOneHot[def.objective] = 1;

  let modifierCount = 0;
  if (isSingleComposition(def.composition)) {
    familyOneHot[def.composition.family] = 1;
    variationOneHot[def.composition.variation] = 1;
    modifierCount = def.composition.modifiers.length;
  } else if (isComplexComposition(def.composition)) {
    for (const s of def.composition.segments) {
      familyOneHot[s.family] = (familyOneHot[s.family] ?? 0) + 1;
      variationOneHot[s.variation] = (variationOneHot[s.variation] ?? 0) + 1;
      modifierCount += s.modifiers.length;
    }
  }

  return {
    definitionId: def.id,
    signature: def.signature,
    familyOneHot,
    variationOneHot,
    objectiveOneHot,
    modifierCount,
    kindSingle: def.kind === 'single' ? 1 : 0,
    kindComplex: def.kind === 'complex' ? 1 : 0,
  };
}
