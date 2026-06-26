import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  GeneratedProgram,
  ProgramAssignment,
  SessionCompletion,
  SetCompletionLog,
} from '../../models/training';
import { cloneProgramForAthlete } from '../../models/coach-architecture';
import {
  isDayComplete,
  isExerciseComplete,
  isSessionMarkedComplete,
} from '../../utils/completionHelpers';
import { findSetLog } from '../../utils/athleteSetLogs';
import {
  assignmentApiFetch,
  isApiEnabled,
  preferLocalDataFallback,
} from './apiClient';
import { subscribeAssignmentsRealtime, subscribeRealtimeEvent, PLAN_CHANGE_EVENT } from './realtimeClient';
import {
  athleteUserIdForProfile,
  initialAssignmentsState,
  loadAssignmentsFromLocal,
  loadCompletionsFromLocal,
  loadSetLogsFromLocal,
  normalizeAssignment,
  persistAssignmentsLocal,
  persistCompletionsLocal,
  persistSetLogsLocal,
} from './assignmentStore';
import { upsertAssignmentInList } from '../../utils/wlAssignmentRules';
import { filterAssignmentsForAthlete } from './athleteAssignmentFilter';
import { loadAthletesFromLocal } from '../wl-athletes/athleteStore';
import type { PlanChangeNotification, ProgramEditContext } from '../../models/notifications';
import type { SetLogInput, WlAssignmentsContextValue, WlAssignmentsProviderProps } from './types';
import { useWolfAlert } from '../../context/WolfAlertContext';
import {
  applyExerciseToggleLocal,
  applySessionToggleLocal,
  applySetLogUpdateLocal,
  applySetToggleLocal,
  createTrackingQueue,
  exerciseTrackingKey,
  sessionTrackingKey,
  setLogTrackingKey,
  snapshotTracking,
} from './trackingOptimistic';

const WlAssignmentsContext = createContext<WlAssignmentsContextValue | null>(null);
const FAILED_CLEAR_MS = 4000;

