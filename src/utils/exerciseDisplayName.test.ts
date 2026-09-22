import { describe, expect, it } from 'vitest';
import { cuesToBullets, sanitizeExerciseDisplayName } from './exerciseDisplayName';

describe('sanitizeExerciseDisplayName', () => {
  it('limpia prefijos basura del catálogo', () => {
    expect(sanitizeExerciseDisplayName('.- Dumbbell side bends')).toBe('Dumbbell side bends');
    expect(sanitizeExerciseDisplayName('A- Walk, skip, run progression')).toBe(
      'Walk, skip, run progression',
    );
  });
});

describe('cuesToBullets', () => {
  it('divide indicaciones largas en bullets', () => {
    const bullets = cuesToBullets('- De pie con las piernas separadas. - Flexiona el tronco.');
    expect(bullets.length).toBeGreaterThan(1);
  });
});
