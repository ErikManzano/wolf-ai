import { mockExercises } from '../data/loadMockData';
import { concentradoExercises, seedFullOfficialExerciseCatalog } from '../data/concentradoCatalog';

/** Total official movements (legacy + Bulgarian + CONCENTRADO accessory, excl. WL enrich-only). */
export const OFFICIAL_CATALOG_SIZE =
  mockExercises.length + concentradoExercises.filter((item) => !item.mapsToLegacyId).length;
import type { ExerciseDefinition, ExerciseRelationshipRule } from '../models/exercise';
import { fromLegacyExercise } from '../services/exercise/fromLegacyExercise';
import { composeDisplayName, getExerciseTaxonomy, getSeedRelationshipRules } from '../services/exercise';

function legacyDefinitions(): ExerciseDefinition[] {
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

/** Build system exercise definitions from legacy JSON + CONCENTRADO accessory catalog. */
export function seedExerciseDefinitionsFromLegacy(): ExerciseDefinition[] {
  return seedFullOfficialExerciseCatalog(legacyDefinitions());
}

export function seedRelationshipRules(): ExerciseRelationshipRule[] {
  return getSeedRelationshipRules();
}
