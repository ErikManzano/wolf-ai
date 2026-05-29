import React from 'react';
import { RepStepper } from './primitives/RepStepper';

interface NestedComplexMovementRowProps {
  movementName: string;
  prescribedReps: number;
  actualReps: number;
  onActualRepsChange: (v: number) => void;
}

export const NestedComplexMovementRow: React.FC<NestedComplexMovementRowProps> = ({
  movementName,
  prescribedReps,
  actualReps,
  onActualRepsChange,
}) => {
  const partial = actualReps !== prescribedReps;

  return (
    <div
      className={`flex items-center gap-2 py-2 pl-2 border-t border-zinc-800/70 first:border-t-0 ${
        partial ? 'bg-orange-500/[0.04]' : ''
      }`}
    >
      <span className="flex-1 min-w-0 text-xs font-medium text-zinc-300 truncate" title={movementName}>
        {movementName}
      </span>
      <span className="text-xs tabular-nums text-zinc-600 shrink-0">
        Rx <span className="text-zinc-400 font-semibold">{prescribedReps}</span>
      </span>
      <div className="w-[6.5rem] shrink-0">
        <RepStepper compact value={actualReps} onChange={onActualRepsChange} />
      </div>
    </div>
  );
};
