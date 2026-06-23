import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  CoachWlProgramTemplate,
  Exercise,
  GeneratedProgram,
  ProgramAssignment,
  SessionCompletion,
  SetCompletionLog,
  WolfAppRole,
  WolfUser,
} from '../models/training';
import type {
  CoachExerciseOverride,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  ExerciseRelationshipRule,
  ExerciseTaxonomyBundle,
  OverridePatch,
  RegistryBrowseQuery,
  RegistryBrowseResult,
  TechnicalCollectionWithItems,
} from '../models/exercise';
import { mockExercises, mockUsers } from '../data/loadMockData';
import { userMatchesLoginId } from '../utils/loginIdentifier';
import { seedTechnicalCollectionsLocal } from '../data/exercise-intelligence/seedCollections';
import { seedExerciseDefinitionsFromLegacy, seedRelationshipRules } from '../api/exerciseCatalogSeed';
import {
  browseExerciseRegistry,
  getExerciseTaxonomy,
  mergeCatalogViews,
  mergedViewsToPickerOptions,
  toLegacyExercise,
  type SessionPickerOption,
} from '../services/exercise';
import { normalizeExercise } from '../utils/exerciseCatalog';
import { WlAssignmentsProvider, useWlAssignments } from '../modules/assignments';
import { upsertCoachAthleteLocal } from '../modules/wl-athletes/athleteStore';
import { WlAthletesProvider, useWlAthletes } from '../modules/wl-athletes';
import { WlTemplatesProvider, useWlTemplates } from '../modules/wl-templates';
import { WlProgramsProvider, useWlPrograms } from '../modules/wl-programs';
import { getApiBase as getAssignmentsApiBase, isApiEnabled as isAssignmentsApiEnabled, getWebSocketUrl } from '../modules/assignments/apiClient';
import { hashPassword, matchesStoredPassword } from '../utils/passwordCrypto';

const STORAGE_PERSONA = 'wolf_persona_v1';
const STORAGE_CURRENT_USER = 'wolf_current_user_v1';
const STORAGE_API_TOKEN = 'wolf_api_token_v1';
const STORAGE_API_REFRESH_TOKEN = 'wolf_api_refresh_token_v1';
const STORAGE_MOTOR_EXERCISES = 'wolf_motor_exercises_custom_v1';
const STORAGE_EXERCISE_DEFS = 'wolf_exercise_definitions_custom_v1';

const BUILTIN_EXERCISE_IDS = new Set(mockExercises.map((e) => e.id));

