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
import { isApiEnabled, wlAthletesApiFetch } from './apiClient';
import {
  loadCoachAthletesFromLocal,
  normalizeAthleteFromApi,
  removeCoachAthleteLocal,
  upsertCoachAthleteLocal,
} from './athleteStore';
import type { WlAthletesContextValue, WlAthletesProviderProps } from './types';

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
  const scopedCoachId = coachScopeId(currentUser);

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
        if (scopedCoachId) setAthletes(loadCoachAthletesFromLocal(scopedCoachId));
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
      if (scopedCoachId) setAthletes(loadCoachAthletesFromLocal(scopedCoachId));
    } finally {
      setAthletesLoading(false);
    }
  }, [apiMode, apiToken, scopedCoachId, pushAlert]);

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
    async (
      input: Omit<Athlete, 'fatigueScore' | 'readinessScore'> &
        Partial<Pick<Athlete, 'fatigueScore' | 'readinessScore'>>,
    ): Promise<Athlete | null> => {
      const coachId = coachScopeId(currentUser);
      if (!coachId) {
        pushAlert({ tone: 'error', title: 'Sin coach', message: 'Inicia sesión como coach.' });
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
        body: JSON.stringify(payload),
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
    [apiMode, apiToken, currentUser, pushAlert],
  );

  const updateAthlete = useCallback(
    async (id: string, patch: Partial<Athlete>): Promise<Athlete | null> => {
      const coachId = coachScopeId(currentUser);
      if (!coachId) return null;

      if (!apiMode) {
        const existing = athletes.find((a) => a.id === id);
        if (!existing) return null;
        const merged = { ...existing, ...patch, id };
        const next = upsertCoachAthleteLocal(coachId, merged);
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
    [apiMode, apiToken, currentUser, athletes, pushAlert],
  );

  const deleteAthlete = useCallback(
    async (id: string): Promise<boolean> => {
      const coachId = coachScopeId(currentUser);
      if (!coachId) return false;

      if (!apiMode) {
        const next = removeCoachAthleteLocal(coachId, id);
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
    [apiMode, apiToken, currentUser, pushAlert],
  );

  const value = useMemo<WlAthletesContextValue>(
    () => ({
      athletes,
      athletesLoading,
      createAthlete,
      updateAthlete,
      deleteAthlete,
      reloadAthletesFromApi: loadAthletesFromApi,
      rosterForCoach,
    }),
    [athletes, athletesLoading, createAthlete, updateAthlete, deleteAthlete, loadAthletesFromApi, rosterForCoach],
  );

  return <WlAthletesContext.Provider value={value}>{children}</WlAthletesContext.Provider>;
}

export function useWlAthletes(): WlAthletesContextValue {
  const ctx = useContext(WlAthletesContext);
  if (!ctx) throw new Error('useWlAthletes requires WlAthletesProvider');
  return ctx;
}
