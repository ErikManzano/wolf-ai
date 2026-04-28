import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ProgramAssignment, SessionCompletion, WolfAppRole, WolfUser } from '../models/training';
import { mockAthletes, mockExercises, mockUsers } from '../data/loadMockData';

/** Usuario app enlazado a este perfil motor (p. ej. Erik ↔ ath-you). */
function athleteUserIdForProfile(athleteProfileId: string): string | undefined {
  return mockUsers.find((u) => u.role === 'athlete' && u.linkedAthleteId === athleteProfileId)?.id;
}
import { generatePeriodizedProgram } from '../services/programGenerator';

const STORAGE_ASSIGN = 'wolf_wl_assignments_v1';
const STORAGE_COMP = 'wolf_wl_completions_v1';
const STORAGE_PERSONA = 'wolf_persona_v1';
const STORAGE_CURRENT_USER = 'wolf_current_user_v1';

function normalizeAssignment(a: ProgramAssignment): ProgramAssignment {
  return {
    ...a,
    version: typeof a.version === 'number' && a.version > 0 ? a.version : 1,
    versionHistory: Array.isArray(a.versionHistory) ? a.versionHistory : [],
  };
}

function seedDemoAssignments(): ProgramAssignment[] {
  const athlete = mockAthletes.find((a) => a.id === 'ath-you');
  if (!athlete) return [];
  const program = generatePeriodizedProgram({
    athleteId: athlete.id,
    athlete,
    exercises: mockExercises,
    totalWeeks: 4,
    daysPerWeek: 3,
    primaryGoal: 'strength',
    programName: 'Plan ejemplo — Ivan → Erik',
  });
  return [
    {
      id: 'asg-seed-demo',
      coachId: 'user-coach',
      athleteUserId: 'user-athlete',
      athleteProfileId: 'ath-you',
      version: 1,
      program,
      versionHistory: [],
      assignedAt: new Date().toISOString(),
    },
  ];
}

interface WolfAssignContextValue {
  users: WolfUser[];
  currentUser: WolfUser | undefined;
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  persona: WolfAppRole;
  setPersona: (role: WolfAppRole) => void;
  coach: WolfUser | undefined;
  athleteUser: WolfUser | undefined;
  assignments: ProgramAssignment[];
  completions: SessionCompletion[];
  assignProgramToAthlete: (program: ProgramAssignment['program'], athleteProfileId: string) => string;
  /** Actualiza el JSON del programa en una asignación (coach editando plan ya enviado). */
  updateAssignmentProgram: (assignmentId: string, program: ProgramAssignment['program']) => void;
  removeAssignment: (assignmentId: string) => void;
  toggleSessionComplete: (assignmentId: string, weekNumber: number, dayNumber: number) => void;
  isSessionComplete: (assignmentId: string, weekNumber: number, dayNumber: number) => boolean;
  /** Asignación activa del atleta vinculado (user-athlete) */
  myAssignment: ProgramAssignment | undefined;
}

const WolfAssignContext = createContext<WolfAssignContextValue | null>(null);

