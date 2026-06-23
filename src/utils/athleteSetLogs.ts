import type { Athlete, Exercise, SessionExerciseBlock, SetCompletionLog } from '../models/training';
import { findCatalogExercise, kgForExercise } from '../components/session-editor/blockMetrics';
import { formatAthleteSetRxLabel, blockUsesComplexReps } from '../components/session-editor/schemeFormat';
import {
  effectiveSegmentRepStrings,
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
  /** Rx por série: p. ej. 70%/3 (sin multiplicador de series) */
  prescribedRepsLabel: string;
  schemeSetCount: number;
  isComplex: boolean;
  /** Solo complejos */
  prescribedSegmentReps?: number[];
  prescribedSegmentRepLabels?: string[];
  prescribedSegmentKg?: number[];
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
  const isComplex = blockUsesComplexReps(block);

  for (let schemeIndex = 0; schemeIndex < block.sets.length; schemeIndex++) {
    const scheme = block.sets[schemeIndex]!;
    const segmentRepStrings = isComplex
      ? block.segments?.length
        ? effectiveSegmentRepStrings(block, scheme)
        : (scheme.segmentReps?.map((token) => token.trim() || '1') ?? [])
      : [];
    const schemeForLabel: typeof scheme =
      isComplex && segmentRepStrings.length
        ? { ...scheme, segmentReps: segmentRepStrings }
        : scheme;
    const prescribedRepsLabel = formatAthleteSetRxLabel(schemeForLabel, isComplex);

    for (let setInstance = 1; setInstance <= scheme.sets; setInstance++) {
      if (isComplex) {
        const prescribedSegmentKg = block.segments?.length
          ? block.segments.map((seg) => {
              const ex = findCatalogExercise(exercises, seg.exerciseId);
              return athlete && ex ? kgForExercise(athlete, ex, scheme.percentage) : 0;
            })
          : (() => {
              const ex = findCatalogExercise(exercises, block.exerciseId);
              const kg = athlete && ex ? kgForExercise(athlete, ex, scheme.percentage) : 0;
              return segmentRepStrings.map(() => kg);
            })();
        const kg = prescribedSegmentKg.find((value) => value > 0) ?? prescribedSegmentKg[0] ?? 0;
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
          prescribedSegmentKg,
          segmentLabels: block.segments?.length
            ? block.segments.map((s) => exName(s.exerciseId))
            : segmentRepStrings.map((_, i) => `M${i + 1}`),
          movementName: block.segments?.length
            ? block.segments.map((s) => exName(s.exerciseId)).join(' → ')
            : undefined,
        });
      } else {
        const ex = findCatalogExercise(exercises, block.exerciseId);
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
