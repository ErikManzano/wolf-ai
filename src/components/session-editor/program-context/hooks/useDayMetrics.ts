import { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram } from '../../../../models/training';
import { buildDayMetricsBundle } from '../../programMetricsService';

export function useDayMetrics(params: {
  program: GeneratedProgram | null;
  weekNumber: number;
  dayNumber: number;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
}) {
  const { program, weekNumber, dayNumber, athlete, exercises, isEs } = params;
  return useMemo(() => {
    if (!program) return null;
    return buildDayMetricsBundle({ program, weekNumber, dayNumber, athlete, exercises, isEs });
  }, [program, weekNumber, dayNumber, athlete, exercises, isEs]);
}
