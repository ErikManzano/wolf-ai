import type { TechnicalCollectionWithItems } from '../../models/exercise';
import { bulgarianCatalogEntries } from '../bulgarianCatalogData';

const GROUP_LABELS: Record<
  string,
  { title: string; titleEs: string; objectiveId: TechnicalCollectionWithItems['objectiveId']; methodology: string }
> = {
  grupo_1: { title: 'Grupo 1 — Classic Snatch', titleEs: 'Grupo 1 — Snatch clásico', objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_2: { title: 'Grupo 2 — Classic Snatch Positional', titleEs: 'Grupo 2 — Snatch clásico posicional', objectiveId: 'technique', methodology: 'bulgarian' },
  grupo_3: { title: 'Grupo 3 — Power Snatch', titleEs: 'Grupo 3 — Power snatch', objectiveId: 'speed', methodology: 'bulgarian' },
  grupo_4: { title: 'Grupo 4 — Snatch Pull', titleEs: 'Grupo 4 — Snatch pull', objectiveId: 'pulling_strength', methodology: 'bulgarian' },
  grupo_5: { title: 'Grupo 5 — Classic Clean & Jerk', titleEs: 'Grupo 5 — C&J clásico', objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_6: { title: 'Grupo 6 — Classic C&J Positional', titleEs: 'Grupo 6 — C&J clásico posicional', objectiveId: 'technique', methodology: 'bulgarian' },
  grupo_7: { title: 'Grupo 7 — Power Clean', titleEs: 'Grupo 7 — Power clean', objectiveId: 'speed', methodology: 'bulgarian' },
  grupo_8: { title: 'Grupo 8 — Jerk Variations', titleEs: 'Grupo 8 — Variantes de jerk', objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_9: { title: 'Grupo 9 — Clean Pull', titleEs: 'Grupo 9 — Clean pull', objectiveId: 'pulling_strength', methodology: 'bulgarian' },
  grupo_10: { title: 'Grupo 10 — Squats', titleEs: 'Grupo 10 — Sentadillas', objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_11: { title: 'Grupo 11 — Good Mornings & Pulley', titleEs: 'Grupo 11 — Good morning y polea', objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_12: { title: 'Grupo 12 — Pressing', titleEs: 'Grupo 12 — Pressing', objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_13: { title: 'Grupo 13 — Additional Loading (A.L.)', titleEs: 'Grupo 13 — Carga adicional', objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_14: { title: 'Grupo 14 — Back', titleEs: 'Grupo 14 — Espalda', objectiveId: 'strength', methodology: 'bulgarian' },
  grupo_15: { title: 'Grupo 15 — Arms & Shoulder Girdle', titleEs: 'Grupo 15 — Brazos y cintura escapular', objectiveId: 'technique', methodology: 'bulgarian' },
};

const GROUP_ORDER = [
  'grupo_1',
  'grupo_2',
  'grupo_3',
  'grupo_4',
  'grupo_5',
  'grupo_6',
  'grupo_7',
  'grupo_8',
  'grupo_9',
  'grupo_10',
  'grupo_11',
  'grupo_12',
  'grupo_13',
  'grupo_14',
  'grupo_15',
] as const;

const LEGACY_IDS_BY_GROUP: Record<string, string[]> = {
  grupo_1: ['ex-001'],
  grupo_2: ['ex-004', 'ex-005', 'ex-010', 'ex-011'],
  grupo_3: ['ex-002', 'ex-007', 'ex-012', 'ex-037'],
  grupo_4: ['ex-008', 'ex-009', 'ex-034'],
  grupo_5: ['ex-016', 'ex-025'],
  grupo_6: ['ex-018', 'ex-026'],
  grupo_7: ['ex-017', 'ex-019'],
  grupo_8: ['ex-022', 'ex-023', 'ex-035'],
  grupo_9: ['ex-020', 'ex-021'],
  grupo_10: ['ex-027', 'ex-028', 'ex-029', 'ex-030', 'ex-031'],
  grupo_11: ['ex-032', 'ex-033'],
  grupo_12: ['ex-024', 'ex-036'],
};

function idsForGroup(group: string): string[] {
  const ids = bulgarianCatalogEntries.filter((ex) => ex.catalogGroup === group).map((ex) => ex.id);
  const legacy = LEGACY_IDS_BY_GROUP[group] ?? [];
  return [...new Set([...legacy, ...ids])];
}

/** System technical collections aligned to coach catalog groups 1–15. */
export function seedTechnicalCollectionsLocal(): TechnicalCollectionWithItems[] {
  return GROUP_ORDER.map((group, sortOrder) => {
    const meta = GROUP_LABELS[group]!;
    const definitionIds = idsForGroup(group);
    const collectionId = `tc-${group.replace('_', '-')}`;
    return {
      id: collectionId,
      coachId: null,
      code: group,
      title: meta.title,
      methodology: meta.methodology,
      objectiveId: meta.objectiveId,
      tags: [group, 'bulgarian', 'coach_catalog'],
      description: meta.titleEs,
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
