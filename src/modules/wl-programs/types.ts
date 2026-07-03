import type { CoachProgram, CoachProgramRow, CoachProgramStatus } from '../../models/coach-architecture';
import type { GeneratedProgram, Session, WolfUser } from '../../models/training';
import type { ProgramEditContext } from '../../models/notifications';

export type WlProgramsView = 'hub' | 'editor';

export interface WlProgramsContextValue {
  coachPrograms: CoachProgramRow[];
  programsLoading: boolean;
  programsView: WlProgramsView;
  editingProgramId: string | null;
  setProgramsView: (view: WlProgramsView) => void;
  openProgramEditor: (programId: string | null) => void;
  closeProgramEditor: () => void;
  reloadProgramsFromApi: () => Promise<void>;
  createProgram: (name: string, program?: GeneratedProgram) => Promise<CoachProgram | null>;
  updateProgram: (
    id: string,
    patch: {
      name?: string;
      program?: GeneratedProgram;
      status?: CoachProgramStatus;
      editContext?: ProgramEditContext;
    },
  ) => Promise<CoachProgram | null>;
  updateProgramSession: (
    id: string,
    weekNumber: number,
    dayNumber: number,
    session: Session,
    editContext?: ProgramEditContext,
  ) => Promise<CoachProgram | null>;
  deleteProgram: (id: string) => Promise<boolean>;
  duplicateProgram: (id: string) => Promise<CoachProgram | null>;
  assignProgramToAthletes: (programId: string, athleteProfileIds: string[]) => Promise<string[]>;
  getProgramById: (id: string) => CoachProgramRow | undefined;
}

export interface WlProgramsProviderProps {
  children: React.ReactNode;
  currentUser: WolfUser | undefined;
  apiToken: string | null;
  assignProgramToAthlete?: (
    program: GeneratedProgram,
    athleteProfileId: string,
    coachProgramId?: string,
  ) => Promise<string>;
  reloadAssignmentsFromApi?: () => Promise<void>;
}
