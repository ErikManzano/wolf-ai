import type { CoachExerciseFamily } from '../../models/exercise/coachFamily';
import type { CoachExerciseOverride, ExerciseDefinition } from '../../models/exercise';

export const LIBRARY_EXPORT_VERSION = 1 as const;

export interface LibraryExportPayload {
  version: typeof LIBRARY_EXPORT_VERSION;
  exportedAt: string;
  coachId: string;
  checksum: string;
  definitions: ExerciseDefinition[];
  overrides: CoachExerciseOverride[];
  customFamilies: CoachExerciseFamily[];
}

export interface LibraryImportPreview {
  newDefinitions: ExerciseDefinition[];
  updatedDefinitions: ExerciseDefinition[];
  newOverrides: CoachExerciseOverride[];
  updatedOverrides: CoachExerciseOverride[];
  newFamilies: CoachExerciseFamily[];
  updatedFamilies: CoachExerciseFamily[];
  totalItems: number;
}

export interface LibraryImportMergeResult {
  definitions: ExerciseDefinition[];
  overrides: CoachExerciseOverride[];
  customFamilies: CoachExerciseFamily[];
  applied: {
    definitionsAdded: number;
    definitionsUpdated: number;
    overridesAdded: number;
    overridesUpdated: number;
    familiesAdded: number;
    familiesUpdated: number;
  };
}

export async function computeLibraryChecksum(body: Omit<LibraryExportPayload, 'checksum'>): Promise<string> {
  const text = JSON.stringify(body);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16);
  }
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export async function buildLibraryExport(input: {
  coachId: string;
  definitions: ExerciseDefinition[];
  overrides: CoachExerciseOverride[];
  customFamilies: CoachExerciseFamily[];
}): Promise<LibraryExportPayload> {
  const definitions = input.definitions.filter((def) => Boolean(def.coachId));
  const overrides = input.overrides.filter((ovr) => ovr.coachId === input.coachId);
  const customFamilies = input.customFamilies.filter((family) => family.coachId === input.coachId);
  const body = {
    version: LIBRARY_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    coachId: input.coachId,
    definitions,
    overrides,
    customFamilies,
  };
  const checksum = await computeLibraryChecksum(body);
  return { ...body, checksum };
}

export function parseLibraryExport(raw: unknown): { ok: true; data: LibraryExportPayload } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Invalid JSON file.' };
  const data = raw as Partial<LibraryExportPayload>;
  if (data.version !== LIBRARY_EXPORT_VERSION) {
    return { ok: false, error: 'Unsupported export version.' };
  }
  if (!Array.isArray(data.definitions) || !Array.isArray(data.overrides)) {
    return { ok: false, error: 'Export is missing definitions or overrides.' };
  }
  return {
    ok: true,
    data: {
      version: LIBRARY_EXPORT_VERSION,
      exportedAt: data.exportedAt ?? new Date().toISOString(),
      coachId: data.coachId ?? 'user-coach',
      checksum: data.checksum ?? '',
      definitions: data.definitions,
      overrides: data.overrides,
      customFamilies: Array.isArray(data.customFamilies) ? data.customFamilies : [],
    },
  };
}

function definitionKey(def: ExerciseDefinition): string {
  return def.signature || def.id;
}

function overrideKey(ovr: CoachExerciseOverride): string {
  return `${ovr.coachId}:${ovr.baseDefinitionId}`;
}

function familyKey(family: CoachExerciseFamily): string {
  return family.slug || family.id;
}

export function previewLibraryImport(
  payload: LibraryExportPayload,
  existing: {
    definitions: ExerciseDefinition[];
    overrides: CoachExerciseOverride[];
    customFamilies: CoachExerciseFamily[];
  },
): LibraryImportPreview {
  const coachDefs = existing.definitions.filter((def) => Boolean(def.coachId));
  const defBySignature = new Map(coachDefs.map((def) => [definitionKey(def), def]));
  const defById = new Map(coachDefs.map((def) => [def.id, def]));

  const newDefinitions: ExerciseDefinition[] = [];
  const updatedDefinitions: ExerciseDefinition[] = [];
  for (const incoming of payload.definitions) {
    const byId = defById.get(incoming.id);
    const bySignature = defBySignature.get(definitionKey(incoming));
    if (byId || bySignature) updatedDefinitions.push(incoming);
    else newDefinitions.push(incoming);
  }

  const ovrMap = new Map(existing.overrides.map((ovr) => [overrideKey(ovr), ovr]));
  const newOverrides: CoachExerciseOverride[] = [];
  const updatedOverrides: CoachExerciseOverride[] = [];
  for (const incoming of payload.overrides) {
    const key = overrideKey(incoming);
    if (ovrMap.has(key)) updatedOverrides.push(incoming);
    else newOverrides.push(incoming);
  }

  const famMap = new Map(existing.customFamilies.map((family) => [familyKey(family), family]));
  const newFamilies: CoachExerciseFamily[] = [];
  const updatedFamilies: CoachExerciseFamily[] = [];
  for (const incoming of payload.customFamilies) {
    const key = familyKey(incoming);
    if (famMap.has(key)) updatedFamilies.push(incoming);
    else newFamilies.push(incoming);
  }

  return {
    newDefinitions,
    updatedDefinitions,
    newOverrides,
    updatedOverrides,
    newFamilies,
    updatedFamilies,
    totalItems:
      newDefinitions.length +
      updatedDefinitions.length +
      newOverrides.length +
      updatedOverrides.length +
      newFamilies.length +
      updatedFamilies.length,
  };
}

