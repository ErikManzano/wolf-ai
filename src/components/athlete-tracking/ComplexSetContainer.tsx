import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  deriveComplexSetStatus,
  formatSegmentRepsSummary,
  isComplexModified,
  resolveSegmentRepsOnComplete,
} from '../../utils/setCompletionStatus';
import { NestedComplexMovementRow } from './NestedComplexMovementRow';
import { SetCheckButton } from './primitives/SetCheckButton';
import { WeightChip } from './primitives/WeightChip';

export interface ComplexSetContainerProps {
  setNumber: number;
  percentage: number;
  prescribedKg: number;
  prescribedSegmentReps: number[];
  segmentLabels: string[];
  actualKg?: number;
  actualSegmentReps?: number[];
  done: boolean;
  isEs: boolean;
  syncPending?: boolean;
  syncFailed?: boolean;
  onToggle: (actualKg: number, actualSegmentReps: number[]) => void;
  onUpdate: (actualKg: number, actualSegmentReps: number[]) => void;
}

export const ComplexSetContainer: React.FC<ComplexSetContainerProps> = ({
  setNumber,
  percentage,
  prescribedKg,
  prescribedSegmentReps,
  segmentLabels,
  actualKg,
  actualSegmentReps,
  done,
  isEs,
  syncPending = false,
  syncFailed = false,
  onToggle,
  onUpdate,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [pendingKg, setPendingKg] = useState(prescribedKg);
  const [pendingSegReps, setPendingSegReps] = useState(prescribedSegmentReps);
  const [touched, setTouched] = useState(() => prescribedSegmentReps.map(() => false));

  useEffect(() => {
    if (!done) {
      setPendingKg(prescribedKg);
      setPendingSegReps(prescribedSegmentReps);
      setTouched(prescribedSegmentReps.map(() => false));
    }
  }, [prescribedKg, prescribedSegmentReps, done]);

  const displayKg = done ? (actualKg ?? prescribedKg) : pendingKg;
  const displaySegReps = done ? (actualSegmentReps ?? prescribedSegmentReps) : pendingSegReps;

  const repsSummary = formatSegmentRepsSummary(prescribedSegmentReps, displaySegReps);

  const doneStatus = deriveComplexSetStatus({
    done,
    prescribedKg,
    actualKg: displayKg,
    prescribedSegmentReps,
    actualSegmentReps: displaySegReps,
  });

  const modifiedPreview =
    !done &&
    isComplexModified(prescribedKg, displayKg, prescribedSegmentReps, displaySegReps);

  const checkStatus = done ? doneStatus : modifiedPreview ? 'partial' : 'pending';

  const handleCheck = () => {
    if (done) {
      onToggle(displayKg, displaySegReps);
      return;
    }
    const finalSeg = resolveSegmentRepsOnComplete(prescribedSegmentReps, pendingSegReps, touched);
    onToggle(displayKg, finalSeg);
  };

  const updateSeg = (index: number, value: number) => {
    setTouched((t) => t.map((x, i) => (i === index ? true : x)));
    const next = displaySegReps.map((v, i) => (i === index ? value : v));
    if (done) onUpdate(displayKg, next);
    else setPendingSegReps(next);
  };

  const commitKg = (v: number) => {
    if (done) onUpdate(v, displaySegReps);
    else setPendingKg(v);
  };

  const toggleExpand = () => setExpanded((v) => !v);

  return (
    <div
      className={cn(
        'athlete-set-row rounded-lg border overflow-hidden transition-colors duration-200',
        checkStatus === 'pending' && 'border-zinc-700/70 bg-zinc-900/30',
        checkStatus === 'complete' && done && 'border-emerald-500/35 bg-emerald-500/6',
        checkStatus === 'partial' && 'border-orange-500/40 bg-orange-500/6',
      )}
    >
      {/* Fila maestra */}
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          className="flex items-center gap-1.5 shrink-0 min-w-[5.5rem] touch-manipulation text-left"
          onClick={toggleExpand}
          aria-expanded={expanded}
        >
          <span className="text-sm font-bold tabular-nums text-zinc-300 w-4 text-center">{setNumber}</span>
          <span className="text-zinc-600 text-xs" aria-hidden>
            |
          </span>
          <WeightChip
            value={displayKg}
            prescribedKg={prescribedKg}
            isEs={isEs}
            onCommit={commitKg}
          />
        </button>

        <button
          type="button"
          className="flex-1 min-w-0 flex flex-col items-start touch-manipulation text-left py-0.5"
          onClick={toggleExpand}
          aria-expanded={expanded}
        >
          <span className="text-[0.58rem] uppercase tracking-wider text-zinc-600 font-semibold leading-none mb-0.5">
            {isEs ? 'Reps' : 'Reps'}
          </span>
          <span
            className={cn(
              'text-xs font-bold tabular-nums truncate max-w-full',
              modifiedPreview || (done && doneStatus === 'partial') ? 'text-orange-400' : 'text-zinc-400',
            )}
          >
            {repsSummary}
          </span>
        </button>

        <button
          type="button"
          className="shrink-0 p-1.5 text-zinc-500 touch-manipulation active:scale-95 transition-transform"
          aria-expanded={expanded}
          aria-label={expanded ? (isEs ? 'Contraer' : 'Collapse') : (isEs ? 'Expandir' : 'Expand')}
          onClick={toggleExpand}
        >
          <ChevronDown size={18} className={cn('transition-transform duration-200', expanded && 'rotate-180')} />
        </button>

        <SetCheckButton
          status={checkStatus}
          pressed={done}
          syncPending={syncPending}
          syncFailed={syncFailed}
          label={
            done
              ? isEs
                ? 'Desmarcar serie'
                : 'Unmark set'
              : isEs
                ? 'Marcar serie completada'
                : 'Mark set complete'
          }
          onClick={handleCheck}
        />
      </div>

      {/* Acordeón — sub-movimientos */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-2 pb-2 bg-zinc-950/40 border-t border-zinc-800/60">
            {segmentLabels.map((name, i) => (
              <NestedComplexMovementRow
                key={`${name}-${i}`}
                movementName={name}
                prescribedReps={prescribedSegmentReps[i]!}
                actualReps={displaySegReps[i] ?? prescribedSegmentReps[i]!}
                onActualRepsChange={(v) => updateSeg(i, v)}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="sr-only">{percentage}%</p>
    </div>
  );
};
