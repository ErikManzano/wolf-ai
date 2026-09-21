import { describe, expect, it } from 'vitest';
import type { ExerciseDefinition } from '../../models/exercise';
import { customFamilyTag } from '../../models/exercise/coachFamily';
import { mergeDefinitionView } from './mergeDefinitionView';

function stubDef(partial: Partial<ExerciseDefinition> & Pick<ExerciseDefinition, 'id' | 'displayName'>): ExerciseDefinition {
  return {
    kind: 'single',
    objective: 'technique',
    loadAnchor: 'auto',
    composition: {
      kind: 'single',
      family: 'snatch',
      variation: 'classic',
      startPosition: 'floor',
      modifiers: [],
      tempo: null,
    },
    family: 'snatch',
    signature: partial.id,
    searchText: partial.displayName.toLowerCase(),
    tags: ['snatch', 'technique'],
    lifecycleStatus: 'official',
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('mergeDefinitionView', () => {
  it('applies custom family folder from coach override', () => {
    const folderId = 'cfam-abs';
    const merged = mergeDefinitionView(stubDef({ id: 'hang-snatch', displayName: 'Hang Snatch' }), {
      id: 'ovr-coach-hang-snatch',
      coachId: 'user-coach',
      baseDefinitionId: 'hang-snatch',
      override: { customFamilyId: folderId },
    });

    expect(merged.tags).toContain(customFamilyTag(folderId));
  });

  it('clears custom family folder when override sets null', () => {
    const merged = mergeDefinitionView(
      stubDef({
        id: 'hang-snatch',
        displayName: 'Hang Snatch',
        tags: ['snatch', 'technique', customFamilyTag('cfam-abs')],
      }),
      {
        id: 'ovr-coach-hang-snatch',
        coachId: 'user-coach',
        baseDefinitionId: 'hang-snatch',
        override: { customFamilyId: null },
      },
    );

    expect(merged.tags.some((tag) => tag.startsWith('cf:'))).toBe(false);
  });
});
