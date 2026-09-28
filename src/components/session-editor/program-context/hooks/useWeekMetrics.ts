import { useMemo } from 'react';
import type { Athlete, Exercise, GeneratedProgram, ProgramWeek } from '../../../../models/training';
import { buildWeekComparisonRows } from '../../programMetricsService';

export function useWeekMetrics(params: {
  program: GeneratedProgram;
  weekNumber: number;
  weekData?: ProgramWeek;
  previousWeekData?: ProgramWeek;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
}) {
  return useMemo(
    () => buildWeekComparisonRows(params),
    [
      params.program,
      params.weekNumber,
      params.weekData,
      params.previousWeekData,
      params.athlete,
      params.exercises,
      params.isEs,
    ],
  );
}
