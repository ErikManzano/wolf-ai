import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { deriveSimpleSetStatus } from '../../utils/setCompletionStatus';
import { RepStepper } from './primitives/RepStepper';
import { SetCheckButton } from './primitives/SetCheckButton';
import { WeightChip } from './primitives/WeightChip';

export interface SimpleSetRowProps {
  setNumber: number;
  percentage: number;
  prescribedKg: number;
  prescribedReps: number;
  actualKg?: number;
  actualReps?: number;
  done: boolean;
  isEs: boolean;
  syncPending?: boolean;
  syncFailed?: boolean;
  onToggle: (actualKg: number, actualReps: number) => void;
  onUpdate: (actualKg: number, actualReps: number) => void;
}

export const SimpleSetRow: React.FC<SimpleSetRowProps> = ({
  setNumber,
  percentage,
  prescribedKg,
  prescribedReps,
  actualKg,
  actualReps,
  done,
  isEs,
  syncPending = false,
  syncFailed = false,
  onToggle,
  onUpdate,
}) => {
  const [pendingKg, setPendingKg] = useState(prescribedKg);
  const [pendingReps, setPendingReps] = useState(prescribedReps);

  useEffect(() => {
    if (!done) {
      setPendingKg(prescribedKg);
      setPendingReps(prescribedReps);
    }
  }, [prescribedKg, prescribedReps, done]);

  const displayKg = done ? (actualKg ?? prescribedKg) : pendingKg;
  const displayReps = done ? (actualReps ?? prescribedReps) : pendingReps;

  const status = deriveSimpleSetStatus({
    done,
    prescribedKg,
    actualKg: displayKg,
    prescribedReps,
    actualReps: displayReps,
  });

  const commitKg = (v: number) => {
    if (done) onUpdate(v, displayReps);
    else setPendingKg(v);
  };

  const commitReps = (v: number) => {
    if (done) onUpdate(displayKg, v);
    else setPendingReps(v);
  };

  return (
    <div
      className={cn(
        'athlete-set-row rounded-lg border px-2 py-2 transition-colors duration-200',
        status === 'pending' && 'border-zinc-700/70 bg-zinc-900/30',
        status === 'complete' && 'border-emerald-500/35 bg-emerald-500/6',
        status === 'partial' && 'border-orange-500/40 bg-orange-500/6',
      )}
    >
      <div className="flex items-center gap-2">
        {/* Izquierda: serie + peso */}
        <div className="flex items-center gap-1.5 shrink-0 min-w-[5.5rem]">
          <span className="text-sm font-bold tabular-nums text-zinc-300 w-4 text-center">{setNumber}</span>
          <span className="text-zinc-600 text-xs" aria-hidden>
            |
          </span>
          <WeightChip value={displayKg} prescribedKg={prescribedKg} isEs={isEs} onCommit={commitKg} />
        </div>

        {/* Centro: Rx + Hecho */}
        <div className="flex-1 flex items-end justify-center gap-3 min-w-0">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[0.58rem] uppercase tracking-wider text-zinc-600 font-semibold">Rx</span>
            <span className="text-sm font-bold tabular-nums text-zinc-500">{prescribedReps}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 min-w-[5.5rem]">
            <span className="text-[0.58rem] uppercase tracking-wider text-zinc-500 font-semibold">
              {isEs ? 'hecho' : 'done'}
            </span>
            <RepStepper compact value={displayReps} onChange={commitReps} />
          </div>
        </div>

        {/* Derecha: check */}
        <SetCheckButton
          status={status}
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
          onClick={() => onToggle(displayKg, displayReps)}
        />
      </div>
      <p className="sr-only">
        {percentage}% · {isEs ? 'Serie' : 'Set'} {setNumber}
      </p>
    </div>
  );
};
