import type { TechnicalCollectionWithItems } from '../../models/exercise';
import { bulgarianCatalogEntries } from '../bulgarianCatalogData';
import {
  LEGACY_IDS_BY_GROUP,
  WL_CATALOG_GROUP_LABELS,
  WL_CATALOG_GROUP_ORDER,
  type WlCatalogGroupId,
} from '../wlCatalogGroups';

const GROUP_OBJECTIVES: Record<
  WlCatalogGroupId,
  { objectiveId: TechnicalCollectionWithItems['objectiveId']; methodology: string }
> = {
  grupo_1: { objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_2: { objectiveId: 'technique', methodology: 'bulgarian' },
  grupo_3: { objectiveId: 'speed', methodology: 'bulgarian' },
  grupo_4: { objectiveId: 'pulling_strength', methodology: 'bulgarian' },
  grupo_5: { objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_6: { objectiveId: 'technique', methodology: 'bulgarian' },
  grupo_7: { objectiveId: 'speed', methodology: 'bulgarian' },
  grupo_8: { objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_9: { objectiveId: 'pulling_strength', methodology: 'bulgarian' },
  grupo_10: { objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_11: { objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_12: { objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_13: { objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_14: { objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_15: { objectiveId: 'technique', methodology: 'bulgarian' },
};

function idsForGroup(group: WlCatalogGroupId): string[] {
  const ids = bulgarianCatalogEntries.filter((ex) => ex.catalogGroup === group).map((ex) => ex.id);
  const legacy = LEGACY_IDS_BY_GROUP[group] ?? [];
  return [...new Set([...legacy, ...ids])];
}

/** System technical collections aligned to coach catalog groups 1–15. */
export function seedTechnicalCollectionsLocal(): TechnicalCollectionWithItems[] {
  return WL_CATALOG_GROUP_ORDER.map((group, sortOrder) => {
    const labels = WL_CATALOG_GROUP_LABELS[group];
    const meta = GROUP_OBJECTIVES[group];
    const definitionIds = idsForGroup(group);
    const collectionId = `tc-${group.replace('_', '-')}`;
    return {
      id: collectionId,
      coachId: null,
      code: group,
      title: labels.titleEn,
      methodology: meta.methodology,
      objectiveId: meta.objectiveId,
      tags: [group, 'bulgarian', 'coach_catalog'],
      description: labels.titleEs,
      sortOrder,
      isActive: true,
      items: definitionIds.map((definitionId, position) => ({
        collectionId,
        definitionId,
        position,
      })),
    };
  });
}
