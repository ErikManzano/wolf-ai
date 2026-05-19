import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  CoachWlProgramTemplate,
  GeneratedProgram,
  ProgramAssignment,
  SessionCompletion,
  WolfAppRole,
  WolfUser,
} from '../models/training';
import { mockAthletes, mockExercises, mockUsers } from '../data/loadMockData';
import { generatePeriodizedProgram } from '../services/programGenerator';
import { hashPassword, matchesStoredPassword } from '../utils/passwordCrypto';
import {
  completionMatches,
  isDayComplete,
  isExerciseComplete,
  isSessionMarkedComplete,
} from '../utils/completionHelpers';

/** Usuario app enlazado a este perfil motor (p. ej. Erik ↔ ath-you). */
function athleteUserIdForProfile(athleteProfileId: string): string | undefined {
  return mockUsers.find((u) => u.role === 'athlete' && u.linkedAthleteId === athleteProfileId)?.id;
}

const STORAGE_ASSIGN = 'wolf_wl_assignments_v1';
const STORAGE_COMP = 'wolf_wl_completions_v1';
const STORAGE_TEMPLATES = 'wolf_wl_program_templates_v1';
const STORAGE_PERSONA = 'wolf_persona_v1';
const STORAGE_CURRENT_USER = 'wolf_current_user_v1';
const STORAGE_API_TOKEN = 'wolf_api_token_v1';
const STORAGE_API_REFRESH_TOKEN = 'wolf_api_refresh_token_v1';

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

function isWolfAppRole(role: unknown): role is WolfAppRole {
  return role === 'athlete' || role === 'coach' || role === 'super_admin';
}