export function mergeLibraryImport(
  payload: LibraryExportPayload,
  existing: {
    definitions: ExerciseDefinition[];
    overrides: CoachExerciseOverride[];
    customFamilies: CoachExerciseFamily[];
  },
): LibraryImportMergeResult {
  const coachDefs = existing.definitions.filter((def) => Boolean(def.coachId));
  const systemDefs = existing.definitions.filter((def) => !def.coachId);
  const defBySignature = new Map(coachDefs.map((def) => [definitionKey(def), def]));
  const defById = new Map(coachDefs.map((def) => [def.id, def]));
  const mergedCoachDefs = [...coachDefs];

  const upsertDefinition = (incoming: ExerciseDefinition) => {
    const target = defById.get(incoming.id) ?? defBySignature.get(definitionKey(incoming));
    if (target) {
      const idx = mergedCoachDefs.findIndex((def) => def.id === target.id);
      const merged = { ...target, ...incoming, id: target.id, updatedAt: new Date().toISOString() };
      if (idx >= 0) mergedCoachDefs[idx] = merged;
      defById.set(target.id, merged);
      defBySignature.set(definitionKey(merged), merged);
      return 'updated' as const;
    }
    const created = { ...incoming, coachId: incoming.coachId ?? payload.coachId };
    mergedCoachDefs.push(created);
    defById.set(created.id, created);
    defBySignature.set(definitionKey(created), created);
    return 'added' as const;
  };

  let definitionsAdded = 0;
  let definitionsUpdated = 0;
  for (const incoming of payload.definitions) {
    const result = upsertDefinition(incoming);
    if (result === 'added') definitionsAdded += 1;
    else definitionsUpdated += 1;
  }

  const ovrMap = new Map(existing.overrides.map((ovr) => [overrideKey(ovr), ovr]));
  const mergedOverrides = [...existing.overrides];
  let overridesAdded = 0;
  let overridesUpdated = 0;
  for (const incoming of payload.overrides) {
    const key = overrideKey(incoming);
    const target = ovrMap.get(key);
    if (target) {
      const idx = mergedOverrides.findIndex((ovr) => ovr.id === target.id);
      const merged = { ...target, ...incoming, id: target.id, updatedAt: new Date().toISOString() };
      if (idx >= 0) mergedOverrides[idx] = merged;
      overridesUpdated += 1;
    } else {
      mergedOverrides.push(incoming);
      overridesAdded += 1;
    }
  }

  const famMap = new Map(existing.customFamilies.map((family) => [familyKey(family), family]));
  const mergedFamilies = [...existing.customFamilies];
  let familiesAdded = 0;
  let familiesUpdated = 0;
  for (const incoming of payload.customFamilies) {
    const key = familyKey(incoming);
    const target = famMap.get(key);
    if (target) {
      const idx = mergedFamilies.findIndex((family) => family.id === target.id);
      const merged = { ...target, ...incoming, id: target.id, updatedAt: new Date().toISOString() };
      if (idx >= 0) mergedFamilies[idx] = merged;
      familiesUpdated += 1;
    } else {
      mergedFamilies.push(incoming);
      familiesAdded += 1;
    }
  }

  return {
    definitions: [...systemDefs, ...mergedCoachDefs],
    overrides: mergedOverrides,
    customFamilies: mergedFamilies,
    applied: {
      definitionsAdded,
      definitionsUpdated,
      overridesAdded,
      overridesUpdated,
      familiesAdded,
      familiesUpdated,
    },
  };
}

export function downloadLibraryExport(payload: LibraryExportPayload, filename = 'wolf-exercise-library.json'): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
