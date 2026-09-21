import type { Athlete } from '../../models/training';
import type { AthleteLiftLog, CreateAthleteLiftLogInput, PrLiftId } from '../../models/liftLogs';
import { PR_LIFTS } from '../../components/wl-prs/PrLiftCatalog';
import { epleyE1rm } from '../../components/wl-prs/e1rm';
import { coachIdForAthleteLocal, loadAthletesFromLocal, upsertCoachAthleteLocal } from '../wl-athletes/athleteStore';

const STORAGE_KEY = 'wolf_athlete_lift_logs_v1';

function readLogs(): AthleteLiftLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AthleteLiftLog[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLogs(logs: AthleteLiftLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    /* ignore quota */
  }
}

export function listLiftLogsLocal(athleteProfileId: string, liftId?: PrLiftId): AthleteLiftLog[] {
  return readLogs()
    .filter((log) => log.athleteProfileId === athleteProfileId && (!liftId || log.liftId === liftId))
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

export function createLiftLogLocal(
  athleteProfileId: string,
  input: CreateAthleteLiftLogInput,
  createdByUserId?: string,
): AthleteLiftLog {
  const log: AthleteLiftLog = {
    id: `liftlog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    athleteProfileId,
    liftId: input.liftId,
    kg: input.kg,
    reps: input.reps,
    loggedAt: input.loggedAt ?? new Date().toISOString(),
    notes: input.notes?.trim() || undefined,
    createdByUserId,
  };
  writeLogs([...readLogs(), log]);
  applyAnchorOneRmIfBest(athleteProfileId, input.liftId);
  return log;
}

export function deleteLiftLogLocal(athleteProfileId: string, logId: string): boolean {
  const all = readLogs();
  const target = all.find((log) => log.id === logId && log.athleteProfileId === athleteProfileId);
  if (!target) return false;
  writeLogs(all.filter((log) => log.id !== logId));
  applyAnchorOneRmIfBest(athleteProfileId, target.liftId);
  return true;
}

export function bestE1rmForLift(logs: AthleteLiftLog[], liftId: PrLiftId): number {
  let best = 0;
  for (const log of logs) {
    if (log.liftId !== liftId) continue;
    best = Math.max(best, epleyE1rm(log.kg, log.reps));
  }
  return best;
}

export function applyAnchorOneRmIfBest(athleteProfileId: string, liftId: PrLiftId): Athlete | null {
  const oneRmKey = PR_LIFTS[liftId]?.oneRmKey;
  if (!oneRmKey) return null;
  const profile = loadAthletesFromLocal().find((a) => a.id === athleteProfileId);
  const coachId = coachIdForAthleteLocal(athleteProfileId);
  if (!profile || !coachId) return null;
  const best = Math.round(bestE1rmForLift(listLiftLogsLocal(athleteProfileId, liftId), liftId));
  if (best <= 0 || best <= (profile.oneRM[oneRmKey] ?? 0)) return profile;
  const next: Athlete = { ...profile, oneRM: { ...profile.oneRM, [oneRmKey]: best } };
  upsertCoachAthleteLocal(coachId, next);
  return next;
}
