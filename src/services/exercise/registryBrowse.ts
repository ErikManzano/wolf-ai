import type {
  ExerciseDefinition,
  ExerciseTaxonomyBundle,
  RegistryBrowseQuery,
  RegistryBrowseResult,
  RegistryTreeNode,
} from '../../models/exercise';
import type { CoachExerciseOverride } from '../../models/exercise/override';
import { mergeCatalogViews } from './mergeDefinitionView';
import { matchesCatalogQuery } from './sessionPickerCatalog';
import { getExerciseTaxonomy } from './taxonomyLoader';

function buildFamilyTree(
  taxonomy: ExerciseTaxonomyBundle,
  definitions: { family?: string | null }[],
): RegistryTreeNode[] {
  const counts = new Map<string, number>();
  for (const d of definitions) {
    const f = d.family ?? 'other';
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }

  return taxonomy.families
    .filter((f) => (f as { isActive?: boolean }).isActive !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((f) => ({
      id: `family-${f.code}`,
      type: 'family' as const,
      code: f.code,
      label: f.labelEn,
      count: counts.get(f.code) ?? 0,
      children: taxonomy.variations.slice(0, 6)
        .map((v) => ({
          id: `var-${f.code}-${v.code}`,
          type: 'variation' as const,
          code: v.code,
          label: v.labelEn,
        })),
    }));
}

export function browseExerciseRegistry(
  definitions: ExerciseDefinition[],
  overrides: CoachExerciseOverride[],
  query: RegistryBrowseQuery,
  taxonomy?: ExerciseTaxonomyBundle,
): RegistryBrowseResult {
  const bundle = taxonomy ?? getExerciseTaxonomy();
  const coachId = query.coachId ?? 'user-coach';

  let merged = mergeCatalogViews(definitions, overrides, coachId);

  if (query.family && query.family !== 'all') {
    merged = merged.filter((d) => d.family === query.family);
  }
  if (query.kind && query.kind !== 'all') {
    merged = merged.filter((d) => d.kind === query.kind);
  }
  if (query.status && query.status !== 'all') {
    merged = merged.filter((d) => d.lifecycleStatus === query.status);
  }
  if (!query.includeDeprecated) {
    merged = merged.filter((d) => d.lifecycleStatus !== 'deprecated');
  }
  if (query.q) {
    merged = merged.filter((d) => matchesCatalogQuery(d, query.q!));
  }

  const tree = buildFamilyTree(bundle, merged);

  return {
    tree,
    definitions: merged,
    taxonomy: bundle,
    total: merged.length,
  };
}
