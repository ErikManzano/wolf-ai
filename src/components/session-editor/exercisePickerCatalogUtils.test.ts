import { describe, expect, it } from 'vitest';
import type { SessionPickerOption } from '../../services/exercise';
import {
  buildPickerCatalogGrupoCounts,
  filterPickerOptionsBySection,
  pickerOptionInWeightliftingSection,
} from './exercisePickerCatalogUtils';

function stubOption(partial: Partial<SessionPickerOption> & Pick<SessionPickerOption, 'id' | 'name'>): SessionPickerOption {
  return {
    definitionId: partial.id,
    searchText: partial.name,
    category: 'accessory',
    lifecycleStatus: 'official',
    kind: 'single',
    family: 'accessory',
    familyLabel: 'Accessory',
    objective: 'strength',
    typeLabel: 'Strength',
    intensityRef: null,
    loadAnchor: 'auto',
    isOfficial: true,
    ...partial,
  };
}

describe('pickerOptionInWeightliftingSection', () => {
  it('incluye movimientos búlgaros con tag grupo aunque family sea accessory', () => {
    const gm = stubOption({
      id: 'ex-wl-g14-02',
      name: 'Good Morning, Legs Straight',
      tags: ['grupo_14', 'accessory', 'strength'],
      catalogGroup: 'grupo_14',
    });
    expect(pickerOptionInWeightliftingSection(gm)).toBe(true);
  });

  it('filtra halterofilia con grupos en el pool de sección', () => {
    const snatch = stubOption({ id: 'ex-001', name: 'Snatch', family: 'snatch', category: 'snatch' });
    const g11 = stubOption({
      id: 'ex-wl-g11-02',
      name: 'Good Morning with Knee Flexed',
      tags: ['grupo_11'],
      catalogGroup: 'grupo_11',
    });
    const foam = stubOption({
      id: 'foam-1',
      name: 'Foam roll',
      tags: ['foam'],
    });
    const wl = filterPickerOptionsBySection([snatch, g11, foam], 'weightlifting');
    expect(wl.map((o) => o.id)).toEqual(['ex-001', 'ex-wl-g11-02']);
    const counts = buildPickerCatalogGrupoCounts(wl);
    expect(counts.grupo_11).toBe(1);
  });
});
