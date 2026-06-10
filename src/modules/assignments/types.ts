import type {
  CoachWlProgramTemplate,
  GeneratedProgram,
  ProgramAssignment,
  SessionCompletion,
  SetCompletionLog,
  WolfUser,
} from '../../models/training';

export interface WlAssignmentsContextValue {
  assignments: ProgramAssignment[];
  completions: SessionCompletion[];
  setLogs: SetCompletionLog[];
  coachTemplates: CoachWlProgramTemplate[];
  assignProgramToAthlete: (program: ProgramAssignment['program'], athleteProfileId: string) => string;
  updateAssignmentProgram: (assignmentId: string, program: ProgramAssignment['program']) => void;
  removeAssignment: (assignmentId: string) => void;
  restoreAssignmentVersion: (assignmentId: string, version: number) => boolean;
  duplicateAssignment: (assignmentId: string, targetAthleteProfileId: string) => string;
  saveCoachTemplate: (name: string, program: GeneratedProgram, sourceAssignmentId?: string) => string;
  deleteCoachTemplate: (templateId: string) => void;
  assignFromTemplate: (templateId: string, athleteProfileId: string) => string | null;
  toggleSessionComplete: (
    assignmentId: string,
    weekNumber: number,
    dayNumber: number,
    exerciseCount?: number,
  ) => void;
  isSessionComplete: (
    assignmentId: string,
    weekNumber: number,
    dayNumber: number,
    exerciseCount?: number,
  ) => boolean;
  toggleExerciseComplete: (
    assignmentId: string,
    weekNumber: number,
    dayNumber: number,
    exerciseIndex: number,
  ) => void;
  isExerciseComplete: (
    assignmentId: string,
    weekNumber: number,
    dayNumber: number,
    exerciseIndex: number,
  ) => boolean;
  toggleSetComplete: (input: SetLogInput) => void;
  updateSetLog: (input: SetLogInput) => void;
  isSetComplete: (
    assignmentId: string,
    weekNumber: number,
    dayNumber: number,
    exerciseIndex: number,
    schemeIndex: number,
    setInstance: number,
  ) => boolean;
  getSetLog: (
    assignmentId: string,
    weekNumber: number,
    dayNumber: number,
    exerciseIndex: number,
    schemeIndex: number,
    setInstance: number,
  ) => SetCompletionLog | undefined;
  myAssignment: ProgramAssignment | undefined;
  reloadAssignmentsFromApi: () => Promise<void>;
}

export type SetLogInput = {
  assignmentId: string;
  weekNumber: number;
  dayNumber: number;
  exerciseIndex: number;
  schemeIndex: number;
  setInstance: number;
  actualKg?: number;
  actualReps?: number;
  actualSegmentReps?: number[];
};

export interface WlAssignmentsProviderProps {
  children: React.ReactNode;
  currentUser: WolfUser | undefined;
  athleteUser: WolfUser | undefined;
  users: WolfUser[];
  /** JWT del API; al cambiar (login/logout) se recargan asignaciones desde el servidor. */
  apiToken: string | null;
}