function readLocalCoachExercises(): Exercise[] {
  try {
    const raw = localStorage.getItem(STORAGE_MOTOR_EXERCISES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Exercise[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((e) => normalizeExercise({ ...e } as unknown as Record<string, unknown>));
  } catch {
    return [];
  }
}

function persistLocalCoachExercises(custom: Exercise[]): void {
  try {
    localStorage.setItem(STORAGE_MOTOR_EXERCISES, JSON.stringify(custom));
  } catch {
    /* ignore */
  }
}

/** @deprecated Legacy flat exercise form â€” use ExerciseDefinitionInput */
export type MotorExerciseInput = {
  name: string;
  category: import('../models/training').ExerciseCategory;
  subtype: import('../models/training').ExerciseSubtype;
  startPosition: import('../models/training').StartPosition;
  complexity: import('../models/training').ExerciseComplexity;
  goal: import('../models/training').ExerciseGoal;
  intensityRange: [number, number];
  loadAnchor: import('../models/training').ExerciseLoadAnchor;
  loadScale: number;
};

function readLocalExerciseDefinitions(): ExerciseDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_EXERCISE_DEFS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExerciseDefinition[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLocalExerciseDefinitions(custom: ExerciseDefinition[]): void {
  try {
    const coachOnly = custom.filter((d) => d.coachId);
    localStorage.setItem(STORAGE_EXERCISE_DEFS, JSON.stringify(coachOnly));
  } catch {
    /* ignore */
  }
}

/** URL del API: build `VITE_API_URL`, o `window.__WOLF_API_URL__` en index.html (sin redeploy). */
export function getApiBase(): string {
  return getAssignmentsApiBase();
}

export function isApiEnabled(): boolean {
  return isAssignmentsApiEnabled();
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

/** Si el API devolviÃ³ rol del mÃ³dulo email (trainer/owner), recuperar coach|athlete desde el catÃ¡logo Wolf. */
function reconcileApiUser(apiUser: WolfUser, loginId: string, catalog: WolfUser[]): WolfUser {
  if (isWolfAppRole(apiUser.role)) return apiUser;
  const normalizedLogin = loginId.trim().toLowerCase();
  const seed =
    catalog.find((u) => userMatchesLoginId(u, normalizedLogin)) ??
    catalog.find((u) => u.id === apiUser.id);
  if (!seed) return apiUser;
  return {
    ...seed,
    ...apiUser,
    role: seed.role,
    coachId: apiUser.coachId ?? seed.coachId,
    linkedAthleteId: apiUser.linkedAthleteId ?? seed.linkedAthleteId,
    username: apiUser.username ?? seed.username,
  };
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
  assignProgramToAthlete: (
    program: ProgramAssignment['program'],
    athleteProfileId: string,
    coachProgramId?: string,
  ) => Promise<string>;
  /** Actualiza el JSON del programa en una asignaciÃ³n (coach editando plan ya enviado). */
  updateAssignmentProgram: (assignmentId: string, program: ProgramAssignment['program']) => void;
  removeAssignment: (assignmentId: string) => Promise<boolean>;
  restoreAssignmentVersion: (assignmentId: string, version: number) => boolean;
  duplicateAssignment: (assignmentId: string, targetAthleteProfileId: string) => Promise<string>;
  coachTemplates: CoachWlProgramTemplate[];
  saveCoachTemplate: (name: string, program: GeneratedProgram, sourceAssignmentId?: string) => Promise<string>;
  deleteCoachTemplate: (templateId: string) => Promise<boolean>;
  assignFromTemplate: (templateId: string, athleteProfileId: string) => Promise<string | null>;
  wlAthletes: import('../models/training').Athlete[];
  athletesLoading: boolean;
  canManageWlAthletes: boolean;
  canEditWlRoster: boolean;
  rosterForCoach: (coach: WolfUser | undefined) => import('../models/training').Athlete[];
  reloadWlAthletesFromApi: () => Promise<void>;
  createWlAthlete: (
    input: import('../modules/wl-athletes/types').CreateWlAthleteInput,
  ) => Promise<import('../models/training').Athlete | null>;
  updateWlAthlete: (id: string, patch: Partial<import('../models/training').Athlete>) => Promise<import('../models/training').Athlete | null>;
  deleteWlAthlete: (id: string) => Promise<boolean>;
  coachPrograms: import('../models/coach-architecture').CoachProgramRow[];
  programsLoading: boolean;
  programsView: import('../modules/wl-programs').WlProgramsView;
  editingProgramId: string | null;
  openProgramEditor: (programId: string | null) => void;
  closeProgramEditor: () => void;
  reloadProgramsFromApi: () => Promise<void>;
  createCoachProgram: (name: string, program?: GeneratedProgram) => Promise<import('../models/coach-architecture').CoachProgram | null>;
  updateCoachProgram: (
    id: string,
    patch: {
      name?: string;
      program?: GeneratedProgram;
      status?: import('../models/coach-architecture').CoachProgramStatus;
    },
  ) => Promise<import('../models/coach-architecture').CoachProgram | null>;
  deleteCoachProgram: (id: string) => Promise<boolean>;
  duplicateCoachProgram: (id: string) => Promise<import('../models/coach-architecture').CoachProgram | null>;
  assignCoachProgramToAthletes: (programId: string, athleteProfileIds: string[]) => Promise<string[]>;
  getCoachProgramById: (id: string) => import('../models/coach-architecture').CoachProgramRow | undefined;
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
  setLogs: SetCompletionLog[];
  toggleSetComplete: (input: {
    assignmentId: string;
    weekNumber: number;
    dayNumber: number;
    exerciseIndex: number;
    schemeIndex: number;
    setInstance: number;
    actualKg?: number;
    actualReps?: number;
    actualSegmentReps?: number[];
  }) => void;
  updateSetLog: (input: {
    assignmentId: string;
    weekNumber: number;
    dayNumber: number;
    exerciseIndex: number;
    schemeIndex: number;
    setInstance: number;
    actualKg?: number;
    actualReps?: number;
    actualSegmentReps?: number[];
  }) => void;
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
  /** AsignaciÃ³n activa del atleta vinculado (user-athlete) */
  myAssignment: ProgramAssignment | undefined;
  myAssignments: ProgramAssignment[];
  assignmentsLoading: boolean;
  isTrackingPending: (key: string) => boolean;
  isTrackingFailed: (key: string) => boolean;
  setLogTrackingKey: (input: {
    assignmentId: string;
    weekNumber: number;
    dayNumber: number;
    exerciseIndex: number;
    schemeIndex: number;
    setInstance: number;
    actualKg?: number;
    actualReps?: number;
    actualSegmentReps?: number[];
  }) => string;
  exerciseTrackingKey: (
    assignmentId: string,
    weekNumber: number,
    dayNumber: number,
    exerciseIndex: number,
  ) => string;
  sessionTrackingKey: (assignmentId: string, weekNumber: number, dayNumber: number) => string;
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
    username?: string;
    coachId?: string;
    linkedAthleteId?: string;
    level?: import('../models/training').Athlete['level'];
    bodyweight?: number;
    oneRM?: import('../models/training').Athlete['oneRM'];
  }) => Promise<string | null>;
  updateUser: (userId: string, payload: Partial<Pick<WolfUser, 'name' | 'email' | 'role' | 'coachId' | 'linkedAthleteId'>>) => Promise<string | null>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<string | null>;
  deleteUser: (userId: string) => Promise<string | null>;
  /** Limpia token del API (p. ej. al cerrar sesiÃ³n). */
  clearApiSession: () => void;
  /** CatÃ¡logo WL legacy (motor, editor sesiÃ³n). */
  motorExercises: Exercise[];
  /** Opciones del autocomplete del editor (todas las definiciones asignables). */
  sessionExercisePicker: SessionPickerOption[];
  /** Solo movimientos simples (segmentos de complejo). */
  sessionExercisePickerSingles: SessionPickerOption[];
  exerciseTaxonomy: ExerciseTaxonomyBundle;
  motorExerciseDefinitions: ExerciseDefinition[];
  exerciseRelationships: ExerciseRelationshipRule[];
  refreshExerciseCatalog: () => Promise<void>;
  createExerciseDefinition: (input: ExerciseDefinitionInput) => Promise<string | null>;
  updateExerciseDefinition: (id: string, input: ExerciseDefinitionInput) => Promise<string | null>;
  deleteExerciseDefinition: (id: string) => Promise<string | null>;
  createExerciseRelationship: (
    input: Omit<ExerciseRelationshipRule, 'id' | 'coachId' | 'isActive'> & { isActive?: boolean },
  ) => Promise<string | null>;
  deleteExerciseRelationship: (id: string) => Promise<string | null>;
  logPrescriptionEvent: (event: {
    athleteProfileId: string;
    definitionId: string;
    prescribedPct: number;
    completed?: boolean;
    rpe?: number;
  }) => Promise<void>;
  coachExerciseOverrides: CoachExerciseOverride[];
  technicalCollections: TechnicalCollectionWithItems[];
  mergedExerciseDefinitions: import('../models/exercise').MergedDefinitionView[];
  registryBrowse: (query?: RegistryBrowseQuery) => RegistryBrowseResult;
  forkExerciseDefinition: (parentId: string, input: ExerciseDefinitionInput) => Promise<string | null>;
  upsertCoachOverride: (baseDefinitionId: string, patch: OverridePatch) => Promise<string | null>;
  fetchDefinitionDetail: (id: string) => Promise<{
    definition: ExerciseDefinition;
    versions: import('../models/exercise').ExerciseDefinitionVersion[];
  } | null>;
  publishExerciseDefinition: (id: string, changeReason?: string) => Promise<string | null>;
  isBuiltinMotorExercise: (id: string) => boolean;
  /** @deprecated */
  refreshMotorExercises: () => Promise<void>;
  /** @deprecated */
  createMotorExercise: (input: MotorExerciseInput) => Promise<string | null>;
  /** @deprecated */
  updateMotorExercise: (id: string, input: MotorExerciseInput) => Promise<string | null>;
  /** @deprecated */
  deleteMotorExercise: (id: string) => Promise<string | null>;
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
  const [coachCustomExercises, setCoachCustomExercises] = useState<Exercise[]>(() => readLocalCoachExercises());
  const [exerciseTaxonomy, setExerciseTaxonomy] = useState<ExerciseTaxonomyBundle>(() => getExerciseTaxonomy());
  const [motorExerciseDefinitions, setMotorExerciseDefinitions] = useState<ExerciseDefinition[]>(() => {
    const system = seedExerciseDefinitionsFromLegacy();
    const custom = typeof window !== 'undefined' ? readLocalExerciseDefinitions() : [];
    const byId = new Map<string, ExerciseDefinition>();
    for (const d of system) byId.set(d.id, d);
    for (const d of custom) byId.set(d.id, d);
    return [...byId.values()];
  });
  const [exerciseRelationships, setExerciseRelationships] = useState<ExerciseRelationshipRule[]>(() =>
    seedRelationshipRules(),
  );
  const [coachExerciseOverrides, setCoachExerciseOverrides] = useState<CoachExerciseOverride[]>([]);
  const [technicalCollections, setTechnicalCollections] = useState<TechnicalCollectionWithItems[]>(() =>
    seedTechnicalCollectionsLocal(),
  );
  const [currentUserId, setCurrentUserId] = useState('user-coach');
  const [persona, setPersonaState] = useState<'coach' | 'athlete'>('coach');

  const mergedExerciseDefinitions = useMemo(
    () => mergeCatalogViews(motorExerciseDefinitions, coachExerciseOverrides, currentUserId),
    [motorExerciseDefinitions, coachExerciseOverrides, currentUserId],
  );

  const motorExercises = useMemo(
    () =>
      mergedExerciseDefinitions.map((def) => {
        const ex = toLegacyExercise(def, exerciseTaxonomy);
        return {
          ...ex,
          id: def.legacyExerciseId ?? def.id,
          name: def.effectiveDisplayName,
        };
      }),
    [mergedExerciseDefinitions, exerciseTaxonomy],
  );

  const sessionExercisePicker = useMemo(() => {
    const result = browseExerciseRegistry(motorExerciseDefinitions, coachExerciseOverrides, {
      coachId: currentUserId,
      includeDeprecated: false,
      status: 'all',
      kind: 'all',
    }, exerciseTaxonomy);
    return mergedViewsToPickerOptions(result.definitions, exerciseTaxonomy);
  }, [motorExerciseDefinitions, coachExerciseOverrides, currentUserId, exerciseTaxonomy]);

  const sessionExercisePickerSingles = useMemo(() => {
    const result = browseExerciseRegistry(motorExerciseDefinitions, coachExerciseOverrides, {
      coachId: currentUserId,
      includeDeprecated: false,
      status: 'all',
      kind: 'single',
    }, exerciseTaxonomy);
    return mergedViewsToPickerOptions(result.definitions, exerciseTaxonomy);
  }, [motorExerciseDefinitions, coachExerciseOverrides, currentUserId, exerciseTaxonomy]);

  const registryBrowse = useCallback(
    (query?: RegistryBrowseQuery) =>
      browseExerciseRegistry(motorExerciseDefinitions, coachExerciseOverrides, {
        coachId: currentUserId,
        ...query,
      }, exerciseTaxonomy),
    [motorExerciseDefinitions, coachExerciseOverrides, currentUserId, exerciseTaxonomy],
  );

  const isBuiltinMotorExercise = useCallback((id: string) => BUILTIN_EXERCISE_IDS.has(id), []);

  useEffect(() => {
    try {
      const p = localStorage.getItem(STORAGE_PERSONA) as WolfAppRole | null;
      const storedUser = localStorage.getItem(STORAGE_CURRENT_USER);
      if (storedUser && mockUsers.some((u) => u.id === storedUser)) {
        setCurrentUserId(storedUser);
      }
      if (p === 'coach' || p === 'athlete') setPersonaState(p);
    } catch {
      /* ignore */
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

  const loadExerciseCatalogFromApi = useCallback(async () => {
    if (!isApiEnabled()) return;
    const token = readApiToken();
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [taxRes, defRes, relRes, colRes, ovrRes] = await Promise.all([
        fetch(`${getApiBase()}/exercise-taxonomy`, { headers }),
        fetch(`${getApiBase()}/exercise-definitions`, { headers }),
        fetch(`${getApiBase()}/exercise-relationships`, { headers }),
        fetch(`${getApiBase()}/technical-collections`, { headers }),
        fetch(`${getApiBase()}/coach-exercise-overrides`, { headers }),
      ]);
      if (taxRes.ok) {
        const tax = (await taxRes.json()) as ExerciseTaxonomyBundle;
        if (tax?.families?.length) setExerciseTaxonomy(tax);
      }
      if (defRes.ok) {
        const defs = (await defRes.json()) as ExerciseDefinition[];
        if (Array.isArray(defs)) setMotorExerciseDefinitions(defs);
      }
      if (relRes.ok) {
        const rel = (await relRes.json()) as ExerciseRelationshipRule[];
        if (Array.isArray(rel)) setExerciseRelationships(rel);
      }
      if (colRes.ok) {
        const cols = (await colRes.json()) as TechnicalCollectionWithItems[];
        if (Array.isArray(cols)) setTechnicalCollections(cols);
      }
      if (ovrRes.ok) {
        const ovrs = (await ovrRes.json()) as CoachExerciseOverride[];
        if (Array.isArray(ovrs)) setCoachExerciseOverrides(ovrs);
      }
    } catch {
      /* keep local catalog */
    }
  }, []);

  useEffect(() => {
    void loadUsersFromApi();
  }, [loadUsersFromApi]);

  useEffect(() => {
    if (!isApiEnabled()) return;
    if (!apiToken) return;
    void loadExerciseCatalogFromApi();
  }, [apiToken, loadExerciseCatalogFromApi]);

  useEffect(() => {
    if (!isApiEnabled()) return;
    const wsUrl = getWebSocketUrl();
    if (!wsUrl) return;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as { event?: string };
          if (msg.event === 'exercises:changed' || msg.event === 'exercise-catalog:changed') {
            void loadExerciseCatalogFromApi();
          }
        } catch {
          /* ignore malformed messages */
        }
      };
    } catch {
      /* websocket unavailable */
    }
    return () => {
      if (ws && ws.readyState < 2) ws.close();
    };
  }, [loadExerciseCatalogFromApi]);

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

  /** Sincroniza sesiÃ³n cuando el usuario viene del API (p. ej. GET /auth/me) antes de que `users` estÃ© hidratado. */
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
        /* red: mantener sesiÃ³n local */
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
        (u) => userMatchesLoginId(u, email) && matchesStoredPassword(u, password),
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
          const j = (await res.json()) as { error?: string; message?: string };
          detail = j.error ?? j.message ?? '';
          if (detail) detail = ` ${detail}`;
        } catch {
          /* ignore */
        }
        const hint =
          res.status === 500
            ? ' Revisa JWT_EXPIRES_IN en el API (usa 7d, no 604800) y los logs del servidor.'
            : res.status === 403 || res.status === 0
              ? ' Revisa CORS (FRONTEND_ORIGIN en el API) y que la URL sea correcta.'
              : ' Revisa que la URL del API sea correcta.';
        throw new Error(`El servidor respondió ${res.status}.${detail}${hint}`);
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
        'Sin conexión al API. Netlify: Site → Environment variables → VITE_API_URL=/api y NETLIFY_API_PROXY_TARGET=https://TU-API.railway.app (redeploy). Ver README.',
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
    username?: string;
    coachId?: string;
    linkedAthleteId?: string;
    level?: import('../models/training').Athlete['level'];
    bodyweight?: number;
    oneRM?: import('../models/training').Athlete['oneRM'];
  }) => {
    if (!isApiEnabled()) {
      if (users.some((u) => u.email?.toLowerCase() === payload.email.trim().toLowerCase())) return 'Email already exists.';
      const username = payload.username?.trim().toLowerCase();
      if (username && users.some((u) => u.username?.toLowerCase() === username)) return 'Username already exists.';
      const profileId =
        payload.linkedAthleteId ?? (payload.role === 'athlete' ? `ath-${Date.now()}` : undefined);
      const coachId = payload.role === 'athlete' ? (payload.coachId ?? 'user-coach-wl') : payload.coachId;
      setUsers((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          name: payload.name.trim(),
          email: payload.email.trim().toLowerCase(),
          username,
          role: payload.role,
          passwordHash: hashPassword(payload.password),
          coachId,
          linkedAthleteId: profileId,
        },
      ]);
      if (payload.role === 'athlete' && profileId && coachId) {
        upsertCoachAthleteLocal(coachId, {
          id: profileId,
          name: payload.name.trim(),
          level: payload.level ?? 'intermediate',
          bodyweight: payload.bodyweight ?? 75,
          oneRM: payload.oneRM ?? { snatch: 60, cleanJerk: 80, backSquat: 100, frontSquat: 85 },
          fatigueScore: 40,
          readinessScore: 70,
        });
      }
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

  const resetUserPassword = useCallback(async (userId: string, newPassword: string): Promise<string | null> => {
    if (newPassword.trim().length < 6) return 'Password must be at least 6 characters.';
    if (!isApiEnabled()) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, passwordHash: hashPassword(newPassword.trim()) } : u,
        ),
      );
      return null;
    }
    try {
      const res = await apiRequest(`/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword.trim() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        return err?.error ?? 'Could not reset password.';
      }
      return null;
    } catch {
      return 'Could not connect to backend.';
    }
  }, [apiRequest]);

  const refreshExerciseCatalog = useCallback(async () => {
    await loadExerciseCatalogFromApi();
  }, [loadExerciseCatalogFromApi]);

  const refreshMotorExercises = refreshExerciseCatalog;

  const applyLocalDefinitionCatalog = useCallback((customCoach: ExerciseDefinition[]) => {
    const system = seedExerciseDefinitionsFromLegacy();
    const byId = new Map<string, ExerciseDefinition>();
    for (const d of system) byId.set(d.id, d);
    for (const d of customCoach) byId.set(d.id, d);
    setMotorExerciseDefinitions([...byId.values()]);
    persistLocalExerciseDefinitions(customCoach);
  }, []);

  const createExerciseDefinition = useCallback(
    async (input: ExerciseDefinitionInput): Promise<string | null> => {
      if (isApiEnabled() && apiToken) {
        try {
          const res = await apiRequest('/exercise-definitions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            return err?.error ?? 'Could not create exercise.';
          }
          await loadExerciseCatalogFromApi();
          return null;
        } catch {
          return 'Could not connect to backend.';
        }
      }
      const { buildExerciseDefinition } = await import('../services/exercise/buildDefinition');
      const id = `def-${Date.now()}`;
      const created = buildExerciseDefinition(id, input, exerciseTaxonomy, { coachId: 'user-coach' });
      const custom = motorExerciseDefinitions.filter((d) => d.coachId);
      applyLocalDefinitionCatalog([...custom, created]);
      return null;
    },
    [apiRequest, apiToken, applyLocalDefinitionCatalog, exerciseTaxonomy, loadExerciseCatalogFromApi, motorExerciseDefinitions],
  );

  const updateExerciseDefinition = useCallback(
    async (id: string, input: ExerciseDefinitionInput): Promise<string | null> => {
      if (BUILTIN_EXERCISE_IDS.has(id) && !motorExerciseDefinitions.find((d) => d.id === id)?.coachId) {
        return 'System exercises cannot be edited.';
      }
      if (isApiEnabled() && apiToken) {
        try {
          const res = await apiRequest(`/exercise-definitions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            return err?.error ?? 'Could not update exercise.';
          }
          await loadExerciseCatalogFromApi();
          return null;
        } catch {
          return 'Could not connect to backend.';
        }
      }
      const { buildExerciseDefinition } = await import('../services/exercise/buildDefinition');
      const updated = buildExerciseDefinition(id, input, exerciseTaxonomy, {
        coachId: motorExerciseDefinitions.find((d) => d.id === id)?.coachId ?? 'user-coach',
      });
      const custom = motorExerciseDefinitions.filter((d) => d.coachId && d.id !== id);
      applyLocalDefinitionCatalog([...custom, updated]);
      return null;
    },
    [apiRequest, apiToken, applyLocalDefinitionCatalog, exerciseTaxonomy, loadExerciseCatalogFromApi, motorExerciseDefinitions],
  );

  const createExerciseRelationship = useCallback(
    async (
      input: Omit<ExerciseRelationshipRule, 'id' | 'coachId' | 'isActive'> & { isActive?: boolean },
    ): Promise<string | null> => {
      if (isApiEnabled() && apiToken) {
        try {
          const res = await apiRequest('/exercise-relationships', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            return err?.error ?? 'Could not create relationship.';
          }
          await loadExerciseCatalogFromApi();
          return null;
        } catch {
          return 'Could not connect to backend.';
        }
      }
      const rule: ExerciseRelationshipRule = {
        ...input,
        id: `rel-${Date.now()}`,
        coachId: 'user-coach',
        isActive: input.isActive !== false,
      };
      setExerciseRelationships((prev) => [...prev, rule]);
      return null;
    },
    [apiRequest, apiToken, loadExerciseCatalogFromApi],
  );

  const deleteExerciseRelationship = useCallback(
    async (id: string): Promise<string | null> => {
      const rule = exerciseRelationships.find((r) => r.id === id);
      if (rule && !rule.coachId) return 'System rules cannot be deleted.';
      if (isApiEnabled() && apiToken) {
        try {
          const res = await apiRequest(`/exercise-relationships/${id}`, { method: 'DELETE' });
          if (!res.ok && res.status !== 204) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            return err?.error ?? 'Could not delete relationship.';
          }
          await loadExerciseCatalogFromApi();
          return null;
        } catch {
          return 'Could not connect to backend.';
        }
      }
      setExerciseRelationships((prev) => prev.filter((r) => r.id !== id));
      return null;
    },
    [apiRequest, apiToken, exerciseRelationships, loadExerciseCatalogFromApi],
  );

  const forkExerciseDefinition = useCallback(
    async (parentId: string, input: ExerciseDefinitionInput): Promise<string | null> => {
      if (isApiEnabled() && apiToken) {
        try {
          const res = await apiRequest(`/exercise-definitions/${parentId}/fork`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            return err?.error ?? 'Could not fork exercise.';
          }
          await loadExerciseCatalogFromApi();
          return null;
        } catch {
          return 'Could not connect to backend.';
        }
      }
      const { buildExerciseDefinition } = await import('../services/exercise/buildDefinition');
      const forked = buildExerciseDefinition(`def-fork-${Date.now()}`, input, exerciseTaxonomy, {
        coachId: 'user-coach',
      });
      forked.parentDefinitionId = parentId;
      forked.lifecycleStatus = 'coach_modified';
      const custom = motorExerciseDefinitions.filter((d) => d.coachId);
      applyLocalDefinitionCatalog([...custom, forked]);
      return null;
    },
    [apiRequest, apiToken, applyLocalDefinitionCatalog, exerciseTaxonomy, loadExerciseCatalogFromApi, motorExerciseDefinitions],
  );

  const upsertCoachOverride = useCallback(
    async (baseDefinitionId: string, patch: OverridePatch): Promise<string | null> => {
      if (isApiEnabled() && apiToken) {
        try {
          const res = await apiRequest(`/coach-exercise-overrides/${baseDefinitionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            return err?.error ?? 'Could not save override.';
          }
          await loadExerciseCatalogFromApi();
          return null;
        } catch {
          return 'Could not connect to backend.';
        }
      }
      const id = `ovr-user-coach-${baseDefinitionId}`;
      const saved: CoachExerciseOverride = {
        id,
        coachId: 'user-coach',
        baseDefinitionId,
        override: patch,
      };
      setCoachExerciseOverrides((prev) => [...prev.filter((o) => o.id !== id), saved]);
      return null;
    },
    [apiRequest, apiToken, loadExerciseCatalogFromApi],
  );

  const fetchDefinitionDetail = useCallback(
    async (id: string) => {
      if (isApiEnabled() && apiToken) {
        try {
          const res = await apiRequest(`/exercise-definitions/${id}`);
          if (!res.ok) return null;
          return (await res.json()) as {
            definition: ExerciseDefinition;
            versions: import('../models/exercise').ExerciseDefinitionVersion[];
          };
        } catch {
          return null;
        }
      }
      const def = motorExerciseDefinitions.find((d) => d.id === id);
      if (!def) return null;
      return { definition: def, versions: [] };
    },
    [apiRequest, apiToken, motorExerciseDefinitions],
  );

  const publishExerciseDefinition = useCallback(
    async (id: string, changeReason?: string): Promise<string | null> => {
      if (isApiEnabled() && apiToken) {
        try {
          const res = await apiRequest(`/exercise-definitions/${id}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ changeReason }),
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            return err?.error ?? 'Could not publish.';
          }
          await loadExerciseCatalogFromApi();
          return null;
        } catch {
          return 'Could not connect to backend.';
        }
      }
      const def = motorExerciseDefinitions.find((d) => d.id === id);
      if (!def) return 'Not found.';
      def.version = (def.version ?? 1) + 1;
      def.lifecycleStatus = 'official';
      def.publishedAt = new Date().toISOString();
      setMotorExerciseDefinitions([...motorExerciseDefinitions]);
      return null;
    },
    [apiRequest, apiToken, loadExerciseCatalogFromApi, motorExerciseDefinitions],
  );

  const logPrescriptionEvent = useCallback(
    async (event: {
      athleteProfileId: string;
      definitionId: string;
      prescribedPct: number;
      completed?: boolean;
      rpe?: number;
    }) => {
      if (!isApiEnabled() || !apiToken) return;
      try {
        await apiRequest('/prescription-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
      } catch {
        /* analytics best-effort */
      }
    },
    [apiRequest, apiToken],
  );

  const deleteExerciseDefinition = useCallback(
    async (id: string): Promise<string | null> => {
      if (BUILTIN_EXERCISE_IDS.has(id) && !motorExerciseDefinitions.find((d) => d.id === id)?.coachId) {
        return 'System exercises cannot be deleted.';
      }
      if (isApiEnabled() && apiToken) {
        try {
          const res = await apiRequest(`/exercise-definitions/${id}`, { method: 'DELETE' });
          if (!res.ok && res.status !== 204) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            return err?.error ?? 'Could not delete exercise.';
          }
          await loadExerciseCatalogFromApi();
          return null;
        } catch {
          return 'Could not connect to backend.';
        }
      }
      applyLocalDefinitionCatalog(motorExerciseDefinitions.filter((d) => d.coachId && d.id !== id));
      return null;
    },
    [apiRequest, apiToken, applyLocalDefinitionCatalog, loadExerciseCatalogFromApi, motorExerciseDefinitions],
  );

  const applyLocalMotorCatalog = useCallback((custom: Exercise[]) => {
    setCoachCustomExercises(custom);
    persistLocalCoachExercises(custom);
  }, []);

  const createMotorExercise = useCallback(
    async (input: MotorExerciseInput): Promise<string | null> => {
      if (isApiEnabled() && apiToken) {
        try {
          const res = await apiRequest('/exercises', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            return err?.error ?? 'Could not create exercise.';
          }
          await res.json();
          await loadExerciseCatalogFromApi();
          return null;
        } catch {
          return 'Could not connect to backend.';
        }
      }
      const id = `cex-${Date.now()}`;
      const created = normalizeExercise({ id, ...input } as unknown as Record<string, unknown>);
      const custom = [...coachCustomExercises.filter((e) => e.id !== id), created];
      applyLocalMotorCatalog(custom);
      return null;
    },
    [apiRequest, apiToken, applyLocalMotorCatalog, coachCustomExercises, loadExerciseCatalogFromApi],
  );

  const updateMotorExercise = useCallback(
    async (id: string, input: MotorExerciseInput): Promise<string | null> => {
      if (BUILTIN_EXERCISE_IDS.has(id) && !coachCustomExercises.some((e) => e.id === id)) {
        return 'System exercises cannot be edited. Create a custom copy.';
      }
      if (isApiEnabled() && apiToken) {
        try {
          const res = await apiRequest(`/exercises/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            return err?.error ?? 'Could not update exercise.';
          }
          await loadExerciseCatalogFromApi();
          return null;
        } catch {
          return 'Could not connect to backend.';
        }
      }
      const updated = normalizeExercise({ id, ...input } as unknown as Record<string, unknown>);
      const custom = coachCustomExercises.some((e) => e.id === id)
        ? coachCustomExercises.map((e) => (e.id === id ? updated : e))
        : [...coachCustomExercises, updated];
      applyLocalMotorCatalog(custom);
      return null;
    },
    [apiRequest, apiToken, applyLocalMotorCatalog, coachCustomExercises, loadExerciseCatalogFromApi],
  );

  const deleteMotorExercise = useCallback(
    async (id: string): Promise<string | null> => {
      if (BUILTIN_EXERCISE_IDS.has(id) && !coachCustomExercises.some((e) => e.id === id)) {
        return 'System exercises cannot be deleted.';
      }
      if (isApiEnabled() && apiToken) {
        try {
          const res = await apiRequest(`/exercises/${id}`, { method: 'DELETE' });
          if (!res.ok && res.status !== 204) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            return err?.error ?? 'Could not delete exercise.';
          }
          await loadExerciseCatalogFromApi();
          return null;
        } catch {
          return 'Could not connect to backend.';
        }
      }
      applyLocalMotorCatalog(coachCustomExercises.filter((e) => e.id !== id));
      return null;
    },
    [apiRequest, apiToken, applyLocalMotorCatalog, coachCustomExercises, loadExerciseCatalogFromApi],
  );

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

  const catalogValue = {
    users,
    currentUser,
    currentUserId,
    setCurrentUserId: setCurrentUserIdSafe,
    persona,
    setPersona,
    coach,
    athleteUser,
    loginUser,
    loginWithGoogle,
    registerUser,
    changePassword,
    forgotPassword,
    resetPassword,
    createUser,
    updateUser,
    resetUserPassword,
    deleteUser,
    clearApiSession,
    motorExercises,
    sessionExercisePicker,
    sessionExercisePickerSingles,
    exerciseTaxonomy,
    motorExerciseDefinitions,
    exerciseRelationships,
    refreshExerciseCatalog,
    createExerciseDefinition,
    updateExerciseDefinition,
    deleteExerciseDefinition,
    createExerciseRelationship,
    deleteExerciseRelationship,
    logPrescriptionEvent,
    coachExerciseOverrides,
    technicalCollections,
    mergedExerciseDefinitions,
    registryBrowse,
    forkExerciseDefinition,
    upsertCoachOverride,
    fetchDefinitionDetail,
    publishExerciseDefinition,
    isBuiltinMotorExercise,
    refreshMotorExercises,
    createMotorExercise,
    updateMotorExercise,
    deleteMotorExercise,
  };

  return (
    <WlAssignmentsProvider
      currentUser={currentUser}
      athleteUser={athleteUser}
      users={users}
      apiToken={apiToken}
    >
      <WlTemplatesBridge
        catalog={catalogValue}
        currentUser={currentUser}
        users={users}
        apiToken={apiToken}
      >
        {children}
      </WlTemplatesBridge>
    </WlAssignmentsProvider>
  );
};

function WlTemplatesBridge({
  children,
  catalog,
  currentUser,
  users,
  apiToken,
}: {
  children: ReactNode;
  catalog: Omit<
    WolfAssignContextValue,
    | 'assignments'
    | 'completions'
    | 'setLogs'
    | 'coachTemplates'
    | 'assignProgramToAthlete'
    | 'updateAssignmentProgram'
    | 'removeAssignment'
    | 'restoreAssignmentVersion'
    | 'duplicateAssignment'
    | 'saveCoachTemplate'
    | 'deleteCoachTemplate'
    | 'assignFromTemplate'
    | 'toggleSessionComplete'
    | 'isSessionComplete'
    | 'toggleExerciseComplete'
    | 'isExerciseComplete'
    | 'toggleSetComplete'
    | 'updateSetLog'
    | 'isSetComplete'
    | 'getSetLog'
    | 'myAssignment'
    | 'myAssignments'
    | 'assignmentsLoading'
    | 'isTrackingPending'
    | 'isTrackingFailed'
    | 'setLogTrackingKey'
    | 'exerciseTrackingKey'
    | 'sessionTrackingKey'
    | 'wlAthletes'
    | 'athletesLoading'
    | 'canManageWlAthletes'
    | 'canEditWlRoster'
    | 'rosterForCoach'
    | 'reloadWlAthletesFromApi'
    | 'createWlAthlete'
    | 'updateWlAthlete'
    | 'deleteWlAthlete'
    | 'coachPrograms'
    | 'programsLoading'
    | 'programsView'
    | 'editingProgramId'
    | 'openProgramEditor'
    | 'closeProgramEditor'
    | 'reloadProgramsFromApi'
    | 'createCoachProgram'
    | 'updateCoachProgram'
    | 'deleteCoachProgram'
    | 'duplicateCoachProgram'
    | 'assignCoachProgramToAthletes'
    | 'getCoachProgramById'
  >;
  currentUser: WolfUser | undefined;
  users: WolfUser[];
  apiToken: string | null;
}) {
  const wl = useWlAssignments();
  return (
    <WlTemplatesProvider
      currentUser={currentUser}
      apiToken={apiToken}
      assignProgramToAthlete={wl.assignProgramToAthlete}
    >
      <WlAthletesProvider currentUser={currentUser} users={users} apiToken={apiToken}>
        <WlProgramsBridge catalog={catalog} currentUser={currentUser} apiToken={apiToken}>
          {children}
        </WlProgramsBridge>
      </WlAthletesProvider>
    </WlTemplatesProvider>
  );
}

function WlProgramsBridge({
  children,
  catalog,
  currentUser,
  apiToken,
}: {
  children: ReactNode;
  catalog: Parameters<typeof WolfAssignMergedProvider>[0]['catalog'];
  currentUser: WolfUser | undefined;
  apiToken: string | null;
}) {
  const wl = useWlAssignments();
  const athletesCtx = useWlAthletes();
  const athleteNameByProfileId = useMemo(
    () => Object.fromEntries(athletesCtx.athletes.map((a) => [a.id, a.name] as const)),
    [athletesCtx.athletes],
  );
  return (
    <WlProgramsProvider
      currentUser={currentUser}
      apiToken={apiToken}
      assignments={wl.assignments}
      completions={wl.completions}
      athleteNameByProfileId={athleteNameByProfileId}
      assignProgramToAthlete={wl.assignProgramToAthlete}
      reloadAssignmentsFromApi={wl.reloadAssignmentsFromApi}
    >
      <WolfAssignMergedProvider catalog={catalog}>{children}</WolfAssignMergedProvider>
    </WlProgramsProvider>
  );
}

function WolfAssignMergedProvider({
  children,
  catalog,
}: {
  children: ReactNode;
  catalog: Omit<
    WolfAssignContextValue,
    | 'assignments'
    | 'completions'
    | 'setLogs'
    | 'coachTemplates'
    | 'assignProgramToAthlete'
    | 'updateAssignmentProgram'
    | 'removeAssignment'
    | 'restoreAssignmentVersion'
    | 'duplicateAssignment'
    | 'saveCoachTemplate'
    | 'deleteCoachTemplate'
    | 'assignFromTemplate'
    | 'toggleSessionComplete'
    | 'isSessionComplete'
    | 'toggleExerciseComplete'
    | 'isExerciseComplete'
    | 'toggleSetComplete'
    | 'updateSetLog'
    | 'isSetComplete'
    | 'getSetLog'
    | 'myAssignment'
    | 'myAssignments'
    | 'assignmentsLoading'
    | 'isTrackingPending'
    | 'isTrackingFailed'
    | 'setLogTrackingKey'
    | 'exerciseTrackingKey'
    | 'sessionTrackingKey'
    | 'wlAthletes'
    | 'athletesLoading'
    | 'canManageWlAthletes'
    | 'canEditWlRoster'
    | 'rosterForCoach'
    | 'reloadWlAthletesFromApi'
    | 'createWlAthlete'
    | 'updateWlAthlete'
    | 'deleteWlAthlete'
    | 'coachPrograms'
    | 'programsLoading'
    | 'programsView'
    | 'editingProgramId'
    | 'openProgramEditor'
    | 'closeProgramEditor'
    | 'reloadProgramsFromApi'
    | 'createCoachProgram'
    | 'updateCoachProgram'
    | 'deleteCoachProgram'
    | 'duplicateCoachProgram'
    | 'assignCoachProgramToAthletes'
    | 'getCoachProgramById'
  >;
}) {
  const wl = useWlAssignments();
  const tpl = useWlTemplates();
  const athletesCtx = useWlAthletes();
  const programsCtx = useWlPrograms();
  const value: WolfAssignContextValue = {
    ...catalog,
    assignments: wl.assignments,
    completions: wl.completions,
    setLogs: wl.setLogs,
    coachTemplates: tpl.coachTemplates,
    assignProgramToAthlete: wl.assignProgramToAthlete,
    updateAssignmentProgram: wl.updateAssignmentProgram,
    removeAssignment: wl.removeAssignment,
    restoreAssignmentVersion: wl.restoreAssignmentVersion,
    duplicateAssignment: wl.duplicateAssignment,
    saveCoachTemplate: tpl.saveCoachTemplate,
    deleteCoachTemplate: tpl.deleteCoachTemplate,
    assignFromTemplate: tpl.assignFromTemplate,
    toggleSessionComplete: wl.toggleSessionComplete,
    isSessionComplete: wl.isSessionComplete,
    toggleExerciseComplete: wl.toggleExerciseComplete,
    isExerciseComplete: wl.isExerciseComplete,
    toggleSetComplete: wl.toggleSetComplete,
    updateSetLog: wl.updateSetLog,
    isSetComplete: wl.isSetComplete,
    getSetLog: wl.getSetLog,
    myAssignment: wl.myAssignment,
    myAssignments: wl.myAssignments,
    assignmentsLoading: wl.assignmentsLoading,
    isTrackingPending: wl.isTrackingPending,
    isTrackingFailed: wl.isTrackingFailed,
    setLogTrackingKey: wl.setLogTrackingKey,
    exerciseTrackingKey: wl.exerciseTrackingKey,
    sessionTrackingKey: wl.sessionTrackingKey,
    wlAthletes: athletesCtx.athletes,
    athletesLoading: athletesCtx.athletesLoading,
    canManageWlAthletes: athletesCtx.canManageWlAthletes,
    canEditWlRoster: athletesCtx.canEditWlRoster,
    rosterForCoach: (coach) => athletesCtx.rosterForCoach(coach),
    reloadWlAthletesFromApi: athletesCtx.reloadAthletesFromApi,
    createWlAthlete: athletesCtx.createAthlete,
    updateWlAthlete: athletesCtx.updateAthlete,
    deleteWlAthlete: athletesCtx.deleteAthlete,
    coachPrograms: programsCtx.coachPrograms,
    programsLoading: programsCtx.programsLoading,
    programsView: programsCtx.programsView,
    editingProgramId: programsCtx.editingProgramId,
    openProgramEditor: programsCtx.openProgramEditor,
    closeProgramEditor: programsCtx.closeProgramEditor,
    reloadProgramsFromApi: programsCtx.reloadProgramsFromApi,
    createCoachProgram: programsCtx.createProgram,
    updateCoachProgram: programsCtx.updateProgram,
    deleteCoachProgram: programsCtx.deleteProgram,
    duplicateCoachProgram: programsCtx.duplicateProgram,
    assignCoachProgramToAthletes: programsCtx.assignProgramToAthletes,
    getCoachProgramById: programsCtx.getProgramById,
  };
  return <WolfAssignContext.Provider value={value}>{children}</WolfAssignContext.Provider>;
}

export function useWolfAssign(): WolfAssignContextValue {
  const ctx = useContext(WolfAssignContext);
  if (!ctx) throw new Error('useWolfAssign requires WolfAssignProvider');
  return ctx;
}
