import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CoachProgram, CoachProgramRow, CoachProgramStatus } from '../../models/coach-architecture';
import type { ProgramAssignment, SessionCompletion } from '../../models/training';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { filterAthletesForProgramAssign, getEnrollmentsForCoachProgram } from '../../utils/wlAssignmentRules';
import { subscribeRealtimeEvent } from '../assignments/realtimeClient';
import { isApiEnabled, preferLocalDataFallback, wlProgramsApiFetch } from './apiClient';
import {
  createCoachProgramLocal,
  loadCoachProgramsLocal,
  removeCoachProgramLocal,
  upsertCoachProgramLocal,
} from './programStore';
import type { WlProgramsContextValue, WlProgramsProviderProps } from './types';

const WlProgramsContext = createContext<WlProgramsContextValue | null>(null);
const REALTIME_EVENT = 'coach-programs:changed';

async function readApiError(res: Response): Promise<string> {
  if (res.status === 504) {
    return 'El servidor tardó demasiado (504). Espera unos segundos y vuelve a intentar.';
  }
  try {
    const j = (await res.json()) as { error?: string };
    const detail = j.error?.trim() || `HTTP ${res.status}`;
    if (res.status === 404 && detail === `HTTP ${res.status}`) {
      return 'Ruta /coach-programs no encontrada. Reinicia el API (`npm run server`) con el código actual.';
    }
    if (res.status === 404) {
      return `${detail} Si persiste, reinicia el API en el puerto 4000.`;
    }
    return detail;
  } catch {
    if (res.status === 404) {
      return 'Ruta /coach-programs no encontrada. Reinicia el API (`npm run server`) con el código actual.';
    }
    if (res.status === 504) {
      return 'El servidor tardó demasiado (504). Espera unos segundos y vuelve a intentar.';
    }
    return `HTTP ${res.status}`;
  }
}

function mergeSavedProgram(prev: CoachProgramRow[], saved: CoachProgram): CoachProgramRow[] {
  const index = prev.findIndex((program) => program.id === saved.id);
  if (index < 0) return prev;
  const current = prev[index]!;
  const next: CoachProgramRow = {
    ...current,
    ...saved,
    enrolledAthletes: current.enrolledAthletes,
    avgAdherencePct: current.avgAdherencePct,
  };
  const copy = [...prev];
  copy[index] = next;
  return copy;
}

function coachScopeId(currentUser: WlProgramsProviderProps['currentUser']): string | null {
  if (!currentUser) return null;
  if (currentUser.role === 'coach') return currentUser.id;
  if (currentUser.role === 'super_admin') return 'user-coach-wl';
  return null;
}

function enrichProgramsWithAssignments(
  programs: CoachProgramRow[],
  assignments: ProgramAssignment[],
  completions: SessionCompletion[],
  nameByProfileId: Record<string, string>,
): CoachProgramRow[] {
  return programs.map((program) => {
    const enrolledAthletes = getEnrollmentsForCoachProgram(
      program.id,
      assignments,
      completions,
      nameByProfileId,
    );
    const adherenceValues = enrolledAthletes
      .map((e) => e.completionPct)
      .filter((v): v is number => v != null);
    return {
      ...program,
      enrolledAthletes,
      avgAdherencePct:
        adherenceValues.length > 0
          ? Math.round(adherenceValues.reduce((s, v) => s + v, 0) / adherenceValues.length)
          : undefined,
    };
  });
}

