import type { ExerciseComposition, ExerciseTaxonomyBundle } from '../../models/exercise';
import { isComplexComposition, isSingleComposition } from '../../models/exercise';

export function validateComposition(
  composition: ExerciseComposition,
  _bundle: ExerciseTaxonomyBundle,
): string[] {
  const warnings: string[] = [];
  if (isSingleComposition(composition)) {
    if (composition.family === 'jerk' && composition.variation === 'hang') {
      warnings.push('Hang jerk is uncommon; verify variation.');
    }
    if (composition.modifiers.includes('overhead_squat') && composition.family !== 'snatch' && composition.family !== 'accessory') {
      warnings.push('Overhead squat modifier is usually paired with snatch family.');
    }
  }
  if (isComplexComposition(composition)) {
    if (composition.segments.length < 2) {
      warnings.push('Complex requires at least 2 segments.');
    }
    if (composition.segments.length > 4) {
      warnings.push('Complex has more than 4 segments (motor WL limit).');
    }
  }
  return warnings;
}
