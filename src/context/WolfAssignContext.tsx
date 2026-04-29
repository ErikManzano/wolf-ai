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
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '');
const API_ENABLED = Boolean(API_BASE);

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
  loginUser: (email: string, password: string) => Promise<WolfUser | null>;
}

const WolfAssignContext = createContext<WolfAssignContextValue | null>(null);

export const WolfAssignProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<WolfUser[]>(mockUsers);
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

  const loadUsersFromApi = useCallback(async () => {
    if (!API_ENABLED) return;
    try {
      const res = await fetch(`${API_BASE}/users`);
      if (!res.ok) return;
      const list = (await res.json()) as WolfUser[];
      if (!Array.isArray(list) || list.length === 0) return;
      setUsers(list);
    } catch {
      /* fallback to mock users */
    }
  }, []);

  const loadAssignmentsFromApi = useCallback(async () => {
    if (!API_ENABLED) return;
    try {
      const res = await fetch(`${API_BASE}/assignments`);
      if (!res.ok) return;
      const list = (await res.json()) as ProgramAssignment[];
      if (!Array.isArray(list)) return;
      setAssignments(list.map(normalizeAssignment));
    } catch {
      /* fallback to local state */
    }
  }, []);

  useEffect(() => {
    void loadUsersFromApi();
    void loadAssignmentsFromApi();
  }, [loadUsersFromApi, loadAssignmentsFromApi]);

  useEffect(() => {
    if (!API_ENABLED) return;
    let ws: WebSocket | null = null;
    const wsUrl = API_BASE.replace(/^http/i, 'ws') + '/ws';
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as { event?: string };
          if (msg.event === 'assignments:changed') {
            void loadAssignmentsFromApi();
          }
        } catch {
          /* ignore malformed messages */
        }
      };
      ws.onclose = () => {
        // fallback polling if websocket disconnects
        const timer = window.setInterval(() => void loadAssignmentsFromApi(), 5000);
        window.setTimeout(() => window.clearInterval(timer), 30000);
      };
    } catch {
      /* websocket unavailable, keep silent fallback */
    }
    return () => {
      if (ws && ws.readyState < 2) ws.close();
    };
  }, [loadAssignmentsFromApi]);

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
    const target = users.find((u) => u.role === role);
    if (target) {
      setCurrentUserId(target.id);
      try {
        localStorage.setItem(STORAGE_CURRENT_USER, target.id);
      } catch {
        /* ignore */
      }
    }
  }, [users]);

  const setCurrentUserIdSafe = useCallback((id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    setCurrentUserId(id);
    setPersonaState(target.role);
    try {
      localStorage.setItem(STORAGE_CURRENT_USER, id);
      localStorage.setItem(STORAGE_PERSONA, target.role);
    } catch {
      /* ignore */
    }
  }, [users]);

  const currentUser = useMemo(() => users.find((u) => u.id === currentUserId), [currentUserId, users]);
  const coach = useMemo(() => users.find((u) => u.role === 'coach'), [users]);
  const athleteUser = useMemo(
    () => (currentUser?.role === 'athlete' ? currentUser : undefined),
    [currentUser],
  );

  const assignProgramToAthlete = useCallback(
    (program: ProgramAssignment['program'], athleteProfileId: string) => {
      const id = `asg-${Date.now()}`;
      const uid =
        users.find((u) => u.role === 'athlete' && u.linkedAthleteId === athleteProfileId)?.id ??
        athleteUserIdForProfile(athleteProfileId);
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
      setAssignments((prev) => [...prev.filter((x) => x.athleteProfileId !== athleteProfileId), next]);
      if (API_ENABLED) {
        void fetch(`${API_BASE}/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coachId: next.coachId,
            athleteUserId: next.athleteUserId,
            athleteProfileId: next.athleteProfileId,
            program: next.program,
          }),
        })
          .then((r) => (r.ok ? (r.json() as Promise<ProgramAssignment>) : null))
          .then((saved) => {
            if (!saved) return;
            setAssignments((prev) => [
              ...prev.filter((x) => x.athleteProfileId !== saved.athleteProfileId),
              normalizeAssignment(saved),
            ]);
          })
          .catch(() => {
            /* keep optimistic state */
          });
      }
      return id;
    },
    [currentUser, users],
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
    if (API_ENABLED) {
      void fetch(`${API_BASE}/assignments/${assignmentId}/program`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program }),
      })
        .then((r) => (r.ok ? (r.json() as Promise<ProgramAssignment>) : null))
        .then((updated) => {
          if (!updated) return;
          setAssignments((prev) => prev.map((a) => (a.id === updated.id ? normalizeAssignment(updated) : a)));
        })
        .catch(() => {
          /* keep optimistic state */
        });
    }
  }, []);

  const removeAssignment = useCallback((assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    setCompletions((prev) => prev.filter((c) => c.assignmentId !== assignmentId));
    if (API_ENABLED) {
      void fetch(`${API_BASE}/assignments/${assignmentId}`, { method: 'DELETE' }).catch(() => {
        /* keep local state */
      });
    }
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

  const loginUser = useCallback(async (email: string, password: string) => {
    if (!API_ENABLED) {
      const local = users.find(
        (u) => u.email?.toLowerCase() === email.trim().toLowerCase() && password === 'wolf2026',
      );
      return local ?? null;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { user?: WolfUser };
      return data.user ?? null;
    } catch {
      return null;
    }
  }, [users]);

  const value: WolfAssignContextValue = {
    users,
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
    loginUser,
  };

  return <WolfAssignContext.Provider value={value}>{children}</WolfAssignContext.Provider>;
};

export function useWolfAssign(): WolfAssignContextValue {
  const ctx = useContext(WolfAssignContext);
  if (!ctx) throw new Error('useWolfAssign requires WolfAssignProvider');
  return ctx;
}
