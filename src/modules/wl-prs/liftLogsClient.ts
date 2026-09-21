import type { AthleteLiftLog, CreateAthleteLiftLogInput } from '../../models/liftLogs';
import { isApiEnabled, preferLocalDataFallback, wlAthletesApiFetch } from '../wl-athletes/apiClient';
import { createLiftLogLocal, deleteLiftLogLocal, listLiftLogsLocal } from './liftLogStore';

function parseLogs(data: unknown): AthleteLiftLog[] {
  return Array.isArray(data) ? (data as AthleteLiftLog[]) : [];
}

export async function listAthleteLiftLogs(athleteId: string): Promise<AthleteLiftLog[]> {
  if (isApiEnabled()) {
    try {
      const res = await wlAthletesApiFetch(`/wl-athletes/${athleteId}/lift-logs`);
      if (res.ok) return parseLogs(await res.json());
    } catch {
      /* fall through */
    }
    if (!preferLocalDataFallback()) return [];
  }
  return listLiftLogsLocal(athleteId);
}

export async function createAthleteLiftLog(
  athleteId: string,
  input: CreateAthleteLiftLogInput,
  createdByUserId?: string,
): Promise<AthleteLiftLog | null> {
  if (isApiEnabled()) {
    try {
      const res = await wlAthletesApiFetch(`/wl-athletes/${athleteId}/lift-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const json = (await res.json()) as AthleteLiftLog | { log?: AthleteLiftLog };
        return (json as { log?: AthleteLiftLog }).log ?? (json as AthleteLiftLog);
      }
    } catch {
      /* fall through */
    }
    if (!preferLocalDataFallback()) return null;
  }
  return createLiftLogLocal(athleteId, input, createdByUserId);
}

export async function deleteAthleteLiftLog(athleteId: string, logId: string): Promise<boolean> {
  if (isApiEnabled()) {
    try {
      const res = await wlAthletesApiFetch(`/wl-athletes/${athleteId}/lift-logs/${logId}`, {
        method: 'DELETE',
      });
      if (res.status === 204 || res.ok) return true;
    } catch {
      /* fall through */
    }
    if (!preferLocalDataFallback()) return false;
  }
  return deleteLiftLogLocal(athleteId, logId);
}
