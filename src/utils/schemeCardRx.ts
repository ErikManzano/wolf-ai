import type { Athlete, Exercise, SessionExerciseBlock } from '../models/training';
import { exerciseName, formatAthleteKg } from '../components/session-editor/blockMetrics';
import { flattenBlockSets, type FlatSetRow } from './athleteSetLogs';

export interface SchemeCardRxSummary {
  key: string;
  kgLabel: string | null;
  percentage: number;
  volumeLabel: string;
}

function repsTokenFromRow(row: FlatSetRow): string {
  const slash = row.prescribedRepsLabel.indexOf('/');
  const token = slash >= 0 ? row.prescribedRepsLabel.slice(slash + 1) : String(row.prescribedReps);
  if (row.isComplex && token.includes('+')) {
    return token
      .split('+')
      .map((part) => part.trim() || '0')
      .join(' + ');
  }
  return token;
}

/** Prescripción por esquema en cards mobile (atleta y coach): kg · % · series×reps */
export function buildSchemeCardSummaries(
  block: SessionExerciseBlock,
  athlete: Athlete | undefined,
  exercises: Exercise[],
): SchemeCardRxSummary[] {
  const rows = flattenBlockSets(block, athlete, exercises, (id) => exerciseName(exercises, id));
  const seen = new Set<number>();
  const summaries: SchemeCardRxSummary[] = [];

  for (const row of rows) {
    if (seen.has(row.schemeIndex)) continue;
    seen.add(row.schemeIndex);

    const repsToken = repsTokenFromRow(row);
    const volumeLabel =
      row.isComplex && repsToken.includes('+')
        ? repsToken
        : `${row.schemeSetCount}×${repsToken}`;

    summaries.push({
      key: `scheme-${row.schemeIndex}`,
      kgLabel: row.prescribedKg > 0 ? `${formatAthleteKg(row.prescribedKg)} kg` : null,
      percentage: row.percentage,
      volumeLabel,
    });
  }

  return summaries;
}
