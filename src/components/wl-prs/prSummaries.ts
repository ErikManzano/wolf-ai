import type { Athlete } from '../../models/training';
import type { AthleteLiftLog, PrLiftId } from '../../models/liftLogs';
import { epleyE1rm } from './e1rm';
import { PR_LIFTS, type OneRmAnchorKey } from './PrLiftCatalog';

export type LiftSummary = {
  liftId: PrLiftId;
  logs: AthleteLiftLog[];
  bestE1rm: number;
  firstE1rm: number;
  lastE1rm: number;
  lastLoggedAt: string | null;
  firstLoggedAt: string | null;
  lastLog: AthleteLiftLog | null;
  bestLog: AthleteLiftLog | null;
};

export function summarizeLift(
  liftId: PrLiftId,
  allLogs: AthleteLiftLog[],
  oneRM?: Athlete['oneRM'],
): LiftSummary {
  const logs = allLogs
    .filter((log) => log.liftId === liftId)
    .slice()
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  let bestE1rm = 0;
  let bestLog: AthleteLiftLog | null = null;
  for (const log of logs) {
    const est = epleyE1rm(log.kg, log.reps);
    if (est >= bestE1rm) {
      bestE1rm = est;
      bestLog = log;
    }
  }
  const first = logs[0] ?? null;
  const last = logs[logs.length - 1] ?? null;
  const oneRmKey = PR_LIFTS[liftId].oneRmKey as OneRmAnchorKey | undefined;
  const profileMark = oneRmKey && oneRM ? Number(oneRM[oneRmKey] ?? 0) : 0;
  if (bestE1rm <= 0 && profileMark > 0) bestE1rm = profileMark;
  return {
    liftId,
    logs: logs.slice().reverse(),
    bestE1rm,
    firstE1rm: first ? epleyE1rm(first.kg, first.reps) : bestE1rm,
    lastE1rm: last ? epleyE1rm(last.kg, last.reps) : bestE1rm,
    lastLoggedAt: last?.loggedAt ?? null,
    firstLoggedAt: first?.loggedAt ?? null,
    lastLog: last,
    bestLog,
  };
}
