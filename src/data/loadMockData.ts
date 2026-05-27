import type { Athlete, Exercise, WolfUser } from '../models/training';
import { normalizeExercise } from '../utils/exerciseCatalog';
import rawAthletes from './athletes.json' with { type: 'json' };
import rawExercises from './exercises.json' with { type: 'json' };
import rawUsers from './users.json' with { type: 'json' };

export const mockAthletes: Athlete[] = rawAthletes as Athlete[];
export const mockExercises: Exercise[] = (rawExercises as Exercise[]).map((e) =>
  normalizeExercise({ ...e } as unknown as Record<string, unknown>),
);
export const mockUsers: WolfUser[] = rawUsers as WolfUser[];

/** Re-export: contrato MVP (mock + localStorage). */
export { MVP_CLIENT_USES_MOCK_DATA_ONLY } from '../config/mvp';