export function WlProgramsProvider({
  children,
  currentUser,
  apiToken,
  assignments,
  completions,
  athleteNameByProfileId,
  assignProgramToAthlete,
  reloadAssignmentsFromApi,
}: WlProgramsProviderProps & {
  assignments: ProgramAssignment[];
  completions: SessionCompletion[];
  athleteNameByProfileId: Record<string, string>;
}) {
  const { pushAlert } = useWolfAlert();
  const apiMode = isApiEnabled();
  const allowLocalFallback = preferLocalDataFallback();
  const scopedCoachId = coachScopeId(currentUser);

  const [rawPrograms, setRawPrograms] = useState<CoachProgramRow[]>(() => {
    if (apiMode || !scopedCoachId) return [];
    return loadCoachProgramsLocal(scopedCoachId);
  });
  const [programsLoading, setProgramsLoading] = useState(() => apiMode && Boolean(apiToken));
  const [programsView, setProgramsView] = useState<'hub' | 'editor'>('hub');
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);

  const coachPrograms = useMemo(
    () => enrichProgramsWithAssignments(rawPrograms, assignments, completions, athleteNameByProfileId),
    [rawPrograms, assignments, completions, athleteNameByProfileId],
  );

  const loadProgramsFromApi = useCallback(async () => {
    if (!apiMode || !apiToken) {
      setProgramsLoading(false);
      if (!apiMode && scopedCoachId) setRawPrograms(loadCoachProgramsLocal(scopedCoachId));
      return;
    }
    setProgramsLoading(true);
    try {
      const res = await wlProgramsApiFetch('/coach-programs');
      if (!res.ok) {
        const detail = await readApiError(res);
        pushAlert({ tone: 'warning', title: 'No se pudieron cargar los programas', message: detail });
        if (allowLocalFallback && scopedCoachId) setRawPrograms(loadCoachProgramsLocal(scopedCoachId));
        return;
      }
      const list = (await res.json()) as CoachProgramRow[];
      if (Array.isArray(list)) setRawPrograms(list);
    } catch {
      pushAlert({ tone: 'warning', title: 'Sin conexión', message: 'No se pudieron cargar los programas.' });
      if (allowLocalFallback && scopedCoachId) setRawPrograms(loadCoachProgramsLocal(scopedCoachId));
    } finally {
      setProgramsLoading(false);
    }
  }, [apiMode, apiToken, scopedCoachId, pushAlert, allowLocalFallback]);

  useEffect(() => {
    if (apiMode) void loadProgramsFromApi();
    else if (scopedCoachId) setRawPrograms(loadCoachProgramsLocal(scopedCoachId));
  }, [apiMode, apiToken, scopedCoachId, loadProgramsFromApi]);

  useEffect(() => {
    if (!apiMode || !apiToken) return;
    return subscribeRealtimeEvent(REALTIME_EVENT, () => {
      void loadProgramsFromApi();
    });
  }, [apiMode, apiToken, loadProgramsFromApi]);

  const openProgramEditor = useCallback((programId: string | null) => {
    setEditingProgramId(programId);
    setProgramsView('editor');
  }, []);

  const closeProgramEditor = useCallback(() => {
    setEditingProgramId(null);
    setProgramsView('hub');
  }, []);

  const createProgram = useCallback(
    async (name: string, program?: CoachProgram['program']): Promise<CoachProgram | null> => {
      if (!scopedCoachId) return null;
      if (!apiMode) {
        const created = createCoachProgramLocal(scopedCoachId, name);
        if (program) created.program = program;
        upsertCoachProgramLocal(created);
        setRawPrograms(loadCoachProgramsLocal(scopedCoachId));
        return created;
      }
      if (!apiToken) return null;
      const res = await wlProgramsApiFetch('/coach-programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, program }),
      });
      if (!res.ok) {
        pushAlert({ tone: 'error', title: 'Error', message: await readApiError(res) });
        return null;
      }
      const created = (await res.json()) as CoachProgram;
      await loadProgramsFromApi();
      return created;
    },
    [apiMode, apiToken, scopedCoachId, pushAlert, loadProgramsFromApi],
  );

  const updateProgram = useCallback(
    async (
      id: string,
      patch: { name?: string; program?: CoachProgram['program']; status?: CoachProgramStatus },
    ): Promise<CoachProgram | null> => {
      if (!scopedCoachId) return null;
      if (!apiMode) {
        const existing = rawPrograms.find((p) => p.id === id);
        if (!existing) return null;
        const updated: CoachProgram = {
          ...existing,
          name: patch.name ?? existing.name,
          program: patch.program ?? existing.program,
          status: patch.status ?? existing.status,
          updatedAt: new Date().toISOString(),
        };
        upsertCoachProgramLocal(updated);
        setRawPrograms(loadCoachProgramsLocal(scopedCoachId));
        return updated;
      }
      if (!apiToken) return null;
      const res = await wlProgramsApiFetch(`/coach-programs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        pushAlert({ tone: 'error', title: 'Error', message: await readApiError(res) });
        return null;
      }
      const saved = (await res.json()) as CoachProgram;
      setRawPrograms((prev) => mergeSavedProgram(prev, saved));
      return saved;
    },
    [apiMode, apiToken, scopedCoachId, rawPrograms, pushAlert],
  );

  const deleteProgram = useCallback(
    async (id: string): Promise<boolean> => {
      if (!scopedCoachId) return false;
      if (!apiMode) {
        removeCoachProgramLocal(scopedCoachId, id);
        setRawPrograms(loadCoachProgramsLocal(scopedCoachId));
        return true;
      }
      if (!apiToken) return false;
      const res = await wlProgramsApiFetch(`/coach-programs/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        pushAlert({ tone: 'error', title: 'Error', message: await readApiError(res) });
        return false;
      }
      await loadProgramsFromApi();
      return true;
    },
    [apiMode, apiToken, scopedCoachId, pushAlert, loadProgramsFromApi],
  );

  const duplicateProgram = useCallback(
    async (id: string): Promise<CoachProgram | null> => {
      if (!apiMode) {
        const source = rawPrograms.find((p) => p.id === id);
        if (!source || !scopedCoachId) return null;
        const created = createCoachProgramLocal(scopedCoachId, `${source.name} (copia)`);
        created.program = structuredClone(source.program);
        upsertCoachProgramLocal(created);
        setRawPrograms(loadCoachProgramsLocal(scopedCoachId));
        return created;
      }
      if (!apiToken) return null;
      const res = await wlProgramsApiFetch(`/coach-programs/${id}/duplicate`, { method: 'POST' });
      if (!res.ok) {
        pushAlert({ tone: 'error', title: 'Error', message: await readApiError(res) });
        return null;
      }
      const dup = (await res.json()) as CoachProgram;
      await loadProgramsFromApi();
      return dup;
    },
    [apiMode, apiToken, scopedCoachId, rawPrograms, pushAlert, loadProgramsFromApi],
  );

  const assignProgramToAthletes = useCallback(
    async (programId: string, athleteProfileIds: string[]): Promise<string[]> => {
      const source = rawPrograms.find((p) => p.id === programId);
      if (!source) return [];

      const { toAssign, skippedAlreadyOnProgram } = filterAthletesForProgramAssign(
        programId,
        athleteProfileIds,
        assignments,
      );

      if (toAssign.length === 0) {
        if (skippedAlreadyOnProgram.length > 0) {
          pushAlert({
            tone: 'info',
            title: 'Sin cambios',
            message: 'Los atletas seleccionados ya tienen este programa asignado.',
          });
        }
        return [];
      }

      if (!apiMode && assignProgramToAthlete) {
        const ids: string[] = [];
        for (const athleteProfileId of toAssign) {
          ids.push(await assignProgramToAthlete(source.program, athleteProfileId, programId));
        }
        if (source.status === 'draft') {
          await updateProgram(programId, { status: 'published' });
        }
        const replaced = toAssign.filter((id) =>
          assignments.some(
            (a) =>
              a.athleteProfileId === id &&
              a.coachProgramId &&
              a.coachProgramId !== programId,
          ),
        ).length;
        pushAlert({
          tone: 'success',
          title: 'Programa asignado',
          message:
            replaced > 0
              ? `${ids.length} atleta(s) con este plan. ${replaced} ya tenían otros planes activos en paralelo.`
              : `${ids.length} atleta(s) con este plan activo.`,
        });
        await reloadAssignmentsFromApi?.();
        return ids;
      }

      if (!apiMode) {
        pushAlert({
          tone: 'warning',
          title: 'Modo local',
          message: 'Activa la API para asignar programas a atletas.',
        });
        return [];
      }
      if (!apiToken) return [];
      const res = await wlProgramsApiFetch(`/coach-programs/${programId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteProfileIds: toAssign }),
      });
      if (!res.ok) {
        pushAlert({ tone: 'error', title: 'No se pudo asignar', message: await readApiError(res) });
        return [];
      }
      const saved = (await res.json()) as { id: string }[];
      const parallel = toAssign.filter((id) =>
        assignments.some(
          (a) =>
            a.athleteProfileId === id &&
            a.coachProgramId &&
            a.coachProgramId !== programId,
        ),
      ).length;
      pushAlert({
        tone: 'success',
        title: 'Programa asignado',
        message:
          parallel > 0
            ? `${saved.length} atleta(s) con este plan. ${parallel} ya tenían otros planes activos en paralelo.`
            : `${saved.length} atleta(s) con este plan activo.`,
      });
      await loadProgramsFromApi();
      await reloadAssignmentsFromApi?.();
      return saved.map((a) => a.id);
    },
    [apiMode, apiToken, rawPrograms, assignments, assignProgramToAthlete, updateProgram, pushAlert, loadProgramsFromApi, reloadAssignmentsFromApi],
  );

  const getProgramById = useCallback(
    (id: string) => coachPrograms.find((p) => p.id === id),
    [coachPrograms],
  );

  const value = useMemo<WlProgramsContextValue>(
    () => ({
      coachPrograms,
      programsLoading,
      programsView,
      editingProgramId,
      setProgramsView,
      openProgramEditor,
      closeProgramEditor,
      reloadProgramsFromApi: loadProgramsFromApi,
      createProgram,
      updateProgram,
      deleteProgram,
      duplicateProgram,
      assignProgramToAthletes,
      getProgramById,
    }),
    [
      coachPrograms,
      programsLoading,
      programsView,
      editingProgramId,
      openProgramEditor,
      closeProgramEditor,
      loadProgramsFromApi,
      createProgram,
      updateProgram,
      deleteProgram,
      duplicateProgram,
      assignProgramToAthletes,
      getProgramById,
    ],
  );

  return <WlProgramsContext.Provider value={value}>{children}</WlProgramsContext.Provider>;
}

export function useWlPrograms(): WlProgramsContextValue {
  const ctx = useContext(WlProgramsContext);
  if (!ctx) throw new Error('useWlPrograms requires WlProgramsProvider');
  return ctx;
}
