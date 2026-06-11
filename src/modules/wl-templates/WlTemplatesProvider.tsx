import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CoachWlProgramTemplate, GeneratedProgram } from '../../models/training';
import { cloneProgramForAthlete } from '../../models/coach-architecture';
import { subscribeRealtimeEvent } from '../assignments/realtimeClient';
import { isApiEnabled, wlTemplatesApiFetch } from './apiClient';
import { loadTemplatesFromLocal, persistTemplatesLocal } from './templateStore';
import type { WlTemplatesContextValue, WlTemplatesProviderProps } from './types';

const WlTemplatesContext = createContext<WlTemplatesContextValue | null>(null);
const REALTIME_EVENT = 'wl-templates:changed';
const STORAGE_IMPORT_KEY = 'wolf_wl_program_templates_v1';

export function WlTemplatesProvider({
  children,
  currentUser,
  apiToken,
  assignProgramToAthlete,
}: WlTemplatesProviderProps) {
  const apiMode = isApiEnabled();
  const importedRef = useRef(false);
  const [coachTemplates, setCoachTemplates] = useState<CoachWlProgramTemplate[]>(() =>
    apiMode ? [] : loadTemplatesFromLocal(),
  );
  const [templatesLoading, setTemplatesLoading] = useState(() => apiMode && Boolean(apiToken));

  const loadTemplatesFromApi = useCallback(async () => {
    if (!apiMode || !apiToken) {
      setTemplatesLoading(false);
      return;
    }
    setTemplatesLoading(true);
    try {
      const res = await wlTemplatesApiFetch('/wl-templates');
      if (!res.ok) {
        const cached = loadTemplatesFromLocal();
        if (cached.length) setCoachTemplates(cached);
        return;
      }
      const list = (await res.json()) as CoachWlProgramTemplate[];
      if (Array.isArray(list)) setCoachTemplates(list);
    } catch {
      const cached = loadTemplatesFromLocal();
      if (cached.length) setCoachTemplates(cached);
    } finally {
      setTemplatesLoading(false);
    }
  }, [apiMode, apiToken]);

  const importLegacyLocalTemplates = useCallback(async () => {
    if (!apiMode || !apiToken || importedRef.current) return;
    if (currentUser?.role !== 'coach' && currentUser?.role !== 'super_admin') return;
    let legacy: CoachWlProgramTemplate[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_IMPORT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CoachWlProgramTemplate[];
        if (Array.isArray(parsed)) legacy = parsed;
      }
    } catch {
      /* ignore */
    }
    const local = loadTemplatesFromLocal();
    const toImport = [...legacy, ...local].filter(
      (t, i, arr) => arr.findIndex((x) => x.id === t.id) === i,
    );
    if (toImport.length === 0) {
      importedRef.current = true;
      return;
    }
    for (const tpl of toImport) {
      if (tpl.coachId && currentUser?.role === 'coach' && tpl.coachId !== currentUser.id) continue;
      await wlTemplatesApiFetch('/wl-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tpl.name,
          program: tpl.program,
          sourceAssignmentId: tpl.sourceAssignmentId,
        }),
      }).catch(() => undefined);
    }
    importedRef.current = true;
    void loadTemplatesFromApi();
  }, [apiMode, apiToken, currentUser, loadTemplatesFromApi]);

  useEffect(() => {
    if (!apiMode || !apiToken) return;
    void loadTemplatesFromApi().then(() => importLegacyLocalTemplates());
  }, [apiMode, apiToken, loadTemplatesFromApi, importLegacyLocalTemplates]);

  useEffect(() => {
    if (!apiMode || !apiToken) return;
    return subscribeRealtimeEvent(REALTIME_EVENT, () => {
      void loadTemplatesFromApi();
    });
  }, [apiMode, apiToken, loadTemplatesFromApi]);

  useEffect(() => {
    if (apiMode) return;
    persistTemplatesLocal(coachTemplates);
  }, [apiMode, coachTemplates]);

  const saveCoachTemplate = useCallback(
    async (name: string, program: GeneratedProgram, sourceAssignmentId?: string): Promise<string> => {
      const coachId =
        currentUser?.role === 'coach' || currentUser?.role === 'super_admin'
          ? currentUser.id
          : 'user-coach-wl';
      if (!apiMode) {
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
      }
      if (!apiToken) return '';
      const res = await wlTemplatesApiFetch('/wl-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || program.name, program, sourceAssignmentId }),
      });
      if (!res.ok) return '';
      const saved = (await res.json()) as CoachWlProgramTemplate;
      setCoachTemplates((prev) => [saved, ...prev.filter((t) => t.id !== saved.id)]);
      return saved.id;
    },
    [apiMode, apiToken, currentUser],
  );

  const deleteCoachTemplate = useCallback(
    async (templateId: string): Promise<boolean> => {
      if (!apiMode) {
        setCoachTemplates((prev) => prev.filter((t) => t.id !== templateId));
        return true;
      }
      if (!apiToken) return false;
      const res = await wlTemplatesApiFetch(`/wl-templates/${templateId}`, { method: 'DELETE' });
      if (!res.ok) return false;
      setCoachTemplates((prev) => prev.filter((t) => t.id !== templateId));
      return true;
    },
    [apiMode, apiToken],
  );

  const assignFromTemplate = useCallback(
    async (templateId: string, athleteProfileId: string): Promise<string | null> => {
      const tpl = coachTemplates.find((t) => t.id === templateId);
      if (!tpl) return null;

      if (apiMode && apiToken) {
        const res = await wlTemplatesApiFetch(`/wl-templates/${templateId}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ athleteProfileId }),
        });
        if (!res.ok) return null;
        const saved = (await res.json()) as { id?: string };
        return saved.id ?? null;
      }

      const cloned = cloneProgramForAthlete(tpl.program, athleteProfileId, { name: tpl.name });
      return assignProgramToAthlete(cloned, athleteProfileId);
    },
    [coachTemplates, assignProgramToAthlete, apiMode, apiToken],
  );

  const value = useMemo<WlTemplatesContextValue>(
    () => ({
      coachTemplates,
      templatesLoading,
      saveCoachTemplate,
      deleteCoachTemplate,
      assignFromTemplate,
      reloadTemplatesFromApi: loadTemplatesFromApi,
    }),
    [
      coachTemplates,
      templatesLoading,
      saveCoachTemplate,
      deleteCoachTemplate,
      assignFromTemplate,
      loadTemplatesFromApi,
    ],
  );

  return <WlTemplatesContext.Provider value={value}>{children}</WlTemplatesContext.Provider>;
}

export function useWlTemplates(): WlTemplatesContextValue {
  const ctx = useContext(WlTemplatesContext);
  if (!ctx) throw new Error('useWlTemplates requires WlTemplatesProvider');
  return ctx;
}
