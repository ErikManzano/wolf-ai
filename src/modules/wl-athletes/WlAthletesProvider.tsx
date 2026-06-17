import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Athlete } from '../../models/training';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { subscribeRealtimeEvent } from '../assignments/realtimeClient';
import { isApiEnabled, preferLocalDataFallback, wlAthletesApiFetch } from './apiClient';
import {
  coachIdForAthleteLocal,
  loadCoachAthletesFromLocal,
  normalizeAthleteFromApi,
  removeCoachAthleteLocal,
  upsertCoachAthleteLocal,
} from './athleteStore';
import type { CreateWlAthleteInput, WlAthletesContextValue, WlAthletesProviderProps } from './types';

const WlAthletesContext = createContext<WlAthletesContextValue | null>(null);
const REALTIME_EVENT = 'wl-athletes:changed';

async function readApiError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error?.trim() || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

function coachScopeId(currentUser: WlAthletesProviderProps['currentUser']): string | null {
  if (!currentUser) return null;
  if (currentUser.role === 'coach') return currentUser.id;
  if (currentUser.role === 'super_admin') return 'user-coach-wl';
  return null;
}

export function WlAthletesProvider({
  children,
  currentUser,
  users: _users,
  apiToken,
}: WlAthletesProviderProps) {
  const { pushAlert } = useWolfAlert();
  const apiMode = isApiEnabled();
  const allowLocalFallback = preferLocalDataFallback();
  const scopedCoachId = coachScopeId(currentUser);
  const canManageWlAthletes = currentUser?.role === 'super_admin';
  const canEditWlRoster = currentUser?.role === 'coach' || canManageWlAthletes;

  const [athletes, setAthletes] = useState<Athlete[]>(() => {
    if (apiMode) return [];
    if (scopedCoachId) return loadCoachAthletesFromLocal(scopedCoachId);
    return [];
  });
  const [athletesLoading, setAthletesLoading] = useState(() => apiMode && Boolean(apiToken));

  const loadAthletesFromApi = useCallback(async () => {
    if (!apiMode || !apiToken) {
      setAthletesLoading(false);
      if (!apiMode && scopedCoachId) {
        setAthletes(loadCoachAthletesFromLocal(scopedCoachId));
      }
      return;
    }
    setAthletesLoading(true);
    try {
      const res = await wlAthletesApiFetch('/wl-athletes');
      if (!res.ok) {
        const detail = await readApiError(res);
        pushAlert({
          tone: 'warning',
          title: 'No se pudieron cargar los atletas',
          message: detail,
        });
        if (allowLocalFallback && scopedCoachId) setAthletes(loadCoachAthletesFromLocal(scopedCoachId));
        return;
      }
      const list = (await res.json()) as unknown[];
      if (Array.isArray(list)) setAthletes(list.map(normalizeAthleteFromApi));
    } catch {
      pushAlert({
        tone: 'warning',
        title: 'Sin conexión',
        message: 'No se pudieron cargar los atletas WL.',
      });
      if (allowLocalFallback && scopedCoachId) setAthletes(loadCoachAthletesFromLocal(scopedCoachId));
    } finally {
      setAthletesLoading(false);
    }
  }, [apiMode, apiToken, scopedCoachId, pushAlert, allowLocalFallback]);

  useEffect(() => {
    if (apiMode) {
      void loadAthletesFromApi();
      return;
    }
    if (scopedCoachId) setAthletes(loadCoachAthletesFromLocal(scopedCoachId));
  }, [apiMode, apiToken, scopedCoachId, loadAthletesFromApi]);

  useEffect(() => {
    if (!apiMode || !apiToken) return;
    return subscribeRealtimeEvent(REALTIME_EVENT, () => {
      void loadAthletesFromApi();
    });
  }, [apiMode, apiToken, loadAthletesFromApi]);

  /** Lista ya acotada al coach (API) o al coachId en localStorage — no filtrar por linkedAthleteId. */
  const rosterForCoach = useCallback(
    (coach: WlAthletesProviderProps['currentUser']) => {
      if (!coach) return athletes;
      if (coach.role === 'super_admin') return athletes;
      if (coach.role === 'coach') return athletes;
      return athletes;
    },
    [athletes],
  );

  const createAthlete = useCallback(
    async (input: CreateWlAthleteInput): Promise<Athlete | null> => {
      if (!canEditWlRoster) {
        pushAlert({
          tone: 'error',
          title: 'Sin permiso',
          message: 'No puedes crear perfiles WL.',
        });
        return null;
      }
      const coachId =
        currentUser?.role === 'coach' ? currentUser.id : (input.coachId ?? coachScopeId(currentUser));
      if (!coachId) {
        pushAlert({ tone: 'error', title: 'Sin coach', message: 'Indica el coach asignado.' });
        return null;
      }

      const payload: Athlete = {
        ...input,
        fatigueScore: input.fatigueScore ?? 40,
        readinessScore: input.readinessScore ?? 70,
      };

      if (!apiMode) {
        const next = upsertCoachAthleteLocal(coachId, payload);
        setAthletes(next);
        pushAlert({ tone: 'success', title: 'Atleta guardado', message: payload.name });
        return payload;
      }

      if (!apiToken) {
        pushAlert({
          tone: 'error',
          title: 'Sin sesión API',
          message: 'Vuelve a iniciar sesión antes de crear atletas.',
        });
        return null;
      }

      const res = await wlAthletesApiFetch('/wl-athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, coachId }),
      });

      if (!res.ok) {
        const detail = await readApiError(res);
        pushAlert({ tone: 'error', title: 'No se pudo crear el atleta', message: detail });
        return null;
      }

      const created = normalizeAthleteFromApi(await res.json());
      setAthletes((prev) => [...prev.filter((a) => a.id !== created.id), created]);
      pushAlert({ tone: 'success', title: 'Atleta creado', message: created.name });
      return created;
    },
    [apiMode, apiToken, currentUser, canEditWlRoster, pushAlert],
  );

  const updateAthlete = useCallback(
    async (id: string, patch: Partial<Athlete>): Promise<Athlete | null> => {
      if (!canEditWlRoster) {
        pushAlert({
          tone: 'error',
          title: 'Sin permiso',
          message: 'No puedes editar perfiles WL.',
        });
        return null;
      }
      if (currentUser?.role === 'coach') {
        const owned = athletes.some((a) => a.id === id);
        if (!owned) {
          pushAlert({ tone: 'error', title: 'Sin permiso', message: 'Ese atleta no está en tu roster.' });
          return null;
        }
      }
      if (!apiMode) {
        const existing = athletes.find((a) => a.id === id);
        if (!existing) return null;
        const ownerCoachId = coachIdForAthleteLocal(id) ?? coachScopeId(currentUser);
        if (!ownerCoachId) return null;
        const merged = { ...existing, ...patch, id };
        const next = upsertCoachAthleteLocal(ownerCoachId, merged);
        setAthletes(next);
        pushAlert({ tone: 'success', title: 'Atleta actualizado', message: merged.name });
        return merged;
      }

      if (!apiToken) return null;

      const res = await wlAthletesApiFetch(`/wl-athletes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const detail = await readApiError(res);
        pushAlert({ tone: 'error', title: 'No se pudo actualizar', message: detail });
        return null;
      }

      const saved = normalizeAthleteFromApi(await res.json());
      setAthletes((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
      pushAlert({ tone: 'success', title: 'Atleta actualizado', message: saved.name });
      return saved;
    },
    [apiMode, apiToken, currentUser, athletes, canEditWlRoster, pushAlert],
  );

  const deleteAthlete = useCallback(
    async (id: string): Promise<boolean> => {
      if (!canManageWlAthletes) {
        pushAlert({
          tone: 'error',
          title: 'Sin permiso',
          message: 'Solo el super admin puede eliminar perfiles WL.',
        });
        return false;
      }
      if (!apiMode) {
        const ownerCoachId = coachIdForAthleteLocal(id) ?? coachScopeId(currentUser);
        if (!ownerCoachId) return false;
        const next = removeCoachAthleteLocal(ownerCoachId, id);
        setAthletes(next);
        return true;
      }

      if (!apiToken) return false;

      const res = await wlAthletesApiFetch(`/wl-athletes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const detail = await readApiError(res);
        pushAlert({ tone: 'error', title: 'No se pudo eliminar', message: detail });
        return false;
      }

      setAthletes((prev) => prev.filter((a) => a.id !== id));
      return true;
    },
    [apiMode, apiToken, currentUser, canManageWlAthletes, pushAlert],
  );

  const value = useMemo<WlAthletesContextValue>(
    () => ({
      athletes,
      athletesLoading,
      canManageWlAthletes,
      canEditWlRoster,
      createAthlete,
      updateAthlete,
      deleteAthlete,
      reloadAthletesFromApi: loadAthletesFromApi,
      rosterForCoach,
    }),
    [athletes, athletesLoading, canManageWlAthletes, canEditWlRoster, createAthlete, updateAthlete, deleteAthlete, loadAthletesFromApi, rosterForCoach],
  );

  return <WlAthletesContext.Provider value={value}>{children}</WlAthletesContext.Provider>;
}

export function useWlAthletes(): WlAthletesContextValue {
  const ctx = useContext(WlAthletesContext);
  if (!ctx) throw new Error('useWlAthletes requires WlAthletesProvider');
  return ctx;
}
