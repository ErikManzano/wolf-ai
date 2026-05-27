import type {
  ExerciseDefinitionKind,
  ExerciseLifecycleStatus,
  ExerciseTaxonomyBundle,
  MergedDefinitionView,
} from '../../models/exercise';
import type { ExerciseCategory } from '../../models/training';
import { toLegacyExercise } from './toLegacyExercise';

export interface SessionPickerOption {
  id: string;
  definitionId: string;
  name: string;
  searchText: string;
  category: ExerciseCategory;
  lifecycleStatus: ExerciseLifecycleStatus;
  kind: ExerciseDefinitionKind;
  tags?: string[];
}

export function matchesCatalogQuery(
  item: { displayName: string; searchText: string; tags: string[] },
  q: string,
): boolean {
  const lower = q.trim().toLowerCase();
  if (!lower) return true;
  return (
    item.displayName.toLowerCase().includes(lower) ||
    item.searchText.includes(lower) ||
    item.tags.some((t) => t.toLowerCase().includes(lower))
  );
}

export function filterPickerOptions(
  options: SessionPickerOption[],
  query: string,
  limit = 12,
): SessionPickerOption[] {
  const q = query.trim();
  if (!q) return options.slice(0, limit);
  return options
    .filter((o) =>
      matchesCatalogQuery(
        { displayName: o.name, searchText: o.searchText, tags: o.tags ?? [] },
        q,
      ),
    )
    .slice(0, limit);
}

export function mergedViewsToPickerOptions(
  merged: MergedDefinitionView[],
  taxonomy: ExerciseTaxonomyBundle,
): SessionPickerOption[] {
  return merged
    .filter((d) => !d.hiddenByCoach && d.lifecycleStatus !== 'deprecated')
    .map((def) => {
      const legacy = toLegacyExercise(def, taxonomy);
      return {
        id: def.legacyExerciseId ?? def.id,
        definitionId: def.id,
        name: def.effectiveDisplayName,
        searchText: def.searchText,
        category: legacy.category,
        lifecycleStatus: def.lifecycleStatus,
        kind: def.kind,
        tags: def.tags.length ? [...def.tags] : undefined,
      };
    });
}

export type SessionPickerBlockKind = 'single' | 'complexSegment';

export function browseQueryForPickerKind(kind: SessionPickerBlockKind): 'single' | 'all' {
  return kind === 'complexSegment' ? 'single' : 'all';
}
