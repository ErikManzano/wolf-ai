import type { SetScheme } from '../../models/training';

export type SetPurpose = 'technique' | 'work' | 'intensity';

export function purposeForScheme(scheme: SetScheme): SetPurpose {
  if (scheme.percentage < 75) return 'technique';
  if (scheme.percentage < 83) return 'work';
  return 'intensity';
}

export function purposeLabel(purpose: SetPurpose, isEs: boolean): string {
  if (purpose === 'technique') return isEs ? 'Técnica' : 'Technique';
  if (purpose === 'work') return isEs ? 'Trabajo' : 'Work';
  return isEs ? 'Intensidad' : 'Intensity';
}
