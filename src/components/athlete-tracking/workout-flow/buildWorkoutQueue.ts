import type { Athlete, Exercise, SessionExerciseBlock } from '../../../models/training';
import { normalizeBlockType } from '../../../services/trainingEngine';
import { flattenBlockSets, type FlatSetRow } from '../../../utils/athleteSetLogs';

export interface WorkoutQueueItem {
  exerciseIndex: number;
  block: SessionExerciseBlock;
  row: FlatSetRow;
  exerciseName: string;
  isComplex: boolean;
}

export function buildWorkoutQueue(
  blocks: SessionExerciseBlock[],
  athlete: Athlete | undefined,
  exercises: Exercise[],
  exName: (id: string) => string,
): WorkoutQueueItem[] {
  const queue: WorkoutQueueItem[] = [];

  blocks.forEach((block, exerciseIndex) => {
    const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
    const name = isComplex
      ? (block.segments ?? []).map((s) => exName(s.exerciseId)).join(' → ')
      : exName(block.exerciseId);

    const rows = flattenBlockSets(block, athlete, exercises, exName);
    for (const row of rows) {
      queue.push({
        exerciseIndex,
        block,
        row,
        exerciseName: name,
        isComplex,
      });
    }
  });

  return queue;
}

export function queueItemKey(item: WorkoutQueueItem): string {
  const { row, exerciseIndex } = item;
  return `${exerciseIndex}:${row.schemeIndex}:${row.setInstance}`;
}