async function readApiError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error?.trim() || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export function WlAssignmentsProvider({
  children,
  currentUser,
  athleteUser,
  users,
  apiToken,
}: WlAssignmentsProviderProps) {
  const { pushAlert } = useWolfAlert();
  const apiMode = isApiEnabled();
  const allowLocalFallback = preferLocalDataFallback();
  const trackingQueueRef = useRef(createTrackingQueue());
  const failedTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const setLogsRef = useRef<SetCompletionLog[]>([]);
  const completionsRef = useRef<SessionCompletion[]>([]);

  const [assignments, setAssignments] = useState<ProgramAssignment[]>(() =>
    apiMode ? [] : initialAssignmentsState(),
  );
  const [assignmentsLoading, setAssignmentsLoading] = useState(() => apiMode && Boolean(apiToken));
  const [completions, setCompletions] = useState<SessionCompletion[]>(() =>
    apiMode ? [] : loadCompletionsFromLocal(),
  );
  const [setLogs, setSetLogs] = useState<SetCompletionLog[]>(() =>
    apiMode ? [] : loadSetLogsFromLocal(),
  );
  const [pendingTrackingKeys, setPendingTrackingKeys] = useState<Set<string>>(() => new Set());
  const [failedTrackingKeys, setFailedTrackingKeys] = useState<Set<string>>(() => new Set());
  const [planChangeNotifications, setPlanChangeNotifications] = useState<PlanChangeNotification[]>([]);
  const planChangeToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPlanChangeToastRef = useRef<PlanChangeNotification | null>(null);

  useEffect(() => {
    setLogsRef.current = setLogs;
  }, [setLogs]);

  useEffect(() => {
    completionsRef.current = completions;
  }, [completions]);

  const loadAssignmentsFromApi = useCallback(async () => {
    if (!apiMode || !apiToken) {
      setAssignmentsLoading(false);
      return;
    }
    setAssignmentsLoading(true);
    try {
      const res = await assignmentApiFetch('/assignments');
      if (!res.ok) {
        const detail = await readApiError(res);
        if (res.status === 401) {
          pushAlert({
            tone: 'warning',
            title: 'Sesión expirada',
            message: 'Vuelve a iniciar sesión para ver las rutinas asignadas.',
          });
        } else {
          pushAlert({
            tone: 'error',
            title: 'No se pudieron cargar las rutinas',
            message: detail,
          });
        }
        const cached = allowLocalFallback ? loadAssignmentsFromLocal() : null;
        if (cached?.length) setAssignments(cached.map(normalizeAssignment));
        return;
      }
      const list = (await res.json()) as ProgramAssignment[];
      if (Array.isArray(list)) {
        const normalized = list.map(normalizeAssignment);
        if (normalized.length > 0) {
          setAssignments(normalized);
          if (allowLocalFallback) persistAssignmentsLocal(normalized);
        } else if (allowLocalFallback) {
          const cached = loadAssignmentsFromLocal();
          if (cached?.length) setAssignments(cached);
        } else {
          setAssignments([]);
        }
      }
    } catch {
      const cached = allowLocalFallback ? loadAssignmentsFromLocal() : null;
      if (cached?.length) setAssignments(cached.map(normalizeAssignment));
      pushAlert({
        tone: 'error',
        title: 'Sin conexión al API',
        message: 'No se pudieron cargar las rutinas. ¿Está corriendo npm run server?',
      });
    } finally {
      setAssignmentsLoading(false);
    }
  }, [apiMode, apiToken, pushAlert, allowLocalFallback]);

  const loadCompletionsFromApi = useCallback(async () => {
    if (!apiMode || !apiToken) return;
    try {
      const res = await assignmentApiFetch('/completions');
      if (!res.ok) return;
      const list = (await res.json()) as SessionCompletion[];
      if (Array.isArray(list)) setCompletions(list);
    } catch {
      /* keep local */
    }
  }, [apiMode, apiToken]);

  const loadSetLogsFromApi = useCallback(async () => {
    if (!apiMode || !apiToken) return;
    try {
      const res = await assignmentApiFetch('/set-logs');
      if (!res.ok) return;
      const list = (await res.json()) as SetCompletionLog[];
      if (Array.isArray(list)) setSetLogs(list);
    } catch {
      /* keep local */
    }
  }, [apiMode, apiToken]);

  useEffect(() => {
    if (!apiMode || !apiToken) return;
    void loadAssignmentsFromApi();
    void loadCompletionsFromApi();
    void loadSetLogsFromApi();
  }, [
    apiMode,
    apiToken,
    athleteUser?.id,
    athleteUser?.linkedAthleteId,
    loadAssignmentsFromApi,
    loadCompletionsFromApi,
    loadSetLogsFromApi,
  ]);

  useEffect(() => {
    if (!apiMode || !apiToken) return;
    return subscribeAssignmentsRealtime(() => {
      void loadAssignmentsFromApi();
    });
  }, [apiMode, apiToken, loadAssignmentsFromApi]);

  const loadPlanChangeNotifications = useCallback(async () => {
    if (!apiMode || !apiToken) return;
    try {
      const res = await assignmentApiFetch('/notifications');
      if (!res.ok) return;
      const list = (await res.json()) as PlanChangeNotification[];
      if (Array.isArray(list)) setPlanChangeNotifications(list);
    } catch {
      /* keep cached */
    }
  }, [apiMode, apiToken]);

  useEffect(() => {
    if (!apiMode || !apiToken || !athleteUser) return;
    void loadPlanChangeNotifications();
  }, [apiMode, apiToken, athleteUser?.id, loadPlanChangeNotifications]);

  useEffect(() => {
    if (!apiMode || !apiToken || !athleteUser) return;
    return subscribeRealtimeEvent(PLAN_CHANGE_EVENT, (payload) => {
      const notification = payload as PlanChangeNotification;
      if (!notification?.id || notification.recipientUserId !== athleteUser.id) return;
      setPlanChangeNotifications((prev) => [
        notification,
        ...prev.filter((n) => n.id !== notification.id),
      ]);
      void loadAssignmentsFromApi();

      pendingPlanChangeToastRef.current = notification;
      if (planChangeToastTimerRef.current) clearTimeout(planChangeToastTimerRef.current);
      planChangeToastTimerRef.current = setTimeout(() => {
        const latest = pendingPlanChangeToastRef.current;
        if (!latest) return;
        const latestIsEs =
          typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('es');
        const latestSummary =
          (latestIsEs ? latest.summaryEs : latest.summaryEn)?.filter(Boolean) ?? [];
        const latestMessage =
          latestSummary.length > 0
            ? latestSummary.slice(0, 2).join(' · ')
            : latestIsEs
              ? latest.messageEs
              : latest.messageEn;
        const editCount = latest.editCount ?? 1;
        pushAlert({
          tone: 'info',
          title: latestIsEs ? 'Plan actualizado' : 'Plan updated',
          message:
            editCount > 1 && latestIsEs
              ? `${latestMessage} (${editCount} guardados)`
              : editCount > 1
                ? `${latestMessage} (${editCount} saves)`
                : latestMessage,
          durationMs: 5500,
        });
        pendingPlanChangeToastRef.current = null;
      }, 1200);
    });
  }, [apiMode, apiToken, athleteUser, pushAlert, loadAssignmentsFromApi]);

  useEffect(
    () => () => {
      if (planChangeToastTimerRef.current) clearTimeout(planChangeToastTimerRef.current);
    },
    [],
  );

  const markPlanChangeNotificationRead = useCallback(
    async (id: string) => {
      setPlanChangeNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
        ),
      );
      if (!apiMode || !apiToken) return;
      try {
        const res = await assignmentApiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
        if (!res.ok) return;
        const updated = (await res.json()) as PlanChangeNotification;
        setPlanChangeNotifications((prev) =>
          prev.map((n) => (n.id === updated.id ? updated : n)),
        );
      } catch {
        /* optimistic */
      }
    },
    [apiMode, apiToken],
  );

  const markAllPlanChangeNotificationsRead = useCallback(async () => {
    const unreadIds = planChangeNotifications.filter((n) => !n.readAt).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const now = new Date().toISOString();
    setPlanChangeNotifications((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: now })),
    );
    if (!apiMode || !apiToken) return;
    await Promise.all(
      unreadIds.map(async (id) => {
        try {
          const res = await assignmentApiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
          if (!res.ok) return;
          const updated = (await res.json()) as PlanChangeNotification;
          setPlanChangeNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n)),
          );
        } catch {
          /* optimistic */
        }
      }),
    );
  }, [apiMode, apiToken, planChangeNotifications]);

  const unreadPlanChangeCount = useMemo(
    () => planChangeNotifications.filter((n) => !n.readAt).length,
    [planChangeNotifications],
  );

  useEffect(() => {
    if (apiMode) return;
    persistAssignmentsLocal(assignments);
  }, [apiMode, assignments]);

  useEffect(() => {
    if (apiMode) return;
    persistCompletionsLocal(completions);
  }, [apiMode, completions]);

  useEffect(() => {
    if (apiMode) return;
    persistSetLogsLocal(setLogs);
  }, [apiMode, setLogs]);

  const assignProgramToAthlete = useCallback(
    async (
      program: ProgramAssignment['program'],
      athleteProfileId: string,
      coachProgramId?: string,
    ): Promise<string> => {
      const uid =
        users.find((u) => u.role === 'athlete' && u.linkedAthleteId === athleteProfileId)?.id ??
        athleteUserIdForProfile(athleteProfileId);
      const coachId =
        currentUser?.role === 'coach' || currentUser?.role === 'super_admin'
          ? currentUser.id
          : 'user-coach-wl';
      const clonedProgram = cloneProgramForAthlete(program, athleteProfileId);
      const payload = {
        coachId,
        ...(uid !== undefined ? { athleteUserId: uid } : {}),
        athleteProfileId,
        program: clonedProgram,
        ...(coachProgramId ? { coachProgramId } : {}),
      };

      if (!apiMode) {
        const id = `asg-${Date.now()}`;
        const next: ProgramAssignment = {
          id,
          coachId,
          ...(uid !== undefined ? { athleteUserId: uid } : {}),
          athleteProfileId,
          ...(coachProgramId ? { coachProgramId } : {}),
          version: 1,
          program: payload.program,
          versionHistory: [],
          assignedAt: new Date().toISOString(),
        };
        setAssignments((prev) => upsertAssignmentInList(prev, next));
        return id;
      }

      if (!apiToken) {
        const msg = 'Inicia sesión de nuevo antes de asignar la rutina.';
        pushAlert({ tone: 'error', title: 'Sin sesión API', message: msg });
        throw new Error(msg);
      }

      const res = await assignmentApiFetch('/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const detail = await readApiError(res);
        pushAlert({
          tone: 'error',
          title: 'No se pudo asignar la rutina',
          message: detail,
        });
        throw new Error(detail);
      }

      const saved = normalizeAssignment((await res.json()) as ProgramAssignment);
      setAssignments((prev) => upsertAssignmentInList(prev, saved));
      pushAlert({
        tone: 'success',
        title: 'Rutina asignada',
        message: 'El atleta la verá en «Mi plan WL» al instante.',
      });
      return saved.id;
    },
    [apiMode, apiToken, currentUser, users, pushAlert],
  );

  const updateAssignmentProgram = useCallback(
    (assignmentId: string, program: ProgramAssignment['program'], editContext?: ProgramEditContext) => {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId
            ? {
                ...a,
                version: (a.version ?? 1) + 1,
                program: { ...program, athleteId: a.athleteProfileId },
                versionHistory: [
                  ...(a.versionHistory ?? []),
                  { version: a.version ?? 1, editedAt: new Date().toISOString(), program: a.program },
                ],
              }
            : a,
        ),
      );
      if (isApiEnabled()) {
        void assignmentApiFetch(`/assignments/${assignmentId}/program`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ program, editContext }),
        })
          .then((r) => (r.ok ? (r.json() as Promise<ProgramAssignment>) : null))
          .then((updated) => {
            if (!updated) return;
            setAssignments((prev) => prev.map((a) => (a.id === updated.id ? normalizeAssignment(updated) : a)));
          })
          .catch(() => {
            /* optimistic */
          });
      }
    },
    [],
  );

  const removeAssignment = useCallback(async (assignmentId: string): Promise<boolean> => {
    const prevAssignments = assignments;
    const prevCompletions = completionsRef.current;
    const prevSetLogs = setLogsRef.current;

    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    setCompletions((prev) => prev.filter((c) => c.assignmentId !== assignmentId));
    setSetLogs((prev) => prev.filter((l) => l.assignmentId !== assignmentId));

    if (!apiMode) {
      return true;
    }

    try {
      const res = await assignmentApiFetch(`/assignments/${assignmentId}`, { method: 'DELETE' });
      if (!res.ok) {
        setAssignments(prevAssignments);
        setCompletions(prevCompletions);
        setSetLogs(prevSetLogs);
        const detail = await readApiError(res);
        pushAlert({
          tone: 'error',
          title: 'No se pudo quitar del plan',
          message: detail,
        });
        return false;
      }
      pushAlert({
        tone: 'success',
        title: 'Atleta quitado del plan',
        message: 'Ya no verá esta rutina en su cuenta.',
      });
      return true;
    } catch {
      setAssignments(prevAssignments);
      setCompletions(prevCompletions);
      setSetLogs(prevSetLogs);
      pushAlert({
        tone: 'error',
        title: 'Sin conexión al API',
        message: 'No se pudo quitar la asignación. Inténtalo de nuevo.',
      });
      return false;
    }
  }, [apiMode, assignments, pushAlert]);

  const restoreAssignmentVersion = useCallback(
    (assignmentId: string, version: number): boolean => {
      const asg = assignments.find((a) => a.id === assignmentId);
      if (!asg) return false;
      let targetProgram: GeneratedProgram | null = null;
      if (asg.version === version) targetProgram = asg.program;
      else {
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
    async (assignmentId: string, targetAthleteProfileId: string): Promise<string> => {
      const asg = assignments.find((a) => a.id === assignmentId);
      if (!asg) return '';
      return assignProgramToAthlete(asg.program, targetAthleteProfileId);
    },
    [assignments, assignProgramToAthlete],
  );

  const clearFailedTracking = useCallback((key: string) => {
    setFailedTrackingKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    const timer = failedTimersRef.current.get(key);
    if (timer) clearTimeout(timer);
    failedTimersRef.current.delete(key);
  }, []);

  const markFailedTracking = useCallback(
    (key: string) => {
      setFailedTrackingKeys((prev) => new Set(prev).add(key));
      const existing = failedTimersRef.current.get(key);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => clearFailedTracking(key), FAILED_CLEAR_MS);
      failedTimersRef.current.set(key, timer);
    },
    [clearFailedTracking],
  );

  const addPendingTracking = useCallback(
    (key: string) => {
      clearFailedTracking(key);
      setPendingTrackingKeys((prev) => new Set(prev).add(key));
    },
    [clearFailedTracking],
  );

  const removePendingTracking = useCallback((key: string) => {
    setPendingTrackingKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      failedTimersRef.current.forEach((timer) => clearTimeout(timer));
      failedTimersRef.current.clear();
    };
  }, []);

  const isTrackingPending = useCallback(
    (key: string) => pendingTrackingKeys.has(key),
    [pendingTrackingKeys],
  );

  const isTrackingFailed = useCallback(
    (key: string) => failedTrackingKeys.has(key),
    [failedTrackingKeys],
  );

  const runTrackingMutation = useCallback(
    (key: string, applyOptimistic: () => void, apiCall: () => Promise<Response>) => {
      if (!apiMode) {
        applyOptimistic();
        return;
      }
      void trackingQueueRef.current.enqueue(async () => {
        const snapshot = snapshotTracking(setLogsRef.current, completionsRef.current);
        addPendingTracking(key);
        applyOptimistic();
        try {
          const res = await apiCall();
          if (!res.ok) {
            setSetLogs(snapshot.setLogs);
            setCompletions(snapshot.completions);
            markFailedTracking(key);
            pushAlert({
              tone: 'warning',
              title: 'No se guardó el cambio',
              message: await readApiError(res),
            });
            return;
          }
          clearFailedTracking(key);
        } catch {
          setSetLogs(snapshot.setLogs);
          setCompletions(snapshot.completions);
          markFailedTracking(key);
          pushAlert({
            tone: 'warning',
            title: 'Sin conexión',
            message: 'No se pudo sincronizar. Toca de nuevo para reintentar.',
          });
        } finally {
          removePendingTracking(key);
        }
      });
    },
    [
      apiMode,
      addPendingTracking,
      removePendingTracking,
      markFailedTracking,
      clearFailedTracking,
      pushAlert,
    ],
  );

  const toggleSessionComplete = useCallback(
    (assignmentId: string, weekNumber: number, dayNumber: number, exerciseCount = 0) => {
      const key = sessionTrackingKey(assignmentId, weekNumber, dayNumber);
      runTrackingMutation(
        key,
        () => {
          setCompletions((prev) =>
            applySessionToggleLocal(prev, assignmentId, weekNumber, dayNumber, exerciseCount),
          );
        },
        () =>
          assignmentApiFetch('/completions/session-toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignmentId, weekNumber, dayNumber, exerciseCount }),
          }),
      );
    },
    [runTrackingMutation],
  );

  const isSessionComplete = useCallback(
    (assignmentId: string, weekNumber: number, dayNumber: number, exerciseCount = 0) =>
      isDayComplete(completions, assignmentId, weekNumber, dayNumber, exerciseCount),
    [completions],
  );

  const toggleExerciseComplete = useCallback(
    (assignmentId: string, weekNumber: number, dayNumber: number, exerciseIndex: number) => {
      const key = exerciseTrackingKey(assignmentId, weekNumber, dayNumber, exerciseIndex);
      runTrackingMutation(
        key,
        () => {
          setCompletions((prev) =>
            applyExerciseToggleLocal(prev, assignmentId, weekNumber, dayNumber, exerciseIndex),
          );
        },
        () =>
          assignmentApiFetch('/completions/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignmentId, weekNumber, dayNumber, exerciseIndex }),
          }),
      );
    },
    [runTrackingMutation],
  );

  const isExerciseCompleteFn = useCallback(
    (assignmentId: string, weekNumber: number, dayNumber: number, exerciseIndex: number) =>
      isExerciseComplete(completions, assignmentId, weekNumber, dayNumber, exerciseIndex) ||
      isSessionMarkedComplete(completions, assignmentId, weekNumber, dayNumber),
    [completions],
  );

  const getSetLogFn = useCallback(
    (
      assignmentId: string,
      weekNumber: number,
      dayNumber: number,
      exerciseIndex: number,
      schemeIndex: number,
      setInstance: number,
    ) => findSetLog(setLogs, assignmentId, weekNumber, dayNumber, exerciseIndex, schemeIndex, setInstance),
    [setLogs],
  );

  const isSetCompleteFn = useCallback(
    (
      assignmentId: string,
      weekNumber: number,
      dayNumber: number,
      exerciseIndex: number,
      schemeIndex: number,
      setInstance: number,
    ) => Boolean(getSetLogFn(assignmentId, weekNumber, dayNumber, exerciseIndex, schemeIndex, setInstance)),
    [getSetLogFn],
  );

  const updateSetLogFn = useCallback(
    (input: SetLogInput) => {
      const key = setLogTrackingKey(input);
      runTrackingMutation(
        key,
        () => {
          setSetLogs((prev) => applySetLogUpdateLocal(prev, input));
        },
        () =>
          assignmentApiFetch('/set-logs', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          }),
      );
    },
    [runTrackingMutation],
  );

  const toggleSetCompleteFn = useCallback(
    (input: SetLogInput) => {
      const key = setLogTrackingKey(input);
      runTrackingMutation(
        key,
        () => {
          const next = applySetToggleLocal(setLogsRef.current, completionsRef.current, input);
          setSetLogs(next.setLogs);
          setCompletions(next.completions);
        },
        () =>
          assignmentApiFetch('/set-logs/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          }),
      );
    },
    [runTrackingMutation],
  );

  const myAssignments = useMemo(() => {
    const roster = loadAthletesFromLocal();
    return filterAssignmentsForAthlete(assignments, athleteUser, roster).sort(
      (a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime(),
    );
  }, [assignments, athleteUser]);

  const myAssignment = useMemo(() => myAssignments[0], [myAssignments]);

  const value: WlAssignmentsContextValue = {
    assignments,
    completions,
    setLogs,
    assignProgramToAthlete,
    updateAssignmentProgram,
    removeAssignment,
    restoreAssignmentVersion,
    duplicateAssignment,
    toggleSessionComplete,
    isSessionComplete,
    toggleExerciseComplete,
    isExerciseComplete: isExerciseCompleteFn,
    toggleSetComplete: toggleSetCompleteFn,
    updateSetLog: updateSetLogFn,
    isSetComplete: isSetCompleteFn,
    getSetLog: getSetLogFn,
    myAssignment,
    myAssignments,
    assignmentsLoading,
    isTrackingPending,
    isTrackingFailed,
    setLogTrackingKey,
    exerciseTrackingKey,
    sessionTrackingKey,
    reloadAssignmentsFromApi: loadAssignmentsFromApi,
    planChangeNotifications,
    unreadPlanChangeCount,
    loadPlanChangeNotifications,
    markPlanChangeNotificationRead,
    markAllPlanChangeNotificationsRead,
  };

  return <WlAssignmentsContext.Provider value={value}>{children}</WlAssignmentsContext.Provider>;
}

export function useWlAssignments(): WlAssignmentsContextValue {
  const ctx = useContext(WlAssignmentsContext);
  if (!ctx) throw new Error('useWlAssignments requires WlAssignmentsProvider');
  return ctx;
}
