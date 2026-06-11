import type { Athlete, WolfUser } from '../../models/training';

export type CreateWlAthleteInput = Omit<Athlete, 'fatigueScore' | 'readinessScore'> &
  Partial<Pick<Athlete, 'fatigueScore' | 'readinessScore'>> & { coachId?: string };

export interface WlAthletesContextValue {
  athletes: Athlete[];
  athletesLoading: boolean;
  canManageWlAthletes: boolean;
  createAthlete: (input: CreateWlAthleteInput) => Promise<Athlete | null>;
  updateAthlete: (id: string, patch: Partial<Athlete>) => Promise<Athlete | null>;
  deleteAthlete: (id: string) => Promise<boolean>;
  reloadAthletesFromApi: () => Promise<void>;
  rosterForCoach: (coach: WolfUser | undefined) => Athlete[];
}

export interface WlAthletesProviderProps {
  children: React.ReactNode;
  currentUser: WolfUser | undefined;
  users: WolfUser[];
  apiToken: string | null;
}
