import { mockAthletes, mockUsers } from '../../data/loadMockData';
import type { Athlete } from '../../models/training';

const STORAGE_KEY = 'wolf_wl_athlete_records_v1';

export type WlAthleteRecord = {
  coachId: string;
  profile: Athlete;
};

function coachIdForSeedAthlete(athleteId: string): string {
  const linked = mockUsers.find((u) => u.linkedAthleteId === athleteId && u.coachId);
  return linked?.coachId ?? 'user-coach-wl';
}

function seedRecords(): WlAthleteRecord[] {
  return mockAthletes.map((profile) => ({
    coachId: coachIdForSeedAthlete(profile.id),
    profile,
  }));
}

function readRecords(): WlAthleteRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedRecords();
    const parsed = JSON.parse(raw) as WlAthleteRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedRecords();
    return parsed;
  } catch {
    return seedRecords();
  }
}

export function persistAthleteRecords(records: WlAthleteRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* ignore */
  }
}

/** All profiles (legacy helper). */
export function loadAthletesFromLocal(): Athlete[] {
  return readRecords().map((r) => r.profile);
}

/** Profiles owned by a coach (modo sin API). */
export function loadCoachAthletesFromLocal(coachId: string): Athlete[] {
  return readRecords()
    .filter((r) => r.coachId === coachId)
    .map((r) => r.profile);
}

export function upsertCoachAthleteLocal(coachId: string, profile: Athlete): Athlete[] {
  const records = readRecords().filter((r) => !(r.coachId === coachId && r.profile.id === profile.id));
  records.push({ coachId, profile });
  persistAthleteRecords(records);
  return records.filter((r) => r.coachId === coachId).map((r) => r.profile);
}

export function coachIdForAthleteLocal(athleteId: string): string | null {
  return readRecords().find((r) => r.profile.id === athleteId)?.coachId ?? null;
}

export function removeCoachAthleteLocal(coachId: string, athleteId: string): Athlete[] {
  const records = readRecords().filter((r) => !(r.coachId === coachId && r.profile.id === athleteId));
  persistAthleteRecords(records);
  return records.filter((r) => r.coachId === coachId).map((r) => r.profile);
}

export function normalizeAthleteFromApi(data: unknown): Athlete {
  const row = data as Athlete & { coachId?: string; createdAt?: string; updatedAt?: string };
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    bodyweight: row.bodyweight,
    oneRM: row.oneRM,
    fatigueScore: row.fatigueScore,
    readinessScore: row.readinessScore,
  };
}
