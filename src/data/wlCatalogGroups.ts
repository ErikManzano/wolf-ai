import type { MergedDefinitionView } from '../models/exercise';

/** Grupos del documento Fundamental exercises (metodología búlgara). */
export const WL_CATALOG_GROUP_ORDER = [
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

export type WlCatalogGroupId = (typeof WL_CATALOG_GROUP_ORDER)[number];
export type CatalogGrupoFilter = 'all' | WlCatalogGroupId;

export const WL_CATALOG_GROUP_LABELS: Record<
  WlCatalogGroupId,
  { titleEn: string; titleEs: string; chipEn: string; chipEs: string }
> = {
  grupo_1: {
    titleEn: 'Grupo 1 — Classic snatch (squat snatch)',
    titleEs: 'Grupo 1 — Snatch clásico (sentadilla completa)',
    chipEn: 'G1 · Classic snatch',
    chipEs: 'G1 · Snatch clásico',
  },
  grupo_2: {
    titleEn: 'Grupo 2 — Classic snatch positional',
    titleEs: 'Grupo 2 — Snatch clásico posicional',
    chipEn: 'G2 · Snatch posicional',
    chipEs: 'G2 · Snatch posicional',
  },
  grupo_3: {
    titleEn: 'Grupo 3 — Power snatch',
    titleEs: 'Grupo 3 — Arrancada en power',
    chipEn: 'G3 · Power snatch',
    chipEs: 'G3 · Arrancada en power',
  },
  grupo_4: {
    titleEn: 'Grupo 4 — Snatch pull',
    titleEs: 'Grupo 4 — Tirón de snatch',
    chipEn: 'G4 · Snatch pull',
    chipEs: 'G4 · Tirón de snatch',
  },
  grupo_5: {
    titleEn: 'Grupo 5 — Classic clean & jerk',
    titleEs: 'Grupo 5 — C&J clásico',
    chipEn: 'G5 · Classic C&J',
    chipEs: 'G5 · C&J clásico',
  },
  grupo_6: {
    titleEn: 'Grupo 6 — Classic C&J positional',
    titleEs: 'Grupo 6 — C&J clásico posicional',
    chipEn: 'G6 · C&J posicional',
    chipEs: 'G6 · C&J posicional',
  },
  grupo_7: {
    titleEn: 'Grupo 7 — Power clean',
    titleEs: 'Grupo 7 — Cargada en power',
    chipEn: 'G7 · Power clean',
    chipEs: 'G7 · Cargada en power',
  },
  grupo_8: {
    titleEn: 'Grupo 8 — Jerk variations',
    titleEs: 'Grupo 8 — Variantes de jerk',
    chipEn: 'G8 · Jerk',
    chipEs: 'G8 · Jerk',
  },
  grupo_9: {
    titleEn: 'Grupo 9 — Clean pull',
    titleEs: 'Grupo 9 — Tirón de clean',
    chipEn: 'G9 · Clean pull',
    chipEs: 'G9 · Tirón de clean',
  },
  grupo_10: {
    titleEn: 'Grupo 10 — Squats',
    titleEs: 'Grupo 10 — Sentadillas',
    chipEn: 'G10 · Sentadillas',
    chipEs: 'G10 · Sentadillas',
  },
  grupo_11: {
    titleEn: 'Grupo 11 — Good mornings & pulley',
    titleEs: 'Grupo 11 — Good morning y polea',
    chipEn: 'G11 · Good morning',
    chipEs: 'G11 · Good morning',
  },
  grupo_12: {
    titleEn: 'Grupo 12 — Pressing',
    titleEs: 'Grupo 12 — Pressing',
    chipEn: 'G12 · Pressing',
    chipEs: 'G12 · Pressing',
  },
  grupo_13: {
    titleEn: 'Grupo 13 — Additional loading (A.L.)',
    titleEs: 'Grupo 13 — Carga adicional',
    chipEn: 'G13 · Carga adicional',
    chipEs: 'G13 · Carga adicional',
  },
  grupo_14: {
    titleEn: 'Grupo 14 — Back',
    titleEs: 'Grupo 14 — Espalda',
    chipEn: 'G14 · Espalda',
    chipEs: 'G14 · Espalda',
  },
  grupo_15: {
    titleEn: 'Grupo 15 — Arms & shoulder girdle',
    titleEs: 'Grupo 15 — Brazos y hombros',
    chipEn: 'G15 · Brazos',
    chipEs: 'G15 · Brazos',
  },
};

/** Legacy motor ids → grupo (catálogo reducido ex-001…). */
export const LEGACY_IDS_BY_GROUP: Record<WlCatalogGroupId, string[]> = {
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
  grupo_11: [],
  grupo_12: ['ex-024', 'ex-036'],
  grupo_13: [],
  grupo_14: [],
  grupo_15: [],
};

export const LEGACY_ID_TO_CATALOG_GRUPO: Record<string, WlCatalogGroupId> = Object.fromEntries(
  WL_CATALOG_GROUP_ORDER.flatMap((grupo) =>
    (LEGACY_IDS_BY_GROUP[grupo] ?? []).map((id) => [id, grupo] as const),
  ),
) as Record<string, WlCatalogGroupId>;

export function catalogGrupoFromDefinition(def: {
  tags: string[];
  id: string;
  legacyExerciseId?: string | null;
}): WlCatalogGroupId | null {
  const tag = def.tags.find((t) => /^grupo_\d+$/.test(t));
  if (tag && WL_CATALOG_GROUP_ORDER.includes(tag as WlCatalogGroupId)) {
    return tag as WlCatalogGroupId;
  }
  const keys = [def.legacyExerciseId, def.id].filter((id): id is string => Boolean(id));
  for (const key of keys) {
    const hit = LEGACY_ID_TO_CATALOG_GRUPO[key];
    if (hit) return hit;
  }
  return null;
}

export function catalogGrupoFromPickerTags(tags: string[] | undefined, id: string): WlCatalogGroupId | null {
  const tag = tags?.find((t) => /^grupo_\d+$/.test(t));
  if (tag && WL_CATALOG_GROUP_ORDER.includes(tag as WlCatalogGroupId)) {
    return tag as WlCatalogGroupId;
  }
  return LEGACY_ID_TO_CATALOG_GRUPO[id] ?? null;
}

export function catalogGrupoCounts(
  definitions: MergedDefinitionView[],
): Record<CatalogGrupoFilter, number> {
  const counts: Record<string, number> = { all: 0 };
  for (const def of definitions) {
    counts.all = (counts.all ?? 0) + 1;
    const grupo = catalogGrupoFromDefinition(def);
    if (grupo) counts[grupo] = (counts[grupo] ?? 0) + 1;
  }
  return counts as Record<CatalogGrupoFilter, number>;
}

export function isCatalogGrupoFilter(value: string): value is CatalogGrupoFilter {
  return value === 'all' || WL_CATALOG_GROUP_ORDER.includes(value as WlCatalogGroupId);
}
