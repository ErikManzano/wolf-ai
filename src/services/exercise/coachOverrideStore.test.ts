import { describe, expect, it } from 'vitest';
import type { CoachExerciseOverride } from '../../models/exercise';
import { mergeCoachExerciseOverrides } from './coachOverrideStore';

describe('mergeCoachExerciseOverrides', () => {
  it('keeps local folder assignments when API returns a partial list', () => {
    const local: CoachExerciseOverride[] = [
      {
        id: 'ovr-user-coach-a',
        coachId: 'user-coach',
        baseDefinitionId: 'ex-a',
        override: { customFamilyId: 'cfam-abs' },
      },
      {
        id: 'ovr-user-coach-b',
        coachId: 'user-coach',
        baseDefinitionId: 'ex-b',
        override: { customFamilyId: 'cfam-abs' },
      },
    ];
    const fromApi: CoachExerciseOverride[] = [
      {
        id: 'ovr-user-coach-c',
        coachId: 'user-coach',
        baseDefinitionId: 'ex-c',
        override: { customFamilyId: 'cfam-core' },
      },
    ];

    const merged = mergeCoachExerciseOverrides(local, fromApi, 'user-coach');
    expect(merged).toHaveLength(3);
    expect(merged.find((item) => item.baseDefinitionId === 'ex-a')?.override.customFamilyId).toBe('cfam-abs');
    expect(merged.find((item) => item.baseDefinitionId === 'ex-c')?.override.customFamilyId).toBe('cfam-core');
  });
});
