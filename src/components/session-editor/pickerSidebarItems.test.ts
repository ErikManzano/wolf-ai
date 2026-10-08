import { describe, expect, it } from 'vitest';
import { pickerCatalogFilterSummary } from './pickerSidebarItems';

describe('pickerCatalogFilterSummary', () => {
  it('concatena sección y grupo activos', () => {
    const summary = pickerCatalogFilterSummary(true, {
      section: 'weightlifting',
      catalogGrupo: 'grupo_3',
      muscle: 'all',
      variation: 'all',
    });
    expect(summary).toContain('Halterofilia');
    expect(summary).toContain('G3');
  });

  it('devuelve vacío si no hay filtros', () => {
    expect(
      pickerCatalogFilterSummary(false, {
        section: 'all',
        catalogGrupo: 'all',
        muscle: 'all',
        variation: 'all',
      }),
    ).toBe('');
  });
});
