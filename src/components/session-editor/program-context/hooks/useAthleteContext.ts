import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Athlete, GeneratedProgram } from '../../../../models/training';
import { prescribedTonnageWindow } from '../../programMetricsService';
import type { Exercise } from '../../../../models/training';
import { computeWeekScience } from '../../programScienceStats';
import { coachAthleteNotesStorageKey } from '../constants';

export function useAthleteContext(params: {
  athlete: Athlete | null;
  program: GeneratedProgram | null;
  weekNumber: number;
  dayNumber: number;
  exercises: Exercise[];
}) {
  const { athlete, program, weekNumber, dayNumber, exercises } = params;

  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!athlete) {
      setNotes('');
      return;
    }
    try {
      setNotes(localStorage.getItem(coachAthleteNotesStorageKey(athlete.id)) ?? '');
    } catch {
      setNotes('');
    }
  }, [athlete?.id]);

  const persistNotes = useCallback(
    (next: string) => {
      setNotes(next);
      if (!athlete) return;
      try {
        localStorage.setItem(coachAthleteNotesStorageKey(athlete.id), next);
      } catch {
        /* ignore */
      }
    },
    [athlete],
  );

  const science = useMemo(() => {
    if (!program || !athlete) return null;
    return computeWeekScience(program, weekNumber, athlete, exercises, null);
  }, [program, weekNumber, athlete, exercises]);

  const tonnage7d = useMemo(() => {
    if (!program || !athlete) return 0;
    return prescribedTonnageWindow(program, athlete, exercises, weekNumber, dayNumber, 7);
  }, [program, athlete, exercises, weekNumber, dayNumber]);

  const tonnage28d = useMemo(() => {
    if (!program || !athlete) return 0;
    return prescribedTonnageWindow(program, athlete, exercises, weekNumber, dayNumber, 28);
  }, [program, athlete, exercises, weekNumber, dayNumber]);

  return { notes, persistNotes, science, tonnage7d, tonnage28d };
}