/** Si el API devolvió rol del módulo email (trainer/owner), recuperar coach|athlete desde el catálogo Wolf. */
function reconcileApiUser(apiUser: WolfUser, email: string, catalog: WolfUser[]): WolfUser {
  if (isWolfAppRole(apiUser.role)) return apiUser;
  const normalizedEmail = email.trim().toLowerCase();
  const seed =
    catalog.find((u) => u.email?.toLowerCase() === normalizedEmail) ?? catalog.find((u) => u.id === apiUser.id);
  if (!seed) return apiUser;
  return {
    ...seed,
    ...apiUser,
    role: seed.role,
    coachId: apiUser.coachId ?? seed.coachId,
    linkedAthleteId: apiUser.linkedAthleteId ?? seed.linkedAthleteId,
  };
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
  restoreAssignmentVersion: (assignmentId: string, version: number) => boolean;
  duplicateAssignment: (assignmentId: string, targetAthleteProfileId: string) => string;
  coachTemplates: CoachWlProgramTemplate[];
  saveCoachTemplate: (name: string, program: GeneratedProgram, sourceAssignmentId?: string) => string;
  deleteCoachTemplate: (templateId: string) => void;
  assignFromTemplate: (templateId: string, athleteProfileId: string) => string | null;
  toggleSessionComplete: (assignmentId: string, weekNumber: number, dayNumber: number, exerciseCount?: number) => void;
  isSessionComplete: (assignmentId: string, weekNumber: number, dayNumber: number, exerciseCount?: number) => boolean;
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
  /** Asignación activa del atleta vinculado (user-athlete) */
  myAssignment: ProgramAssignment | undefined;
  loginUser: (email: string, password: string) => Promise<WolfUser | null>;
  loginWithGoogle: (idToken: string) => Promise<WolfUser | null>;
  registerUser: (payload: { name: string; email: string; password: string; role: WolfAppRole }) => Promise<string | null>;
  changePassword: (payload: { email: string; currentPassword: string; newPassword: string }) => Promise<string | null>;
  forgotPassword: (payload: { email: string }) => Promise<string | null>;
  resetPassword: (payload: { email: string; token: string; newPassword: string }) => Promise<string | null>;
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
  const [apiRefreshToken, setApiRefreshToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(STORAGE_API_REFRESH_TOKEN);
    } catch {
      return null;
    }
  });
  const [users, setUsers] = useState<WolfUser[]>(mockUsers);
  const [assignments, setAssignments] = useState<ProgramAssignment[]>([]);
  const [completions, setCompletions] = useState<SessionCompletion[]>([]);
  const [coachTemplates, setCoachTemplates] = useState<CoachWlProgramTemplate[]>([]);
  const [currentUserId, setCurrentUserId] = useState('user-coach');
  const [persona, setPersonaState] = useState<'coach' | 'athlete'>('coach');

  useEffect(() => {
    try {
      const a = localStorage.getItem(STORAGE_ASSIGN);
      const c = localStorage.getItem(STORAGE_COMP);
      const tpl = localStorage.getItem(STORAGE_TEMPLATES);
      const p = localStorage.getItem(STORAGE_PERSONA) as WolfAppRole | null;
      const storedUser = localStorage.getItem(STORAGE_CURRENT_USER);
      if (tpl) {
        const parsed = JSON.parse(tpl) as CoachWlProgramTemplate[];
        if (Array.isArray(parsed)) setCoachTemplates(parsed);
      }
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
    setApiRefreshToken(null);
    try {
      localStorage.removeItem(STORAGE_API_TOKEN);
      localStorage.removeItem(STORAGE_API_REFRESH_TOKEN);
    } catch {
      /* ignore */
    }
  }, []);

  const storeTokens = useCallback((accessToken?: string, refreshToken?: string) => {
    if (accessToken) {
      setApiToken(accessToken);
      try {
        localStorage.setItem(STORAGE_API_TOKEN, accessToken);
      } catch {
        /* ignore */
      }
    }
    if (refreshToken) {
      setApiRefreshToken(refreshToken);
      try {
        localStorage.setItem(STORAGE_API_REFRESH_TOKEN, refreshToken);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const loadUsersFromApi = useCallback(
    async (authorizationOverride?: string | null): Promise<WolfUser[] | undefined> => {
      if (!isApiEnabled()) return undefined;
      const bearer = authorizationOverride !== undefined ? authorizationOverride : apiToken;
      try {
        const headers: Record<string, string> = {};
        if (bearer) headers.Authorization = `Bearer ${bearer}`;
        const res = await fetch(`${getApiBase()}/users`, { headers });
        if (!res.ok) return undefined;
        const list = (await res.json()) as WolfUser[];
        if (!Array.isArray(list) || list.length === 0) return undefined;
        setUsers(list);
        return list;
      } catch {
        /* fallback to mock users */
        return undefined;
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

  const loadCompletionsFromApi = useCallback(async () => {
    if (!isApiEnabled()) return;
    try {
      const headers: Record<string, string> = {};
      const token = readApiToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${getApiBase()}/completions`, { headers });
      if (!res.ok) return;
      const list = (await res.json()) as SessionCompletion[];
      if (Array.isArray(list)) setCompletions(list);
    } catch {
      /* fallback to local state */
    }
  }, []);

  useEffect(() => {
    void loadUsersFromApi();
    void loadAssignmentsFromApi();
    void loadCompletionsFromApi();
  }, [loadUsersFromApi, loadAssignmentsFromApi, loadCompletionsFromApi]);

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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TEMPLATES, JSON.stringify(coachTemplates));
    } catch {
      /* ignore */
    }
  }, [coachTemplates]);

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

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!apiRefreshToken || !isApiEnabled()) return false;
    try {
      const res = await fetch(`${getApiBase()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: apiRefreshToken }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken?: string; refreshToken?: string; user?: WolfUser };
      storeTokens(data.accessToken, data.refreshToken);
      if (data.user) {
        const catalog = users.length > 0 ? users : mockUsers;
        applyUserSession(reconcileApiUser(data.user, data.user.email ?? '', catalog));
      }
      return true;
    } catch {
      return false;
    }
  }, [apiRefreshToken, applyUserSession, storeTokens, users]);

  const apiRequest = useCallback(
    async (path: string, init: RequestInit = {}, retry = true): Promise<Response> => {
      const headers = new Headers(init.headers);
      if (apiToken) headers.set('Authorization', `Bearer ${apiToken}`);
      const res = await fetch(`${getApiBase()}${path}`, { ...init, headers });
      if (res.status !== 401 || !retry) return res;
      const refreshed = await refreshSession();
      if (!refreshed) return res;
      const retryHeaders = new Headers(init.headers);
      const nextToken = readApiToken();
      if (nextToken) retryHeaders.set('Authorization', `Bearer ${nextToken}`);
      return fetch(`${getApiBase()}${path}`, { ...init, headers: retryHeaders });
    },
    [apiToken, refreshSession],
  );

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
        const loaded = await loadUsersFromApi();
        if (cancelled) return;
        const catalog = loaded && loaded.length > 0 ? loaded : mockUsers;
        applyUserSession(reconcileApiUser(data.user, data.user.email ?? '', catalog));
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

  const restoreAssignmentVersion = useCallback(
    (assignmentId: string, version: number): boolean => {
      const asg = assignments.find((a) => a.id === assignmentId);
      if (!asg) return false;
      let targetProgram: GeneratedProgram | null = null;
      if (asg.version === version) {
        targetProgram = asg.program;
      } else {
        const hist = asg.versionHistory.find((h) => h.version === version);
        if (hist) targetProgram = hist.program;
      }
      if (!targetProgram) return false;
      updateAssignmentProgram(assignmentId, targetProgram);
      return true;
    },
    [assignments, updateAssignmentProgram],
  );

  const duplicateAssignment = useCallback(
    (assignmentId: string, targetAthleteProfileId: string): string => {
      const asg = assignments.find((a) => a.id === assignmentId);
      if (!asg) return '';
      return assignProgramToAthlete(asg.program, targetAthleteProfileId);
    },
    [assignments, assignProgramToAthlete],
  );

  const saveCoachTemplate = useCallback(
    (name: string, program: GeneratedProgram, sourceAssignmentId?: string): string => {
      const coachId =
        currentUser?.role === 'coach' || currentUser?.role === 'super_admin'
          ? currentUser.id
          : 'user-coach';
      const id = `tpl-${Date.now()}`;
      const now = new Date().toISOString();
      const next: CoachWlProgramTemplate = {
        id,
        coachId,
        name: name.trim() || program.name,
        program: { ...program },
        sourceAssignmentId,
        createdAt: now,
        updatedAt: now,
      };
      setCoachTemplates((prev) => [next, ...prev]);
      return id;
    },
    [currentUser],
  );

  const deleteCoachTemplate = useCallback((templateId: string) => {
    setCoachTemplates((prev) => prev.filter((t) => t.id !== templateId));
  }, []);

  const assignFromTemplate = useCallback(
    (templateId: string, athleteProfileId: string): string | null => {
      const tpl = coachTemplates.find((t) => t.id === templateId);
      if (!tpl) return null;
      return assignProgramToAthlete(tpl.program, athleteProfileId);
    },
    [coachTemplates, assignProgramToAthlete],
  );

  const applySessionToggleLocal = useCallback(
    (assignmentId: string, weekNumber: number, dayNumber: number, exerciseCount: number) => {
      setCompletions((prev) => {
        const done = isDayComplete(prev, assignmentId, weekNumber, dayNumber, exerciseCount);
        const filtered = prev.filter(
          (c) =>
            !(
              c.assignmentId === assignmentId &&
              c.weekNumber === weekNumber &&
              c.dayNumber === dayNumber
            ),
        );
        if (done) return filtered;
        return [
          ...filtered,
          {
            assignmentId,
            weekNumber,
            dayNumber,
            completedAt: new Date().toISOString(),
          },
        ];
      });
    },
    [],
  );

  const toggleSessionComplete = useCallback(
    (assignmentId: string, weekNumber: number, dayNumber: number, exerciseCount = 0) => {
      applySessionToggleLocal(assignmentId, weekNumber, dayNumber, exerciseCount);
      if (!isApiEnabled()) return;
      void apiRequest('/completions/session-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, weekNumber, dayNumber, exerciseCount }),
      })
        .then((res) => {
          if (!res.ok) void loadCompletionsFromApi();
        })
        .catch(() => void loadCompletionsFromApi());
    },
    [apiRequest, applySessionToggleLocal, loadCompletionsFromApi],
  );

  const isSessionComplete = useCallback(
    (assignmentId: string, weekNumber: number, dayNumber: number, exerciseCount = 0) =>
      isDayComplete(completions, assignmentId, weekNumber, dayNumber, exerciseCount),
    [completions],
  );

  const toggleExerciseComplete = useCallback(
    (assignmentId: string, weekNumber: number, dayNumber: number, exerciseIndex: number) => {
      setCompletions((prev) => {
        const exists = prev.some((c) =>
          completionMatches(c, assignmentId, weekNumber, dayNumber, exerciseIndex),
        );
        if (exists) {
          return prev.filter(
            (c) => !completionMatches(c, assignmentId, weekNumber, dayNumber, exerciseIndex),
          );
        }
        const withoutSession = prev.filter(
          (c) =>
            !(
              c.assignmentId === assignmentId &&
              c.weekNumber === weekNumber &&
              c.dayNumber === dayNumber &&
              c.exerciseIndex === undefined
            ),
        );
        return [
          ...withoutSession,
          {
            assignmentId,
            weekNumber,
            dayNumber,
            exerciseIndex,
            completedAt: new Date().toISOString(),
          },
        ];
      });
      if (!isApiEnabled()) return;
      void apiRequest('/completions/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, weekNumber, dayNumber, exerciseIndex }),
      })
        .then((res) => {
          if (!res.ok) void loadCompletionsFromApi();
        })
        .catch(() => void loadCompletionsFromApi());
    },
    [apiRequest, loadCompletionsFromApi],
  );

  const isExerciseCompleteFn = useCallback(
    (assignmentId: string, weekNumber: number, dayNumber: number, exerciseIndex: number) =>
      isExerciseComplete(completions, assignmentId, weekNumber, dayNumber, exerciseIndex) ||
      isSessionMarkedComplete(completions, assignmentId, weekNumber, dayNumber),
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
    const commitLoggedInUser = (user: WolfUser): WolfUser => {
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === user.id);
        if (idx >= 0) {
          return prev.map((u, i) => (i === idx ? { ...u, ...user } : u));
        }
        return [...prev, user];
      });
      applyUserSession(user);
      return user;
    };

    if (!isApiEnabled()) {
      const local = users.find(
        (u) => u.email?.toLowerCase() === email.trim().toLowerCase() && matchesStoredPassword(u, password),
      );
      return local ? commitLoggedInUser(local) : null;
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
      const data = (await res.json()) as { user?: WolfUser; token?: string; accessToken?: string; refreshToken?: string };
      storeTokens(data.accessToken ?? data.token, data.refreshToken);
      if (data.user) {
        const catalog = users.length > 0 ? users : mockUsers;
        return commitLoggedInUser(reconcileApiUser(data.user, email, catalog));
      }
      return null;
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('El servidor respondió')) {
        throw e;
      }
      throw new Error(
        'Sin conexión al API. Netlify: en Site → Environment variables pon VITE_API_URL=/api y NETLIFY_API_PROXY_TARGET=https://TU-API.onrender.com (redeploy). O VITE_API_URL=https://TU-API.onrender.com sin proxy. Ver README.',
      );
    }
  }, [applyUserSession, storeTokens, users]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    if (!isApiEnabled()) return null;
    const res = await fetch(`${getApiBase()}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: WolfUser; accessToken?: string; refreshToken?: string };
    storeTokens(data.accessToken, data.refreshToken);
    if (data.user) {
      const catalog = users.length > 0 ? users : mockUsers;
      const merged = reconcileApiUser(data.user, data.user.email ?? '', catalog);
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === merged.id);
        if (idx >= 0) return prev.map((u, i) => (i === idx ? { ...u, ...merged } : u));
        return [...prev, merged];
      });
      applyUserSession(merged);
      return merged;
    }
    return data.user ?? null;
  }, [applyUserSession, storeTokens, users]);

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
      await loadUsersFromApi();
      return null;
    } catch {
      return 'Could not connect to backend.';
    }
  }, [loadUsersFromApi, users]);

  const forgotPassword = useCallback(async (payload: { email: string }) => {
    if (!isApiEnabled()) return 'Feature requires backend API.';
    try {
      const res = await fetch(`${getApiBase()}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return 'Could not send recovery email.';
      return null;
    } catch {
      return 'Could not connect to backend.';
    }
  }, []);

  const resetPassword = useCallback(async (payload: { email: string; token: string; newPassword: string }) => {
    if (!isApiEnabled()) return 'Feature requires backend API.';
    try {
      const res = await fetch(`${getApiBase()}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return 'Could not reset password.';
      return null;
    } catch {
      return 'Could not connect to backend.';
    }
  }, []);

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
      const res = await apiRequest('/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
  }, [apiRequest, loadUsersFromApi, users]);

  const updateUser = useCallback(async (userId: string, payload: Partial<Pick<WolfUser, 'name' | 'email' | 'role' | 'coachId' | 'linkedAthleteId'>>) => {
    if (!isApiEnabled()) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...payload } : u)));
      return null;
    }
    try {
      const res = await apiRequest(`/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
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
  }, [apiRequest, loadUsersFromApi]);

  const deleteUser = useCallback(async (userId: string) => {
    if (!isApiEnabled()) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (currentUserId === userId) {
        setCurrentUserIdSafe(mockUsers.some((u) => u.id === 'user-owner') ? 'user-owner' : 'user-coach');
      }
      return null;
    }
    try {
      const res = await apiRequest(`/users/${userId}`, { method: 'DELETE' });
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
  }, [apiRequest, currentUserId, loadUsersFromApi, setCurrentUserIdSafe]);

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
    restoreAssignmentVersion,
    duplicateAssignment,
    coachTemplates,
    saveCoachTemplate,
    deleteCoachTemplate,
    assignFromTemplate,
    toggleSessionComplete,
    isSessionComplete,
    toggleExerciseComplete,
    isExerciseComplete: isExerciseCompleteFn,
    myAssignment,
    loginUser,
    loginWithGoogle,
    registerUser,
    changePassword,
    forgotPassword,
    resetPassword,
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
