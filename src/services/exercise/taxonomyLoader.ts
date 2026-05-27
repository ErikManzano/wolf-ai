import type { ExerciseRelationshipRule, ExerciseTaxonomyBundle } from '../../models/exercise';
import rawTaxonomy from '../../data/exercise-taxonomy/taxonomy.json';

type RawTaxonomy = ExerciseTaxonomyBundle & {
  relationshipRules?: ExerciseRelationshipRule[];
};

const cached = rawTaxonomy as RawTaxonomy;

export function getExerciseTaxonomy(): ExerciseTaxonomyBundle {
  return {
    families: cached.families,
    variations: cached.variations,
    startPositions: cached.startPositions,
    modifiers: cached.modifiers,
    objectives: cached.objectives,
  };
}

export function getSeedRelationshipRules(): ExerciseRelationshipRule[] {
  return (cached.relationshipRules ?? []).map((r) => ({ ...r, isActive: true, coachId: null }));
}
