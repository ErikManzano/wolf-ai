import concentradoJson from './exercises-concentrado.json';
import type { ExerciseDefinition } from '../models/exercise';
import type { TrainingObjectiveCode } from '../models/exercise/taxonomy';
import type { SingleComposition } from '../models/exercise/composition';
import { buildExerciseDefinition } from '../services/exercise/buildDefinition';
import { buildSearchText } from '../services/exercise/composeDisplayName';
import { getExerciseTaxonomy } from '../services/exercise';

export type ConcentradoSection = 'strength' | 'warmup' | 'foam' | 'bodyweight';
export type ConcentradoMuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'full_body';

export interface ConcentradoExercise {
  id: string;
  nameEn: string;
  nameEs: string;
  section: ConcentradoSection;
  muscleGroup: ConcentradoMuscleGroup;
  equipment: string;
  cuesEn: string;
  cuesEs: string;
  variations?: string[];
  mapsToLegacyId?: string | null;
}

export const concentradoExercises = concentradoJson as ConcentradoExercise[];

const ACCESSORY_SINGLE: SingleComposition = {
  kind: 'single',
  family: 'accessory',
  variation: 'classic',
  startPosition: 'floor',
  modifiers: [],
};

function objectiveFor(item: ConcentradoExercise): TrainingObjectiveCode {
  if (item.section === 'foam' || item.section === 'warmup') return 'recovery';
  return 'strength';
}

export function concentradoTags(item: ConcentradoExercise): string[] {
  return [
    'concentrado',
    'accessory',
    item.section,
    `muscle:${item.muscleGroup}`,
    `equip:${item.equipment}`,
  ];
}

export function buildConcentradoDefinition(item: ConcentradoExercise): ExerciseDefinition {
  const bundle = getExerciseTaxonomy();
  const objective = objectiveFor(item);
  const tags = concentradoTags(item);
  const base = buildExerciseDefinition(
    item.id,
    {
      kind: 'single',
      composition: ACCESSORY_SINGLE,
      objective,
      loadAnchor: 'auto',
      tags,
    },
    bundle,
    { coachId: null, legacyExerciseId: item.id, locale: 'en' },
  );
  const cuesEn = [item.cuesEn, item.variations?.join(' ')].filter(Boolean).join(' ').trim() || null;
  const cuesEs = item.cuesEs.trim() || null;
  return {
    ...base,
    displayName: item.nameEn,
    cuesEn,
    cuesEs,
    searchText: [
      buildSearchText(item.nameEn, ACCESSORY_SINGLE),
      item.nameEs.toLowerCase(),
      item.nameEn.toLowerCase(),
      ...tags,
    ]
      .filter(Boolean)
      .join(' '),
    tags,
  };
}

/** New official accessory rows (excludes items mapped to existing WL ids). */
export function seedConcentradoAccessoryDefinitions(): ExerciseDefinition[] {
  return concentradoExercises
    .filter((item) => !item.mapsToLegacyId)
    .map((item) => buildConcentradoDefinition(item));
}

/** Merge CONCENTRADO cues/tags into legacy WL definitions without replacing composition. */
export function enrichLegacyDefinitionsFromConcentrado(
  definitions: ExerciseDefinition[],
): ExerciseDefinition[] {
  const enrichments = concentradoExercises.filter((item) => item.mapsToLegacyId);
  if (enrichments.length === 0) return definitions;

  const byLegacy = new Map<string, ConcentradoExercise[]>();
  for (const item of enrichments) {
    const legacyId = item.mapsToLegacyId!;
    const list = byLegacy.get(legacyId) ?? [];
    list.push(item);
    byLegacy.set(legacyId, list);
  }

  return definitions.map((def) => {
    const key = def.legacyExerciseId ?? def.id;
    const items = byLegacy.get(key);
    if (!items?.length) return def;

    const cuesEn = items.map((i) => i.cuesEn).filter(Boolean).join('\n\n').trim() || def.cuesEn;
    const cuesEs = items.map((i) => i.cuesEs).filter(Boolean).join('\n\n').trim() || def.cuesEs;
    const extraTags = items.flatMap((i) => concentradoTags(i));
    return {
      ...def,
      cuesEn: cuesEn || null,
      cuesEs: cuesEs || null,
      tags: [...new Set([...def.tags, ...extraTags, 'concentrado'])],
      searchText: [def.searchText, ...items.map((i) => i.nameEs)].filter(Boolean).join(' '),
    };
  });
}

/** Full system catalog: legacy WL + concentrado accessory + WL enrichments. */
export function seedFullOfficialExerciseCatalog(baseLegacy: ExerciseDefinition[]): ExerciseDefinition[] {
  const enriched = enrichLegacyDefinitionsFromConcentrado(baseLegacy);
  const concentrado = seedConcentradoAccessoryDefinitions();
  const byId = new Map<string, ExerciseDefinition>();
  for (const d of enriched) byId.set(d.id, d);
  for (const d of concentrado) byId.set(d.id, d);
  return [...byId.values()];
}
