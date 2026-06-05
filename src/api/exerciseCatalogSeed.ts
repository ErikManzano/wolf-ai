import { mockExercises } from '../data/loadMockData';

/** Total official movements (legacy 37 + Bulgarian catalog). */
export const OFFICIAL_CATALOG_SIZE = mockExercises.length;
import type { ExerciseDefinition, ExerciseRelationshipRule } from '../models/exercise';
import { fromLegacyExercise } from '../services/exercise/fromLegacyExercise';
import { composeDisplayName, getExerciseTaxonomy, getSeedRelationshipRules } from '../services/exercise';

/** Build system exercise definitions from legacy JSON catalog. */
export function seedExerciseDefinitionsFromLegacy(): ExerciseDefinition[] {
  const bundle = getExerciseTaxonomy();
  return mockExercises.map((ex) => {
    const displayName = ex.name || composeDisplayName(fromLegacyExercise(ex, ex.name).composition, bundle, 'en');
    return {
      ...fromLegacyExercise(ex, displayName),
      id: ex.id,
      legacyExerciseId: ex.id,
    };
  });
}

export function seedRelationshipRules(): ExerciseRelationshipRule[] {
  return getSeedRelationshipRules();
}
