import { describe, expect, it } from 'vitest';
import type { SessionPickerOption } from '../../services/exercise';
import { buildBrowseModalSections, buildDropdownSections, highlightTokens } from './exerciseAutocompleteUtils';
import { pickerMuscleGroupForOption } from './ExercisePickerFamilyFilters';

function stubOption(partial: Partial<SessionPickerOption> & Pick<SessionPickerOption, 'id' | 'name'>): SessionPickerOption {
  return {
    definitionId: partial.id,
    searchText: partial.name,
    category: 'snatch',
    lifecycleStatus: 'official',
    kind: 'single',
    family: 'snatch',
    familyLabel: 'Snatch',
    objective: 'technique',
    typeLabel: 'Técnica',
    intensityRef: 'Snatch',
    loadAnchor: 'snatch',
    isOfficial: true,
    ...partial,
  };
}

describe('highlightTokens', () => {
  it('resalta coincidencias del query', () => {
    const parts = highlightTokens('Squat Snatch Press', 'squat snatch');
    expect(parts.some((p) => p.match && p.text === 'Squat')).toBe(true);
    expect(parts.some((p) => p.match && p.text === 'Snatch')).toBe(true);
  });
});

describe('buildDropdownSections', () => {
  it('prioriza favoritos y recientes antes de todos', () => {
    const matched = [
      stubOption({ id: 'a', name: 'Alpha' }),
      stubOption({ id: 'b', name: 'Beta' }),
      stubOption({ id: 'c', name: 'Gamma' }),
    ];
    const result = buildDropdownSections({
      matched,
      favoriteIds: ['b'],
      recentIds: ['c'],
      query: '',
      isEs: true,
    });
    expect(result.sections[0]?.kind).toBe('favorites');
    expect(result.sections[0]?.items[0]?.id).toBe('b');
    expect(result.sections.some((s) => s.kind === 'recents' && s.items[0]?.id === 'c')).toBe(true);
    expect(result.sections.some((s) => s.key === 'group:snatch' && s.items.some((item) => item.id === 'a'))).toBe(true);
  });

  it('agrupa foam aparte de halterofilia cuando no hay búsqueda', () => {
    const result = buildDropdownSections({
      matched: [
        stubOption({ id: 'sn', name: 'Snatch' }),
        stubOption({
          id: 'fm',
          name: 'Thoracic',
          family: 'accessory',
          familyLabel: 'Accessory',
          tags: ['concentrado', 'foam'],
        }),
      ],
      favoriteIds: [],
      recentIds: [],
      query: '',
      isEs: true,
    });
    expect(result.sections.map((section) => section.key)).toEqual(['group:snatch', 'group:foam']);
  });

  it('ofrece crear cuando no hay match exacto', () => {
    const result = buildDropdownSections({
      matched: [],
      favoriteIds: [],
      recentIds: [],
      query: 'Snatch tempo',
      isEs: true,
    });
    expect(result.showCreate).toBe(true);
    expect(result.navigable.some((row) => row.kind === 'create')).toBe(true);
  });
});

describe('buildBrowseModalSections', () => {
  it('agrupa por músculo en foam sin query', () => {
    const sections = buildBrowseModalSections(
      [
        stubOption({
          id: 'a',
          name: 'Pecho A',
          family: 'accessory',
          tags: ['concentrado', 'foam', 'muscle:chest'],
        }),
        stubOption({
          id: 'b',
          name: 'Espalda B',
          family: 'accessory',
          tags: ['concentrado', 'foam', 'muscle:back'],
        }),
      ],
      '',
      {
        section: 'foam',
        familyFilter: 'all',
        muscleKey: pickerMuscleGroupForOption,
        variationLabel: () => 'Classic',
      },
    );
    expect(sections.map((s) => s.key)).toEqual(['group:chest', 'group:back']);
  });

  it('agrupa por variación en halterofilia con familia fija', () => {
    const sections = buildBrowseModalSections(
      [
        stubOption({ id: 'a', name: 'Power Snatch', family: 'snatch', variation: 'power' }),
        stubOption({ id: 'b', name: 'Snatch', family: 'snatch', variation: 'classic' }),
      ],
      '',
      {
        section: 'weightlifting',
        familyFilter: 'snatch',
        muscleKey: pickerMuscleGroupForOption,
        variationLabel: (code) => code,
      },
    );
    expect(sections.map((s) => s.key)).toEqual(['group:classic', 'group:power']);
  });
});
