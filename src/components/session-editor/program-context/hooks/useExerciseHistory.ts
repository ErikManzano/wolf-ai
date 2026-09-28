import { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram, SessionExerciseBlock } from '../../../../models/training';
import { collectExerciseHistory } from '../../programExerciseHistory';

export function useExerciseHistory(params: {
  program: GeneratedProgram | null;
  block: SessionExerciseBlock | null;
  athlete: Athlete;
  exercises: Exercise[];
  weekNumber: number;
  dayNumber: number;
}) {
  const { program, block, athlete, exercises, weekNumber, dayNumber } = params;
  return useMemo(() => {
    if (!program || !block) return [];
    return collectExerciseHistory(program, block, athlete, exercises, weekNumber, dayNumber, 4);
  }, [program, block, athlete, exercises, weekNumber, dayNumber]);
}
