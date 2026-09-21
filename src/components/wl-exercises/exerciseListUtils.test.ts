import { describe, expect, it } from 'vitest';
import type { MergedDefinitionView } from '../../models/exercise';
import type { Exercise } from '../../models/training';
import { customFamilyFilterKey, customFamilyTag } from '../../models/exercise/coachFamily';
import {
  FAMILY_DISPLAY_LABEL,
  buildExerciseListNodes,
  familyCounts,
  filterExerciseDefinitions,
  type ExerciseFamilyFilter,
  formatExerciseMetaLine,
  hasExerciseDefinitionChanged,
  intensityRefDisplayLabel,
  intensityRefLabel,
  loadScaleForDefinition,
  sortExerciseDefinitionsByState,
  sortIdToSortState,
  toggleColumnSort,
  toExerciseListItem,
} from './exerciseListUtils';

function stubDef(partial: Partial<MergedDefinitionView> & Pick<MergedDefinitionView, 'id' | 'displayName'>): MergedDefinitionView {
  return {
    kind: 'single',
    objective: 'technique',
    loadAnchor: 'snatch',
    composition: { kind: 'single', family: 'snatch', variation: 'hang', startPosition: 'floor', modifiers: [], tempo: null },
    family: 'snatch',
    signature: partial.id,
    searchText: partial.displayName.toLowerCase(),
    tags: [],
    lifecycleStatus: 'official',
    version: 1,
    effectiveDisplayName: partial.displayName,
    isOfficial: true,
    isCoachFork: false,
    ...partial,
  };
}

