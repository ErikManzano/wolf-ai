import { describe, expect, it } from 'vitest';
import { epleyE1rm, nrmFromE1rm, percentOfE1rm, roundKg } from './e1rm';

describe('epley e1RM', () => {
  it('keeps a 1-rep as the 1RM', () => {
    expect(epleyE1rm(75, 1)).toBe(75);
  });

  it('estimates 70×3 as 77', () => {
    expect(epleyE1rm(70, 3)).toBe(77);
  });

  it('builds nRM and % tables from the best e1RM', () => {
    const e1 = epleyE1rm(75, 1);
    expect(roundKg(nrmFromE1rm(e1, 1))).toBe(75);
    expect(roundKg(nrmFromE1rm(e1, 5))).toBe(64.5);
    expect(roundKg(percentOfE1rm(e1, 80))).toBe(60);
  });
});
