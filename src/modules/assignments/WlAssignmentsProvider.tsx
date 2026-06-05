import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  CoachWlProgramTemplate,
  GeneratedProgram,
  ProgramAssignment,
  SessionCompletion,
  SetCompletionLog,
} from '../../models/training';
import {
  completionMatches,
  isDayComplete,
  isExerciseComplete,
  isSessionMarkedComplete,
} from '../../utils/completionHelpers';
import { findSetLog } from '../../utils/athleteSetLogs';
import {
  assignmentApiFetch,
  isApiEnabled,
  websocketUrlFromApiBase,
  getApiBase,
} from './apiClient';
import {
  athleteUserIdForProfile,
  initialAssignmentsState,
  loadCompletionsFromLocal,
  loadSetLogsFromLocal,
  loadTemplatesFromLocal,
  normalizeAssignment,
  persistAssignmentsLocal,
  persistCompletionsLocal,
  persistSetLogsLocal,
  persistTemplatesLocal,
} from './assignmentStore';
import type { SetLogInput, WlAssignmentsContextValue, WlAssignmentsProviderProps } from './types';

const WlAssignmentsContext = createContext<WlAssignmentsContextValue | null>(null);

export function WlAssignmentsProvider({
  children,
  currentUser,
  athleteUser,
  users,
}: WlAssignmentsProviderProps) {
  const [assignments, setAssignments] = useState<ProgramAssignment[]>(() => initialAssignmentsState());
  const [completions, setCompletions] = useState<SessionCompletion[]>(() => loadCompletionsFromLocal());
  const [setLogs, setSetLogs] = useState<SetCompletionLog[]>(() => loadSetLogsFromLocal());
  const [coachTemplates, setCoachTemplates] = useState<CoachWlProgramTemplate[]>(() => loadTemplatesFromLocal());

  const loadAssignmentsFromApi = useCallback(async () => {
    if (!isApiEnabled()) return;
    try {
      const res = await assignmentApiFetch('/assignments');
      if (!res.ok) return;
      const list = (await res.json()) as ProgramAssignment[];
      if (Array.isArray(list)) setAssignments(list.map(normalizeAssignment));
    } catch {
      /* keep local */
    }
  }, []);

  const loadCompletionsFromApi = useCallback(async () => {
    if (!isApiEnabled()) return;
    try {
      const res = await assignmentApiFetch('/completions');
      if (!res.ok) return;
      const list = (await res.json()) as SessionCompletion[];
      if (Array.isArray(list)) setCompletions(list);
    } catch {
      /* keep local */
    }
  }, []);

  const loadSetLogsFromApi = useCallback(async () => {
    if (!isApiEnabled()) return;
    try {
      const res = await assignmentApiFetch('/set-logs');
      if (!res.ok) return;
      const list = (await res.json()) as SetCompletionLog[];
      if (Array.isArray(list)) setSetLogs(list);
    } catch {
      /* keep local */
    }
  }, []);

  useEffect(() => {
    if (!isApiEnabled()) return;
    void loadAssignmentsFromApi();
    void loadCompletionsFromApi();
    void loadSetLogsFromApi();
  }, [loadAssignmentsFromApi, loadCompletionsFromApi, loadSetLogsFromApi]);

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
          if (msg.event === 'assignments:changed') void loadAssignmentsFromApi();
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        const timer = window.setInterval(() => void loadAssignmentsFromApi(), 5000);
        window.setTimeout(() => window.clearInterval(timer), 30000);
      };
    } catch {
      /* ignore */
    }
    return () => {
      if (ws && ws.readyState < 2) ws.close();
    };
  }, [loadAssignmentsFromApi]);

  useEffect(() => {
    persistAssignmentsLocal(assignments);
  }, [assignments]);

  useEffect(() => {
    persistCompletionsLocal(completions);
  }, [completions]);

  useEffect(() => {
    persistSetLogsLocal(setLogs);
  }, [setLogs]);

  useEffect(() => {
    persistTemplatesLocal(coachTemplates);
  }, [coachTemplates]);

  const assignProgramToAthlete = useCallback(
    (program: ProgramAssignment['program'], athleteProfileId: string) => {
      const id = `asg-${Date.now()}`;
      const uid =
        users.find((u) => u.role === 'athlete' && u.linkedAthleteId === athleteProfileId)?.id ??
        athleteUserIdForProfile(athleteProfileId);
      const next: ProgramAssignment = {
        id,
        coachId:
          currentUser?.role === 'coach' || currentUser?.role === 'super_admin' ? currentUser.id : 'user-coach',
        ...(uid !== undefined ? { athleteUserId: uid } : {}),
        athleteProfileId,
        version: 1,
        program: { ...program, athleteId: athleteProfileId },
        versionHistory: [],
        assignedAt: new Date().toISOString(),
      };
      setAssignments((prev) => [...prev.filter((x) => x.athleteProfileId !== athleteProfileId), next]);
      if (isApiEnabled()) {
        void assignmentApiFetch('/assignments', {
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
            /* optimistic */
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
        body: JSON.stringify({ program }),
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
  }, []);

  const removeAssignment = useCallback((assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    setCompletions((prev) => prev.filter((c) => c.assignmentId !== assignmentId));
    setSetLogs((prev) => prev.filter((l) => l.assignmentId !== assignmentId));
    if (isApiEnabled()) {
      void assignmentApiFetch(`/assignments/${assignmentId}`, { method: 'DELETE' }).catch(() => {
        /* keep local */
      });
    }
  }, []);

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
        currentUser?.role === 'coach' || currentUser?.role === 'super_admin' ? currentUser.id : 'user-coach';
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
            !(c.assignmentId === assignmentId && c.weekNumber === weekNumber && c.dayNumber === dayNumber),
        );
        if (done) return filtered;
        return [...filtered, { assignmentId, weekNumber, dayNumber, completedAt: new Date().toISOString() }];
      });
    },
    [],
  );

  const toggleSessionComplete = useCallback(
    (assignmentId: string, weekNumber: number, dayNumber: number, exerciseCount = 0) => {
      applySessionToggleLocal(assignmentId, weekNumber, dayNumber, exerciseCount);
      if (!isApiEnabled()) return;
      void assignmentApiFetch('/completions/session-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, weekNumber, dayNumber, exerciseCount }),
      })
        .then((res) => {
          if (!res.ok) void loadCompletionsFromApi();
        })
        .catch(() => void loadCompletionsFromApi());
    },
    [applySessionToggleLocal, loadCompletionsFromApi],
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
          { assignmentId, weekNumber, dayNumber, exerciseIndex, completedAt: new Date().toISOString() },
        ];
      });
      if (!isApiEnabled()) return;
      void assignmentApiFetch('/completions/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, weekNumber, dayNumber, exerciseIndex }),
      })
        .then((res) => {
          if (!res.ok) void loadCompletionsFromApi();
        })
        .catch(() => void loadCompletionsFromApi());
    },
    [loadCompletionsFromApi],
  );

  const isExerciseCompleteFn = useCallback(
    (assignmentId: string, weekNumber: number, dayNumber: number, exerciseIndex: number) =>
      isExerciseComplete(completions, assignmentId, weekNumber, dayNumber, exerciseIndex) ||
      isSessionMarkedComplete(completions, assignmentId, weekNumber, dayNumber),
    [completions],
  );

  const setLogMatches = useCallback(
    (
      l: SetCompletionLog,
      assignmentId: string,
      weekNumber: number,
      dayNumber: number,
      exerciseIndex: number,
      schemeIndex: number,
      setInstance: number,
    ) =>
      l.assignmentId === assignmentId &&
      l.weekNumber === weekNumber &&
      l.dayNumber === dayNumber &&
      l.exerciseIndex === exerciseIndex &&
      l.schemeIndex === schemeIndex &&
      l.setInstance === setInstance,
    [],
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
      setSetLogs((prev) => {
        const idx = prev.findIndex((l) =>
          setLogMatches(
            l,
            input.assignmentId,
            input.weekNumber,
            input.dayNumber,
            input.exerciseIndex,
            input.schemeIndex,
            input.setInstance,
          ),
        );
        if (idx < 0) {
          return [...prev, { ...input, completedAt: new Date().toISOString() }];
        }
        const next = [...prev];
        next[idx] = {
          ...next[idx]!,
          actualKg: input.actualKg ?? next[idx]!.actualKg,
          actualReps: input.actualReps ?? next[idx]!.actualReps,
          actualSegmentReps: input.actualSegmentReps ?? next[idx]!.actualSegmentReps,
        };
        return next;
      });
      if (!isApiEnabled()) return;
      void assignmentApiFetch('/set-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
        .then((res) => {
          if (!res.ok) void loadSetLogsFromApi();
        })
        .catch(() => void loadSetLogsFromApi());
    },
    [setLogMatches, loadSetLogsFromApi],
  );

  const toggleSetCompleteFn = useCallback(
    (input: SetLogInput) => {
      setSetLogs((prev) => {
        const exists = prev.some((l) =>
          setLogMatches(
            l,
            input.assignmentId,
            input.weekNumber,
            input.dayNumber,
            input.exerciseIndex,
            input.schemeIndex,
            input.setInstance,
          ),
        );
        if (exists) {
          return prev.filter(
            (l) =>
              !setLogMatches(
                l,
                input.assignmentId,
                input.weekNumber,
                input.dayNumber,
                input.exerciseIndex,
                input.schemeIndex,
                input.setInstance,
              ),
          );
        }
        return [...prev, { ...input, completedAt: new Date().toISOString() }];
      });
      setCompletions((prev) =>
        prev.filter(
          (c) =>
            !(
              c.assignmentId === input.assignmentId &&
              c.weekNumber === input.weekNumber &&
              c.dayNumber === input.dayNumber &&
              c.exerciseIndex === input.exerciseIndex
            ),
        ),
      );
      if (!isApiEnabled()) return;
      void assignmentApiFetch('/set-logs/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
        .then((res) => {
          if (!res.ok) void loadSetLogsFromApi();
        })
        .catch(() => void loadSetLogsFromApi());
    },
    [setLogMatches, loadSetLogsFromApi],
  );

  const myAssignment = useMemo(() => {
    const linked = athleteUser?.linkedAthleteId;
    if (!linked) return undefined;
    const mine = assignments.filter((a) => a.athleteProfileId === linked);
    if (mine.length === 0) return undefined;
    return [...mine].sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0];
  }, [assignments, athleteUser?.linkedAthleteId]);

  const value: WlAssignmentsContextValue = {
    assignments,
    completions,
    setLogs,
    coachTemplates,
    assignProgramToAthlete,
    updateAssignmentProgram,
    removeAssignment,
    restoreAssignmentVersion,
    duplicateAssignment,
    saveCoachTemplate,
    deleteCoachTemplate,
    assignFromTemplate,
    toggleSessionComplete,
    isSessionComplete,
    toggleExerciseComplete,
    isExerciseComplete: isExerciseCompleteFn,
    toggleSetComplete: toggleSetCompleteFn,
    updateSetLog: updateSetLogFn,
    isSetComplete: isSetCompleteFn,
    getSetLog: getSetLogFn,
    myAssignment,
    reloadAssignmentsFromApi: loadAssignmentsFromApi,
  };

  return <WlAssignmentsContext.Provider value={value}>{children}</WlAssignmentsContext.Provider>;
}

export function useWlAssignments(): WlAssignmentsContextValue {
  const ctx = useContext(WlAssignmentsContext);
  if (!ctx) throw new Error('useWlAssignments requires WlAssignmentsProvider');
  return ctx;
}