describe('exercise list meta', () => {
  it('uses English family names without mixing languages', () => {
    expect(FAMILY_DISPLAY_LABEL.pull).toBe('Pull');
    expect(FAMILY_DISPLAY_LABEL.squat).toBe('Squat');
    expect(FAMILY_DISPLAY_LABEL.accessory).toBe('Accessory');
  });

  it('hides Ref when intensity is propio/auto and hides zero usage', () => {
    expect(intensityRefLabel('auto')).toBeNull();
    expect(intensityRefDisplayLabel('auto', true)).toBe('Propio');
    expect(intensityRefDisplayLabel('auto', false)).toBe('Self');
    expect(
      formatExerciseMetaLine({
        familyLabel: 'Accessory',
        typeLabel: 'Accesorio',
        intensityLabel: null,
        usageCount: 0,
        isEs: true,
      }),
    ).toBe('Accessory · Accesorio');
  });

  it('shows intensity and program usage when present', () => {
    expect(
      formatExerciseMetaLine({
        familyLabel: 'Snatch',
        typeLabel: 'Técnica',
        intensityLabel: 'Snatch',
        usageCount: 12,
        isEs: true,
      }),
    ).toBe('Snatch · Técnica · Ref: Snatch · 12 programas');
  });

  it('maps a definition into the list view model', () => {
    const item = toExerciseListItem(
      stubDef({ id: 'hang-snatch', displayName: 'Hang Snatch', family: 'snatch', loadAnchor: 'snatch' }),
      { isEs: true, typeLabel: 'Técnica', usageCount: 12, isFavorite: true, loadScale: 1.05 },
    );
    expect(item.familyLabel).toBe('Snatch');
    expect(item.intensityRef).toBe('Snatch');
    expect(item.isOfficial).toBe(true);
    expect(item.isFavorite).toBe(true);
    expect(item.loadScale).toBe(1.05);
    expect(item.isArchived).toBe(false);
  });

  it('marks archived definitions', () => {
    const item = toExerciseListItem(
      stubDef({ id: 'archived', displayName: 'Old Move', hiddenByCoach: true }),
      { isEs: true, typeLabel: 'Técnica', usageCount: 0, isFavorite: false },
    );
    expect(item.isArchived).toBe(true);
  });

  it('sorts by family then name', () => {
    const sorted = sortExerciseDefinitionsByState(
      [
        stubDef({ id: 'b', displayName: 'Hang Snatch', family: 'snatch' }),
        stubDef({
          id: 'a',
          displayName: 'Back Squat',
          family: 'squat',
          loadAnchor: 'back_squat',
          composition: { kind: 'single', family: 'squat', variation: 'classic', startPosition: 'floor', modifiers: [], tempo: null },
        }),
        stubDef({
          id: 'c',
          displayName: 'Power Clean',
          family: 'clean',
          loadAnchor: 'clean_jerk',
          composition: { kind: 'single', family: 'clean', variation: 'power', startPosition: 'floor', modifiers: [], tempo: null },
        }),
      ],
      sortIdToSortState('family'),
    );
    expect(sorted.map((def) => def.effectiveDisplayName)).toEqual(['Hang Snatch', 'Power Clean', 'Back Squat']);
  });

  it('toggles column sort direction', () => {
    expect(toggleColumnSort({ column: 'name', direction: 'asc' }, 'name')).toEqual({
      column: 'name',
      direction: 'desc',
    });
    expect(toggleColumnSort({ column: 'name', direction: 'asc' }, 'usage')).toEqual({
      column: 'usage',
      direction: 'desc',
    });
  });

  it('groups list items by family', () => {
    const nodes = buildExerciseListNodes(
      [
        toExerciseListItem(stubDef({ id: '1', displayName: 'Hang Snatch' }), {
          isEs: true,
          typeLabel: 'Técnica',
          usageCount: 0,
          isFavorite: false,
        }),
        toExerciseListItem(
          stubDef({
            id: '2',
            displayName: 'Power Clean',
            family: 'clean',
            loadAnchor: 'clean_jerk',
            composition: { kind: 'single', family: 'clean', variation: 'power', startPosition: 'floor', modifiers: [], tempo: null },
          }),
          { isEs: true, typeLabel: 'Técnica', usageCount: 0, isFavorite: false },
        ),
      ],
      true,
      'all',
    );
    expect(nodes.filter((node) => node.kind === 'group')).toHaveLength(2);
    expect(nodes.filter((node) => node.kind === 'row')).toHaveLength(2);
  });

  it('detects non-folder exercise edits', () => {
    const base = stubDef({ id: 'hang-snatch', displayName: 'Hang Snatch' });
    expect(
      hasExerciseDefinitionChanged(base, {
        kind: 'single',
        composition: base.composition,
        objective: base.objective,
        loadAnchor: base.loadAnchor,
        tags: [customFamilyTag('cfam-abs')],
      }),
    ).toBe(false);
    if (base.composition.kind !== 'single') throw new Error('expected single');
    expect(
      hasExerciseDefinitionChanged(base, {
        kind: 'single',
        composition: { ...base.composition, startPosition: 'blocks' },
        objective: base.objective,
        loadAnchor: base.loadAnchor,
      }),
    ).toBe(true);
  });

  it('filters and counts custom family folders', () => {
    const folderId = 'cfam-abs';
    const tagged = stubDef({
      id: 'tagged',
      displayName: 'Ab Wheel',
      tags: [customFamilyTag(folderId)],
    });
    const plain = stubDef({ id: 'plain', displayName: 'Hang Snatch' });
    const defs = [tagged, plain];
    const key = customFamilyFilterKey(folderId);

    expect(
      filterExerciseDefinitions(defs, {
        search: '',
        family: key as ExerciseFamilyFilter,
        origin: 'all',
        discipline: 'all',
      }).map((def) => def.id),
    ).toEqual(['tagged']);

    const counts = familyCounts(defs);
    expect(counts[key]).toBe(1);
    expect(counts.snatch).toBe(2);
  });

  it('reads load scale from legacy motor catalog', () => {
    const def = stubDef({ id: 'pull-1', displayName: 'Snatch Pull', legacyExerciseId: 'ex-pull' });
    const motor: Exercise[] = [{ id: 'ex-pull', name: 'Snatch Pull', category: 'snatch', subtype: 'pull', startPosition: 'floor', complexity: 'single', goal: 'strength', intensityRange: [70, 90], loadScale: 1.05 }];
    expect(loadScaleForDefinition(motor, def)).toBe(1.05);
    expect(loadScaleForDefinition(motor, stubDef({ id: 'x', displayName: 'X' }))).toBeNull();
  });
});
