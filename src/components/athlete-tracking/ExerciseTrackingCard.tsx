import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Dumbbell } from 'lucide-react';
import type { Athlete, Exercise, SessionExerciseBlock, SetCompletionLog } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { flattenBlockSets } from '../../utils/athleteSetLogs';
import { sumReps } from '../../utils/setCompletionStatus';
import { formatSetSchemeRow } from '../session-editor/schemeFormat';
import { ComplexSetContainer } from './ComplexSetContainer';
import { ExerciseDetailMock } from './ExerciseDetailMock';
import { SimpleSetRow } from './SimpleSetRow';

export interface ExerciseTrackingCardProps {
  block: SessionExerciseBlock;
  blockIndex: number;
  athlete?: Athlete;
  exercises: Exercise[];
  exName: (id: string) => string;
  isEs: boolean;
  assignmentId: string;
  weekNumber: number;
  dayNumber: number;
  legacyExerciseDone: boolean;
  isSetComplete: (schemeIndex: number, setInstance: number) => boolean;
  getSetLog: (schemeIndex: number, setInstance: number) => SetCompletionLog | undefined;
  onToggleSet: (
    schemeIndex: number,
    setInstance: number,
    actualKg: number,
    actualReps: number,
    actualSegmentReps?: number[],
  ) => void;
  onUpdateSet: (
    schemeIndex: number,
    setInstance: number,
    actualKg: number,
    actualReps: number,
    actualSegmentReps?: number[],
  ) => void;
  onMarkAllComplete: () => void;
  expanded?: boolean;
  onExpand?: () => void;
}

function blockTitle(
  block: SessionExerciseBlock,
  isComplex: boolean,
  exName: (id: string) => string,
): string {
  if (isComplex && block.segments?.length) {
    return block.segments.map((s) => exName(s.exerciseId)).join(' → ');
  }
  return exName(block.exerciseId);
}

export const ExerciseTrackingCard: React.FC<ExerciseTrackingCardProps> = ({
  block,
  blockIndex,
  athlete,
  exercises,
  exName,
  isEs,
  legacyExerciseDone,
  isSetComplete,
  getSetLog,
  onToggleSet,
  onUpdateSet,
  onMarkAllComplete,
  expanded: controlledExpanded,
  onExpand,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(blockIndex === 0);
  const expanded = controlledExpanded ?? internalExpanded;

  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const title = blockTitle(block, isComplex, exName);

  const flatSets = useMemo(
    () => flattenBlockSets(block, athlete, exercises, exName),
    [block, athlete, exercises, exName],
  );

  const prescriptionSummary = useMemo(() => {
    if (!block.sets.length) return null;
    return block.sets.map((row) => formatSetSchemeRow(row, isComplex)).join(' · ');
  }, [block.sets, isComplex]);

  const doneCount = flatSets.filter((s) => isSetComplete(s.schemeIndex, s.setInstance)).length;
  const totalSets = flatSets.length;
  const allDone = legacyExerciseDone || (totalSets > 0 && doneCount === totalSets);

  const toggleExpand = () => {
    if (onExpand) onExpand();
    else setInternalExpanded((v) => !v);
  };

  return (
    <article
      className={cn(
        'rounded-xl border overflow-hidden transition-all duration-200',
        allDone ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-zinc-700/80 bg-zinc-900/50',
        expanded && !allDone && 'ring-1 ring-orange-500/20',
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 p-3 min-h-[52px] text-left touch-manipulation hover:bg-zinc-800/40 active:bg-zinc-800/60 transition-colors"
        aria-expanded={expanded}
        onClick={toggleExpand}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center w-9 h-9 rounded-lg border',
            allDone
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-zinc-700 bg-zinc-800 text-zinc-400',
          )}
        >
          <Dumbbell size={16} strokeWidth={2} aria-hidden />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span
              className={cn(
                'text-[0.62rem] font-bold uppercase px-1.5 py-0.5 rounded',
                isComplex ? 'bg-sky-500/15 text-sky-400' : 'bg-orange-500/15 text-orange-400',
              )}
            >
              {isComplex ? (isEs ? 'Complejo' : 'Complex') : isEs ? 'Simple' : 'Single'}
            </span>
            <span className="text-[0.62rem] font-semibold text-zinc-500 tabular-nums">
              {doneCount}/{totalSets} {isEs ? 'series' : 'sets'}
            </span>
            {allDone ? (
              <span className="text-[0.62rem] font-bold text-emerald-400 uppercase">{isEs ? 'Hecho' : 'Done'}</span>
            ) : null}
          </div>
          <h3 className="font-semibold text-zinc-100 text-sm truncate">{title}</h3>
          {prescriptionSummary ? (
            <p className="text-[0.65rem] text-zinc-500 truncate mt-0.5 tabular-nums">{prescriptionSummary}</p>
          ) : null}
        </div>

        <span className="shrink-0 text-zinc-500 p-1">
          {expanded ? <ChevronDown size={20} aria-hidden /> : <ChevronRight size={20} aria-hidden />}
        </span>
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 border-t border-zinc-800/70 pt-3">
            <ExerciseDetailMock exerciseName={title} isComplex={isComplex} isEs={isEs} />

            <div className="flex flex-col gap-1.5">
              {flatSets.map((row) => {
                const log = getSetLog(row.schemeIndex, row.setInstance);
                const done = isSetComplete(row.schemeIndex, row.setInstance);

                if (row.isComplex && row.prescribedSegmentReps && row.segmentLabels) {
                  return (
                    <ComplexSetContainer
                      key={`${row.schemeIndex}-${row.setInstance}`}
                      setNumber={row.setInstance}
                      percentage={row.percentage}
                      prescribedKg={row.prescribedKg}
                      prescribedSegmentReps={row.prescribedSegmentReps}
                      segmentLabels={row.segmentLabels}
                      actualKg={log?.actualKg}
                      actualSegmentReps={log?.actualSegmentReps}
                      done={done}
                      isEs={isEs}
                      onToggle={(kg, segs) =>
                        onToggleSet(row.schemeIndex, row.setInstance, kg, sumReps(segs), segs)
                      }
                      onUpdate={(kg, segs) =>
                        onUpdateSet(row.schemeIndex, row.setInstance, kg, sumReps(segs), segs)
                      }
                    />
                  );
                }

                return (
                  <SimpleSetRow
                    key={`${row.schemeIndex}-${row.setInstance}`}
                    setNumber={row.setInstance}
                    percentage={row.percentage}
                    prescribedKg={row.prescribedKg}
                    prescribedReps={row.prescribedReps}
                    actualKg={log?.actualKg}
                    actualReps={log?.actualReps}
                    done={done}
                    isEs={isEs}
                    onToggle={(kg, reps) => onToggleSet(row.schemeIndex, row.setInstance, kg, reps)}
                    onUpdate={(kg, reps) => onUpdateSet(row.schemeIndex, row.setInstance, kg, reps)}
                  />
                );
              })}
            </div>

            {!allDone && (
              <Button
                type="button"
                variant="outline"
                size="md"
                className="w-full mt-2.5 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={onMarkAllComplete}
              >
                {isEs ? 'Marcar todo el ejercicio' : 'Mark entire exercise'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
