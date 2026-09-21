import { describe, expect, it } from 'vitest';
import type { SessionPickerOption } from '../../services/exercise';
import { buildDropdownSections, highlightTokens } from './exerciseAutocompleteUtils';

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
