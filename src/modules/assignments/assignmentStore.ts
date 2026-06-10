import { mockAthletes, mockExercises } from '../../data/loadMockData';
import type {
  CoachWlProgramTemplate,
  ProgramAssignment,
  SessionCompletion,
  SetCompletionLog,
} from '../../models/training';
import { generatePeriodizedProgram } from '../../services/programGenerator';
import { mockUsers } from '../../data/loadMockData';
import {
  STORAGE_ASSIGN,
  STORAGE_COMP,
  STORAGE_SET_LOGS,
  STORAGE_TEMPLATES,
} from './constants';

export function normalizeAssignment(a: ProgramAssignment): ProgramAssignment {
  return {
    ...a,
    version: typeof a.version === 'number' && a.version > 0 ? a.version : 1,
    versionHistory: Array.isArray(a.versionHistory) ? a.versionHistory : [],
  };
}

export function athleteUserIdForProfile(athleteProfileId: string): string | undefined {
  return mockUsers.find((u) => u.role === 'athlete' && u.linkedAthleteId === athleteProfileId)?.id;
}

export function seedDemoAssignments(): ProgramAssignment[] {
  const athlete = mockAthletes.find((a) => a.id === 'ath-erik');
  if (!athlete) return [];
  const program = generatePeriodizedProgram({
    athleteId: athlete.id,
    athlete,
    exercises: mockExercises,
    totalWeeks: 4,
    daysPerWeek: 3,
    primaryGoal: 'strength',
    programName: 'Plan ejemplo — Coach → Erik Manzano',
  });
  return [
    {
      id: 'asg-seed-demo',
      coachId: 'user-coach-wl',
      athleteUserId: 'user-erik',
      athleteProfileId: 'ath-erik',
      version: 1,
      program,
      versionHistory: [],
      assignedAt: new Date().toISOString(),
    },
  ];
}

export function loadAssignmentsFromLocal(): ProgramAssignment[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_ASSIGN);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProgramAssignment[];
    return Array.isArray(parsed) ? parsed.map(normalizeAssignment) : null;
  } catch {
    return null;
  }
}

export function loadCompletionsFromLocal(): SessionCompletion[] {
  try {
    const raw = localStorage.getItem(STORAGE_COMP);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionCompletion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadSetLogsFromLocal(): SetCompletionLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_SET_LOGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SetCompletionLog[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadTemplatesFromLocal(): CoachWlProgramTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_TEMPLATES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CoachWlProgramTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistAssignmentsLocal(assignments: ProgramAssignment[]): void {
  try {
    localStorage.setItem(STORAGE_ASSIGN, JSON.stringify(assignments));
  } catch {
    /* ignore */
  }
}

export function persistCompletionsLocal(completions: SessionCompletion[]): void {
  try {
    localStorage.setItem(STORAGE_COMP, JSON.stringify(completions));
  } catch {
    /* ignore */
  }
}

export function persistSetLogsLocal(setLogs: SetCompletionLog[]): void {
  try {
    localStorage.setItem(STORAGE_SET_LOGS, JSON.stringify(setLogs));
  } catch {
    /* ignore */
  }
}

export function persistTemplatesLocal(templates: CoachWlProgramTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_TEMPLATES, JSON.stringify(templates));
  } catch {
    /* ignore */
  }
}

export function initialAssignmentsState(): ProgramAssignment[] {
  const stored = loadAssignmentsFromLocal();
  if (stored?.length) return stored;
  const seed = seedDemoAssignments();
  persistAssignmentsLocal(seed);
  return seed;
}
