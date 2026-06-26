import type {
  ProgramAssignment,
  SessionCompletion,
  SetCompletionLog,
  WolfUser,
} from '../../models/training';
import type { PlanChangeNotification, ProgramEditContext } from '../../models/notifications';

export interface WlAssignmentsContextValue {
  assignments: ProgramAssignment[];
  completions: SessionCompletion[];
  setLogs: SetCompletionLog[];
  assignProgramToAthlete: (
    program: ProgramAssignment['program'],
    athleteProfileId: string,
  ) => Promise<string>;
  updateAssignmentProgram: (
    assignmentId: string,
    program: ProgramAssignment['program'],
    editContext?: ProgramEditContext,
  ) => void;
  removeAssignment: (assignmentId: string) => Promise<boolean>;
  restoreAssignmentVersion: (assignmentId: string, version: number) => boolean;
  duplicateAssignment: (assignmentId: string, targetAthleteProfileId: string) => Promise<string>;
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
  myAssignments: ProgramAssignment[];
  assignmentsLoading: boolean;
  isTrackingPending: (key: string) => boolean;
  isTrackingFailed: (key: string) => boolean;
  setLogTrackingKey: (input: SetLogInput) => string;
  exerciseTrackingKey: (assignmentId: string, weekNumber: number, dayNumber: number, exerciseIndex: number) => string;
  sessionTrackingKey: (assignmentId: string, weekNumber: number, dayNumber: number) => string;
  reloadAssignmentsFromApi: () => Promise<void>;
  planChangeNotifications: PlanChangeNotification[];
  unreadPlanChangeCount: number;
  loadPlanChangeNotifications: () => Promise<void>;
  markPlanChangeNotificationRead: (id: string) => Promise<void>;
  markAllPlanChangeNotificationsRead: () => Promise<void>;
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
  actualRpe?: number;
};

export interface WlAssignmentsProviderProps {
  children: React.ReactNode;
  currentUser: WolfUser | undefined;
  athleteUser: WolfUser | undefined;
  users: WolfUser[];
  /** JWT del API; al cambiar (login/logout) se recargan asignaciones desde el servidor. */
  apiToken: string | null;
}
