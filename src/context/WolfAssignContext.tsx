import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ProgramAssignment, SessionCompletion, WolfAppRole, WolfUser } from '../models/training';
import { mockAthletes, mockExercises, mockUsers } from '../data/loadMockData';
import { generatePeriodizedProgram } from '../services/programGenerator';
import { hashPassword, matchesStoredPassword } from '../utils/passwordCrypto';

/** Usuario app enlazado a este perfil motor (p. ej. Erik ↔ ath-you). */
function athleteUserIdForProfile(athleteProfileId: string): string | undefined {
  return mockUsers.find((u) => u.role === 'athlete' && u.linkedAthleteId === athleteProfileId)?.id;
}

const STORAGE_ASSIGN = 'wolf_wl_assignments_v1';
const STORAGE_COMP = 'wolf_wl_completions_v1';
const STORAGE_PERSONA = 'wolf_persona_v1';
const STORAGE_CURRENT_USER = 'wolf_current_user_v1';
const STORAGE_API_TOKEN = 'wolf_api_token_v1';

/** URL del API: build `VITE_API_URL`, o `window.__WOLF_API_URL__` en index.html (sin redeploy). */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const injected = (window as Window & { __WOLF_API_URL__?: string }).__WOLF_API_URL__;
    if (typeof injected === 'string' && injected.trim()) {
      return injected.trim().replace(/\/+$/, '');
    }
  }
  return ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '');
}

export function isApiEnabled(): boolean {
  return Boolean(getApiBase());
}

function websocketUrlFromApiBase(base: string): string | null {
  if (!base) return null;
  if (base.startsWith('https://')) return `wss://${base.slice('https://'.length)}/ws`;
  if (base.startsWith('http://')) return `ws://${base.slice('http://'.length)}/ws`;
  return null;
}

function readApiToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_API_TOKEN);
  } catch {
    return null;
  }
}

function personaFromUserRole(role: WolfAppRole): 'coach' | 'athlete' {
  return role === 'athlete' ? 'athlete' : 'coach';
}

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
  persona: 'coach' | 'athlete';
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
  registerUser: (payload: { name: string; email: string; password: string; role: WolfAppRole }) => Promise<string | null>;
  changePassword: (payload: { email: string; currentPassword: string; newPassword: string }) => Promise<string | null>;
  createUser: (payload: {
    name: string;
    email: string;
    role: WolfAppRole;
    password: string;
    coachId?: string;
    linkedAthleteId?: string;
  }) => Promise<string | null>;
  updateUser: (userId: string, payload: Partial<Pick<WolfUser, 'name' | 'email' | 'role' | 'coachId' | 'linkedAthleteId'>>) => Promise<string | null>;
  deleteUser: (userId: string) => Promise<string | null>;
  /** Limpia token del API (p. ej. al cerrar sesión). */
  clearApiSession: () => void;
}

const WolfAssignContext = createContext<WolfAssignContextValue | null>(null);

