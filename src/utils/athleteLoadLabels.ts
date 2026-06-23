import type { FlatSetRow } from './athleteSetLogs';
import { formatAthleteKg } from '../components/session-editor/blockMetrics';

export function formatSetLoadLabel(row: FlatSetRow): string {
  const pct = `${row.percentage}%`;

  if (row.isComplex && row.prescribedSegmentKg?.length) {
    const weights = row.prescribedSegmentKg.filter((kg) => kg > 0);
    if (weights.length === 0) return pct;
    const unique = [...new Set(weights.map(formatAthleteKg))];
    if (unique.length === 1) return `${pct} • ${unique[0]} kg`;
    return `${pct} • ${unique.join(' / ')} kg`;
  }

  if (row.prescribedKg <= 0) return pct;
  return `${pct} • ${formatAthleteKg(row.prescribedKg)} kg`;
}

function repsTokenFromRxLabel(rxLabel: string): string | null {
  const slash = rxLabel.indexOf('/');
  if (slash < 0) return null;
  const token = rxLabel.slice(slash + 1).trim();
  return token || null;
}

function formatComplexRepsToken(token: string): string {
  if (!token.includes('+')) return token;
  return token
    .split('+')
    .map((part) => part.trim() || '0')
    .join(' + ');
}

export function formatSetRepsLabel(row: FlatSetRow, isEs: boolean): string {
  const rxToken = repsTokenFromRxLabel(row.prescribedRepsLabel);

  if (row.isComplex || (rxToken?.includes('+') ?? false)) {
    if (row.prescribedSegmentRepLabels?.length) {
      return row.prescribedSegmentRepLabels.map((t) => t.trim() || '0').join(' + ');
    }
    if (rxToken?.includes('+')) return formatComplexRepsToken(rxToken);
    if (row.prescribedSegmentReps?.length) {
      return row.prescribedSegmentReps.join(' + ');
    }
  }

  const reps = rxToken ?? String(row.prescribedReps);
  return `${reps} ${isEs ? 'reps' : 'reps'}`;
}

export function formatSetDoneRepsLabel(
  row: FlatSetRow,
  log: { actualReps?: number; actualSegmentReps?: number[] } | undefined,
  isEs: boolean,
): string {
  if (!log) return `0 ${isEs ? 'realizadas' : 'done'}`;

  if (row.isComplex && row.prescribedSegmentReps?.length && log.actualSegmentReps?.length) {
    const summary = row.prescribedSegmentReps
      .map((rx, i) => `${log.actualSegmentReps![i] ?? rx}/${rx}`)
      .join(' + ');
    return isEs ? `${summary} realizadas` : `${summary} done`;
  }

  return `${log.actualReps ?? 0} ${isEs ? 'realizadas' : 'done'}`;
}
