import { describe, expect, it } from 'vitest';
import type { ExerciseDefinition } from '../../models/exercise';
import {
  mergeLibraryImport,
  parseLibraryExport,
  previewLibraryImport,
} from './libraryExport';

const baseDef = (id: string, signature: string): ExerciseDefinition => ({
  id,
  coachId: 'user-coach',
  kind: 'single',
  family: 'accessory',
  objective: 'technique',
  loadAnchor: 'auto',
  composition: {
    kind: 'single',
    family: 'accessory',
    variation: 'classic',
    startPosition: 'floor',
    modifiers: [],
    tempo: null,
  },
  displayName: `Exercise ${id}`,
  signature,
  searchText: id,
  tags: ['accessory'],
});

describe('libraryExport', () => {
  it('parses valid export payloads', () => {
    const parsed = parseLibraryExport({
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      coachId: 'user-coach',
      checksum: 'abc',
      definitions: [baseDef('def-1', 'sig-1')],
      overrides: [],
      customFamilies: [],
    });
    expect(parsed.ok).toBe(true);
  });

  it('previews new and updated definitions', () => {
    const payload = {
      version: 1 as const,
      exportedAt: '2026-01-01T00:00:00.000Z',
      coachId: 'user-coach',
      checksum: 'abc',
      definitions: [baseDef('def-2', 'sig-2'), baseDef('def-1', 'sig-1')],
      overrides: [],
      customFamilies: [],
    };
    const preview = previewLibraryImport(payload, {
      definitions: [baseDef('def-1', 'sig-1')],
      overrides: [],
      customFamilies: [],
    });
    expect(preview.newDefinitions).toHaveLength(1);
    expect(preview.updatedDefinitions).toHaveLength(1);
  });

  it('merges imports idempotently by signature', () => {
    const payload = {
      version: 1 as const,
      exportedAt: '2026-01-01T00:00:00.000Z',
      coachId: 'user-coach',
      checksum: 'abc',
      definitions: [{ ...baseDef('def-import', 'sig-1'), displayName: 'Updated name' }],
      overrides: [],
      customFamilies: [],
    };
    const merged = mergeLibraryImport(payload, {
      definitions: [baseDef('def-1', 'sig-1')],
      overrides: [],
      customFamilies: [],
    });
    expect(merged.applied.definitionsUpdated).toBe(1);
    expect(merged.definitions.find((def) => def.id === 'def-1')?.displayName).toBe('Updated name');
  });
});
