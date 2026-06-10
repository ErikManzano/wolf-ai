import type { CoachWlProgramTemplate, GeneratedProgram, WolfUser } from '../../models/training';

export interface WlTemplatesContextValue {
  coachTemplates: CoachWlProgramTemplate[];
  templatesLoading: boolean;
  saveCoachTemplate: (name: string, program: GeneratedProgram, sourceAssignmentId?: string) => Promise<string>;
  deleteCoachTemplate: (templateId: string) => Promise<boolean>;
  assignFromTemplate: (templateId: string, athleteProfileId: string) => Promise<string | null>;
  reloadTemplatesFromApi: () => Promise<void>;
}

export interface WlTemplatesProviderProps {
  children: React.ReactNode;
  currentUser: WolfUser | undefined;
  apiToken: string | null;
  assignProgramToAthlete: (
    program: GeneratedProgram,
    athleteProfileId: string,
  ) => Promise<string>;
}