export const WolfAssignProvider = ({ children }: { children: ReactNode }) => {
  const [apiToken, setApiToken] = useState<string | null>(() => (typeof window !== 'undefined' ? readApiToken() : null));
  const [users, setUsers] = useState<WolfUser[]>(mockUsers);
  const [assignments, setAssignments] = useState<ProgramAssignment[]>([]);
  const [completions, setCompletions] = useState<SessionCompletion[]>([]);
  const [currentUserId, setCurrentUserId] = useState('user-coach');
  const [persona, setPersonaState] = useState<'coach' | 'athlete'>('coach');

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

  const clearApiSession = useCallback(() => {
    setApiToken(null);
    try {
      localStorage.removeItem(STORAGE_API_TOKEN);
    } catch {
      /* ignore */
    }
  }, []);

  const loadUsersFromApi = useCallback(
    async (authorizationOverride?: string | null) => {
      if (!isApiEnabled()) return;
      const bearer = authorizationOverride !== undefined ? authorizationOverride : apiToken;
      try {
        const headers: Record<string, string> = {};
        if (bearer) headers.Authorization = `Bearer ${bearer}`;
        const res = await fetch(`${getApiBase()}/users`, { headers });
        if (!res.ok) return;
        const list = (await res.json()) as WolfUser[];
        if (!Array.isArray(list) || list.length === 0) return;
        setUsers(list);
      } catch {
        /* fallback to mock users */
      }
    },
    [apiToken],
  );

  const loadAssignmentsFromApi = useCallback(async () => {
    if (!isApiEnabled()) return;
    try {
      const res = await fetch(`${getApiBase()}/assignments`);
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
    if (!isApiEnabled()) return;
    let ws: WebSocket | null = null;
    const wsUrl = websocketUrlFromApiBase(getApiBase());
    if (!wsUrl) return;
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
    const mapped = personaFromUserRole(role);
    setPersonaState(mapped);
    try {
      localStorage.setItem(STORAGE_PERSONA, mapped);
    } catch {
      /* ignore */
    }
    const target = users.find((u) => personaFromUserRole(u.role) === mapped);
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
    const mapped = personaFromUserRole(target.role);
    setPersonaState(mapped);
    try {
      localStorage.setItem(STORAGE_CURRENT_USER, id);
      localStorage.setItem(STORAGE_PERSONA, mapped);
    } catch {
      /* ignore */
    }
  }, [users]);

  /** Sincroniza sesión cuando el usuario viene del API (p. ej. GET /auth/me) antes de que `users` esté hidratado. */
  const applyUserSession = useCallback((u: Pick<WolfUser, 'id' | 'role'>) => {
    setCurrentUserId(u.id);
    const mapped = personaFromUserRole(u.role);
    setPersonaState(mapped);
    try {
      localStorage.setItem(STORAGE_CURRENT_USER, u.id);
      localStorage.setItem(STORAGE_PERSONA, mapped);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isApiEnabled() || !apiToken) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${getApiBase()}/auth/me`, {
          headers: { Authorization: `Bearer ${apiToken}` },
        });
        if (cancelled) return;
        if (res.status === 401) {
          clearApiSession();
          try {
            localStorage.removeItem('wolf_auth_v1');
          } catch {
            /* ignore */
          }
          window.dispatchEvent(new CustomEvent('wolf:session-expired'));
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { user?: WolfUser };
        if (!data.user) return;
        await loadUsersFromApi();
        if (cancelled) return;
        applyUserSession(data.user);
      } catch {
        /* red: mantener sesión local */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiToken, applyUserSession, clearApiSession, loadUsersFromApi]);

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
        coachId: currentUser?.role === 'coach' || currentUser?.role === 'super_admin' ? currentUser.id : 'user-coach',
        ...(uid !== undefined ? { athleteUserId: uid } : {}),
        athleteProfileId,
        version: 1,
        program: { ...program, athleteId: athleteProfileId },
        versionHistory: [],
        assignedAt: new Date().toISOString(),
      };
      setAssignments((prev) => [...prev.filter((x) => x.athleteProfileId !== athleteProfileId), next]);
      if (isApiEnabled()) {
        void fetch(`${getApiBase()}/assignments`, {
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
    if (isApiEnabled()) {
      void fetch(`${getApiBase()}/assignments/${assignmentId}/program`, {
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
    if (isApiEnabled()) {
      void fetch(`${getApiBase()}/assignments/${assignmentId}`, { method: 'DELETE' }).catch(() => {
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
    if (!isApiEnabled()) {
      const local = users.find(
        (u) => u.email?.toLowerCase() === email.trim().toLowerCase() && matchesStoredPassword(u, password),
      );
      return local ?? null;
    }
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 401) {
        return null;
      }
      if (!res.ok) {
        let detail = '';
        try {
          const j = (await res.json()) as { error?: string };
          detail = j.error ? ` ${j.error}` : '';
        } catch {
          /* ignore */
        }
        throw new Error(
          `El servidor respondió ${res.status}.${detail} Revisa CORS (FRONTEND_ORIGIN en el API) y que la URL sea correcta.`,
        );
      }
      const data = (await res.json()) as { user?: WolfUser; token?: string };
      if (data.token) {
        setApiToken(data.token);
        try {
          localStorage.setItem(STORAGE_API_TOKEN, data.token);
        } catch {
          /* ignore */
        }
      }
      return data.user ?? null;
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('El servidor respondió')) {
        throw e;
      }
      throw new Error(
        'No hay conexión con el API. En Netlify/Vercel: variable de entorno VITE_API_URL = https://tu-api.onrender.com (sin / final) y redeploy del front. O define window.__WOLF_API_URL__ en index.html.',
      );
    }
  }, [users]);

  const registerUser = useCallback(async (payload: { name: string; email: string; password: string; role: WolfAppRole }) => {
    const email = payload.email.trim().toLowerCase();
    if (!payload.name.trim() || !email || payload.password.trim().length < 6) {
      return 'Invalid registration payload.';
    }
    if (!isApiEnabled()) {
      if (users.some((u) => u.email?.toLowerCase() === email)) return 'Email already registered.';
      const next: WolfUser = {
        id: `user-${Date.now()}`,
        name: payload.name.trim(),
        email,
        role: payload.role === 'super_admin' ? 'athlete' : payload.role,
        passwordHash: hashPassword(payload.password.trim()),
      };
      setUsers((prev) => [...prev, next]);
      return null;
    }
    try {
      const res = await fetch(`${getApiBase()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        return err?.error ?? 'Could not register user.';
      }
      const data = (await res.json()) as { user?: WolfUser; token?: string };
      if (data.token) {
        setApiToken(data.token);
        try {
          localStorage.setItem(STORAGE_API_TOKEN, data.token);
        } catch {
          /* ignore */
        }
        await loadUsersFromApi(data.token);
      } else {
        await loadUsersFromApi();
      }
      return null;
    } catch {
      return 'Could not connect to backend.';
    }
  }, [loadUsersFromApi, users]);

  const changePassword = useCallback(async (payload: { email: string; currentPassword: string; newPassword: string }) => {
    const email = payload.email.trim().toLowerCase();
    if (!email || payload.newPassword.trim().length < 6) return 'Invalid password update request.';
    if (!isApiEnabled()) {
      const idx = users.findIndex((u) => u.email?.toLowerCase() === email && matchesStoredPassword(u, payload.currentPassword));
      if (idx < 0) return 'Current credentials are invalid.';
      setUsers((prev) =>
        prev.map((u, i) => {
          if (i !== idx) return u;
          const { password, passwordHash, ...rest } = u;
          void password;
          void passwordHash;
          return { ...rest, passwordHash: hashPassword(payload.newPassword.trim()) };
        }),
      );
      return null;
    }
    try {
      const res = await fetch(`${getApiBase()}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        return err?.error ?? 'Could not change password.';
      }
      return null;
    } catch {
      return 'Could not connect to backend.';
    }
  }, [users]);

  const createUser = useCallback(async (payload: {
    name: string;
    email: string;
    role: WolfAppRole;
    password: string;
    coachId?: string;
    linkedAthleteId?: string;
  }) => {
    if (!isApiEnabled()) {
      if (users.some((u) => u.email?.toLowerCase() === payload.email.trim().toLowerCase())) return 'Email already exists.';
      setUsers((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          name: payload.name.trim(),
          email: payload.email.trim().toLowerCase(),
          role: payload.role,
          passwordHash: hashPassword(payload.password),
          coachId: payload.coachId,
          linkedAthleteId: payload.linkedAthleteId,
        },
      ]);
      return null;
    }
    try {
      const res = await fetch(`${getApiBase()}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        return err?.error ?? 'Could not create user.';
      }
      await loadUsersFromApi();
      return null;
    } catch {
      return 'Could not connect to backend.';
    }
  }, [apiToken, loadUsersFromApi, users]);

  const updateUser = useCallback(async (userId: string, payload: Partial<Pick<WolfUser, 'name' | 'email' | 'role' | 'coachId' | 'linkedAthleteId'>>) => {
    if (!isApiEnabled()) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...payload } : u)));
      return null;
    }
    try {
      const res = await fetch(`${getApiBase()}/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        return err?.error ?? 'Could not update user.';
      }
      await loadUsersFromApi();
      return null;
    } catch {
      return 'Could not connect to backend.';
    }
  }, [apiToken, loadUsersFromApi]);

  const deleteUser = useCallback(async (userId: string) => {
    if (!isApiEnabled()) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (currentUserId === userId) {
        setCurrentUserIdSafe(mockUsers.some((u) => u.id === 'user-owner') ? 'user-owner' : 'user-coach');
      }
      return null;
    }
    try {
      const res = await fetch(`${getApiBase()}/users/${userId}`, {
        method: 'DELETE',
        headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : {},
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        return err?.error ?? 'Could not delete user.';
      }
      await loadUsersFromApi();
      if (currentUserId === userId) {
        setCurrentUserIdSafe(mockUsers.some((u) => u.id === 'user-owner') ? 'user-owner' : 'user-coach');
      }
      return null;
    } catch {
      return 'Could not connect to backend.';
    }
  }, [apiToken, currentUserId, loadUsersFromApi, setCurrentUserIdSafe]);

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
    registerUser,
    changePassword,
    createUser,
    updateUser,
    deleteUser,
    clearApiSession,
  };

  return <WolfAssignContext.Provider value={value}>{children}</WolfAssignContext.Provider>;
};

export function useWolfAssign(): WolfAssignContextValue {
  const ctx = useContext(WolfAssignContext);
  if (!ctx) throw new Error('useWolfAssign requires WolfAssignProvider');
  return ctx;
}