export const WolfAssignProvider = ({ children }: { children: ReactNode }) => {
  const [assignments, setAssignments] = useState<ProgramAssignment[]>([]);
  const [completions, setCompletions] = useState<SessionCompletion[]>([]);
  const [currentUserId, setCurrentUserId] = useState('user-coach');
  const [persona, setPersonaState] = useState<WolfAppRole>('coach');

  useEffect(() => {
    try {
      const a = localStorage.getItem(STORAGE_ASSIGN);
      const c = localStorage.getItem(STORAGE_COMP);
      const p = localStorage.getItem(STORAGE_PERSONA) as WolfAppRole | null;
      const storedUser = localStorage.getItem(STORAGE_CURRENT_USER);
      if (a) {
        const parsed = JSON.parse(a) as ProgramAssignment[];
        setAssignments(parsed.map(normalizeAssignment));
      } else {
        const seed = seedDemoAssignments();
        setAssignments(seed);
        localStorage.setItem(STORAGE_ASSIGN, JSON.stringify(seed));
      }
      if (c) setCompletions(JSON.parse(c));
      if (storedUser && mockUsers.some((u) => u.id === storedUser)) {
        setCurrentUserId(storedUser);
      }
      if (p === 'coach' || p === 'athlete') setPersonaState(p);
    } catch {
      const seed = seedDemoAssignments();
      setAssignments(seed);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ASSIGN, JSON.stringify(assignments));
    } catch {
      /* ignore */
    }
  }, [assignments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COMP, JSON.stringify(completions));
    } catch {
      /* ignore */
    }
  }, [completions]);

  const setPersona = useCallback((role: WolfAppRole) => {
    setPersonaState(role);
    try {
      localStorage.setItem(STORAGE_PERSONA, role);
    } catch {
      /* ignore */
    }
    const target = mockUsers.find((u) => u.role === role);
    if (target) {
      setCurrentUserId(target.id);
      try {
        localStorage.setItem(STORAGE_CURRENT_USER, target.id);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const setCurrentUserIdSafe = useCallback((id: string) => {
    const target = mockUsers.find((u) => u.id === id);
    if (!target) return;
    setCurrentUserId(id);
    setPersonaState(target.role);
    try {
      localStorage.setItem(STORAGE_CURRENT_USER, id);
      localStorage.setItem(STORAGE_PERSONA, target.role);
    } catch {
      /* ignore */
    }
  }, []);

  const currentUser = useMemo(() => mockUsers.find((u) => u.id === currentUserId), [currentUserId]);
  const coach = useMemo(() => mockUsers.find((u) => u.role === 'coach'), []);
  const athleteUser = useMemo(
    () => (currentUser?.role === 'athlete' ? currentUser : undefined),
    [currentUser],
  );

  const assignProgramToAthlete = useCallback(
    (program: ProgramAssignment['program'], athleteProfileId: string) => {
      const id = `asg-${Date.now()}`;
      const uid = athleteUserIdForProfile(athleteProfileId);
      const next: ProgramAssignment = {
        id,
        coachId: currentUser?.role === 'coach' ? currentUser.id : 'user-coach',
        ...(uid !== undefined ? { athleteUserId: uid } : {}),
        athleteProfileId,
        version: 1,
        program: { ...program, athleteId: athleteProfileId },
        versionHistory: [],
        assignedAt: new Date().toISOString(),
      };
      // Un plan activo por perfil en plantilla; no borra asignaciones de otros atletas.
      setAssignments((prev) => [...prev.filter((x) => x.athleteProfileId !== athleteProfileId), next]);
      return id;
    },
    [currentUser],
  );

  const updateAssignmentProgram = useCallback((assignmentId: string, program: ProgramAssignment['program']) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId
          ? {
              ...a,
              version: (a.version ?? 1) + 1,
              program: { ...program, athleteId: a.athleteProfileId },
              versionHistory: [
                ...(a.versionHistory ?? []),
                {
                  version: a.version ?? 1,
                  editedAt: new Date().toISOString(),
                  program: a.program,
                },
              ],
            }
          : a,
      ),
    );
  }, []);

  const removeAssignment = useCallback((assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    setCompletions((prev) => prev.filter((c) => c.assignmentId !== assignmentId));
  }, []);

  const toggleSessionComplete = useCallback((assignmentId: string, weekNumber: number, dayNumber: number) => {
    setCompletions((prev) => {
      const exists = prev.some(
        (x) => x.assignmentId === assignmentId && x.weekNumber === weekNumber && x.dayNumber === dayNumber,
      );
      if (exists) {
        return prev.filter(
          (x) => !(x.assignmentId === assignmentId && x.weekNumber === weekNumber && x.dayNumber === dayNumber),
        );
      }
      return [
        ...prev,
        {
          assignmentId,
          weekNumber,
          dayNumber,
          completedAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const isSessionComplete = useCallback(
    (assignmentId: string, weekNumber: number, dayNumber: number) =>
      completions.some(
        (x) => x.assignmentId === assignmentId && x.weekNumber === weekNumber && x.dayNumber === dayNumber,
      ),
    [completions],
  );

  const myAssignment = useMemo(() => {
    const linked = athleteUser?.linkedAthleteId;
    if (!linked) return undefined;
    const mine = assignments.filter((a) => a.athleteProfileId === linked);
    if (mine.length === 0) return undefined;
    return [...mine].sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0];
  }, [assignments, athleteUser?.linkedAthleteId]);

  const value: WolfAssignContextValue = {
    users: mockUsers,
    currentUser,
    currentUserId,
    setCurrentUserId: setCurrentUserIdSafe,
    persona,
    setPersona,
    coach,
    athleteUser,
    assignments,
    completions,
    assignProgramToAthlete,
    updateAssignmentProgram,
    removeAssignment,
    toggleSessionComplete,
    isSessionComplete,
    myAssignment,
  };

  return <WolfAssignContext.Provider value={value}>{children}</WolfAssignContext.Provider>;
};

export function useWolfAssign(): WolfAssignContextValue {
  const ctx = useContext(WolfAssignContext);
  if (!ctx) throw new Error('useWolfAssign requires WolfAssignProvider');
  return ctx;
}
