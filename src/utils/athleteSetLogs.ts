import type { Athlete, Exercise, SessionExerciseBlock, SetCompletionLog } from '../models/training';
import { kgForExercise } from '../components/session-editor/blockMetrics';
import { formatSetSchemeRow } from '../components/session-editor/schemeFormat';
import {
  effectiveSegmentRepStrings,
  normalizeBlockType,
  parseRepTokens,
  repsPerRoundForScheme,
  syncBlockSetSchemes,
} from '../services/trainingEngine';

export interface FlatSetRow {
  schemeIndex: number;
  setInstance: number;
  label: string;
  percentage: number;
  prescribedKg: number;
  prescribedReps: number;
  /** Rx tal como la ve el coach, p. ej. (70%/2)3 o (85%/1+1)2 */
  prescribedRepsLabel: string;
  schemeSetCount: number;
  isComplex: boolean;
  /** Solo complejos */
  prescribedSegmentReps?: number[];
  prescribedSegmentRepLabels?: string[];
  segmentLabels?: string[];
  movementName?: string;
}

export function findSetLog(
  logs: SetCompletionLog[],
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
  exerciseIndex: number,
  schemeIndex: number,
  setInstance: number,
): SetCompletionLog | undefined {
  return logs.find(
    (l) =>
      l.assignmentId === assignmentId &&
      l.weekNumber === weekNumber &&
      l.dayNumber === dayNumber &&
      l.exerciseIndex === exerciseIndex &&
      l.schemeIndex === schemeIndex &&
      l.setInstance === setInstance,
  );
}

export function flattenBlockSets(
  block: SessionExerciseBlock,
  athlete: Athlete | undefined,
  exercises: Exercise[],
  exName: (id: string) => string,
): FlatSetRow[] {
  syncBlockSetSchemes(block);
  const rows: FlatSetRow[] = [];
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);

  for (let schemeIndex = 0; schemeIndex < block.sets.length; schemeIndex++) {
    const scheme = block.sets[schemeIndex]!;
    const segmentRepStrings = isComplex ? effectiveSegmentRepStrings(block, scheme) : [];
    const schemeForLabel: typeof scheme =
      isComplex && segmentRepStrings.length
        ? { ...scheme, segmentReps: segmentRepStrings }
        : scheme;
    const prescribedRepsLabel = formatSetSchemeRow(schemeForLabel, isComplex);

    for (let setInstance = 1; setInstance <= scheme.sets; setInstance++) {
      if (isComplex && block.segments?.length) {
        const firstSeg = block.segments[0]!;
        const ex = exercises.find((e) => e.id === firstSeg.exerciseId);
        const kg = athlete && ex ? kgForExercise(athlete, ex, scheme.percentage) : 0;
        const prescribedSegmentReps = segmentRepStrings.map((token) => parseRepTokens(token));
        rows.push({
          schemeIndex,
          setInstance,
          label: `S${setInstance}`,
          percentage: scheme.percentage,
          prescribedKg: kg,
          prescribedReps: repsPerRoundForScheme(block, scheme),
          prescribedRepsLabel,
          schemeSetCount: scheme.sets,
          isComplex: true,
          prescribedSegmentReps,
          prescribedSegmentRepLabels: segmentRepStrings,
          segmentLabels: block.segments.map((s) => exName(s.exerciseId)),
          movementName: block.segments.map((s) => exName(s.exerciseId)).join(' → '),
        });
      } else {
        const ex = exercises.find((e) => e.id === block.exerciseId);
        const kg = athlete && ex ? kgForExercise(athlete, ex, scheme.percentage) : 0;
        rows.push({
          schemeIndex,
          setInstance,
          label: `S${setInstance}`,
          percentage: scheme.percentage,
          prescribedKg: kg,
          prescribedReps: repsPerRoundForScheme(block, scheme),
          prescribedRepsLabel,
          schemeSetCount: scheme.sets,
          isComplex: false,
        });
      }
    }
  }
  return rows;
}

export function isBlockFullyLogged(
  block: SessionExerciseBlock,
  logs: SetCompletionLog[],
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
  exerciseIndex: number,
  athlete: Athlete | undefined,
  exercises: Exercise[],
  exName: (id: string) => string,
): boolean {
  const flat = flattenBlockSets(block, athlete, exercises, exName);
  if (flat.length === 0) return false;
  return flat.every((s) =>
    Boolean(
      findSetLog(
        logs,
        assignmentId,
        weekNumber,
        dayNumber,
        exerciseIndex,
        s.schemeIndex,
        s.setInstance,
      ),
    ),
  );
}

export function countBlockSetsDone(
  block: SessionExerciseBlock,
  logs: SetCompletionLog[],
  assignmentId: string,
  weekNumber: number,
  dayNumber: number,
  exerciseIndex: number,
  athlete: Athlete | undefined,
  exercises: Exercise[],
  exName: (id: string) => string,
): { done: number; total: number } {
  const flat = flattenBlockSets(block, athlete, exercises, exName);
  const done = flat.filter((s) =>
    findSetLog(
      logs,
      assignmentId,
      weekNumber,
      dayNumber,
      exerciseIndex,
      s.schemeIndex,
      s.setInstance,
    ),
  ).length;
  return { done, total: flat.length };
}

export function setLogHasAutoregulation(
  log: SetCompletionLog,
  prescribedKg: number,
  prescribedReps: number,
  prescribedSegmentReps?: number[],
): boolean {
  if (log.actualKg != null && Math.abs(log.actualKg - prescribedKg) > 0.05) return true;
  if (log.actualSegmentReps?.length && prescribedSegmentReps?.length) {
    return prescribedSegmentReps.some((rx, i) => (log.actualSegmentReps![i] ?? rx) !== rx);
  }
  if (log.actualReps != null && log.actualReps !== prescribedReps) return true;
  return false;
}
