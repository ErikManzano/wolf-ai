import type { ExerciseDefinition, ExerciseDefinitionInput, ExerciseTaxonomyBundle } from '../../models/exercise';
import { composeDisplayName, buildSearchText } from './composeDisplayName';
import { buildSignature } from './signature';
import { isSingleComposition } from '../../models/exercise';

export function buildExerciseDefinition(
  id: string,
  input: ExerciseDefinitionInput,
  bundle: ExerciseTaxonomyBundle,
  options?: { coachId?: string | null; legacyExerciseId?: string | null; locale?: 'es' | 'en' },
): ExerciseDefinition {
  const locale = options?.locale ?? 'en';
  const displayName = composeDisplayName(input.composition, bundle, locale);
  const signature = buildSignature(input.composition);
  const family = isSingleComposition(input.composition) ? input.composition.family : input.composition.segments[0]?.family ?? null;

  return {
    id,
    coachId: options?.coachId ?? null,
    kind: input.kind,
    family: family ?? undefined,
    variation: isSingleComposition(input.composition) ? input.composition.variation : null,
    startPosition: isSingleComposition(input.composition) ? input.composition.startPosition : null,
    objective: input.objective,
    loadAnchor: input.loadAnchor,
    composition: input.composition,
    displayName,
    signature,
    legacyExerciseId: options?.legacyExerciseId ?? null,
    searchText: buildSearchText(displayName, input.composition),
    tags: input.tags ?? [family ?? 'accessory', input.objective].filter(Boolean) as string[],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
