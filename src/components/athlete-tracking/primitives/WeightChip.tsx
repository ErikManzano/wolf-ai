import React, { useState } from 'react';
import { cn } from '../../../lib/utils';
import { WeightAdjustSheet } from '../sheets/WeightAdjustSheet';

interface WeightChipProps {
  value: number;
  prescribedKg: number;
  isEs: boolean;
  onCommit: (v: number) => void;
  className?: string;
}

export const WeightChip: React.FC<WeightChipProps> = ({
  value,
  prescribedKg,
  isEs,
  onCommit,
  className,
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const deviated = Math.abs(value - prescribedKg) > 0.05;

  return (
    <>
      <button
        type="button"
        className={cn(
          'touch-manipulation active:scale-[0.97] transition-transform',
          className,
        )}
        onClick={() => setSheetOpen(true)}
        aria-label={isEs ? `Carga ${value} kg, tocar para ajustar` : `Load ${value} kg, tap to adjust`}
      >
        <span
          className={cn(
            'inline-block bg-zinc-800 px-2 py-0.5 rounded text-sm font-bold tabular-nums',
            deviated ? 'text-orange-300 ring-1 ring-orange-500/40' : 'text-white',
          )}
        >
          {value} kg
        </span>
      </button>
      <WeightAdjustSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        value={value}
        prescribedKg={prescribedKg}
        isEs={isEs}
        onCommit={onCommit}
      />
    </>
  );
};
