import type { SessionExerciseBlock } from '../../models/training';
import type { ExerciseDefinition, ExerciseTaxonomyBundle } from '../../models/exercise';
import { isComplexComposition } from '../../models/exercise';
import { buildSignature } from './signature';
import { buildExerciseDefinition } from './buildDefinition';
import type { SegmentComposition } from '../../models/exercise/composition';

/**
 * Resolves a complex definition into a {@link SessionExerciseBlock} with per-segment exerciseIds.
 * Matches existing single definitions by composition signature; falls back to legacy id on parent.
 */
export function complexDefinitionToSessionBlock(
  def: ExerciseDefinition,
  catalog: ExerciseDefinition[],
  taxonomy: ExerciseTaxonomyBundle,
): SessionExerciseBlock | null {
  if (def.kind !== 'complex' || !isComplexComposition(def.composition)) return null;

  const segmentIds = def.composition.segments.map((seg) =>
    resolveSegmentDefinitionId(seg, catalog, taxonomy, def.coachId ?? null),
  );

  return {
    exerciseId: def.legacyExerciseId ?? def.id,
    segments: segmentIds.map((exerciseId) => ({ exerciseId })),
    sets: [{ percentage: 75, reps: 1, sets: 3, segmentReps: segmentIds.map(() => '1') }],
  };
}

function resolveSegmentDefinitionId(
  seg: SegmentComposition,
  catalog: ExerciseDefinition[],
  taxonomy: ExerciseTaxonomyBundle,
  coachId: string | null,
): string {
  const composition = {
    kind: 'single' as const,
    family: seg.family,
    variation: seg.variation,
    startPosition: seg.startPosition,
    modifiers: seg.modifiers,
    tempo: null,
  };
  const signature = buildSignature(composition);
  const match = catalog.find((d) => d.kind === 'single' && d.signature === signature);
  if (match) return match.legacyExerciseId ?? match.id;

  const draft = buildExerciseDefinition(`seg-${signature.slice(0, 12)}`, {
    kind: 'single',
    composition,
    objective: 'technique',
    loadAnchor: 'auto',
    tags: [seg.family],
  }, taxonomy, { coachId: coachId ?? undefined });

  return draft.legacyExerciseId ?? draft.id;
}
