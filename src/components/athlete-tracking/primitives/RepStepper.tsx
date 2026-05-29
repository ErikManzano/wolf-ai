import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface RepStepperProps {
  label?: string;
  value: number;
  min?: number;
  compact?: boolean;
  onChange: (v: number) => void;
}

export const RepStepper: React.FC<RepStepperProps> = ({
  label,
  value,
  min = 0,
  compact = false,
  onChange,
}) => (
  <div className={cn('flex flex-col', compact ? 'gap-0 min-w-0' : 'gap-0.5 min-w-0 flex-1')}>
    {label ? (
      <span className="text-[0.62rem] uppercase tracking-wider text-zinc-500 font-semibold leading-none">
        {label}
      </span>
    ) : null}
    {!compact && !label ? <span className="h-[0.55rem]" aria-hidden /> : null}
    <div
      className={cn(
        'inline-flex items-center rounded-md border border-zinc-700/60 bg-white/5 overflow-hidden',
        compact ? 'self-stretch' : 'self-start',
      )}
    >
      <button
        type="button"
        className="flex items-center justify-center min-w-[36px] min-h-[34px] text-zinc-300 hover:bg-zinc-800 active:scale-95 transition-transform touch-manipulation"
        aria-label="Quitar una rep"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus size={15} aria-hidden />
      </button>
      <span className="min-w-[1.75rem] px-0.5 text-center text-sm font-bold tabular-nums text-white">
        {value}
      </span>
      <button
        type="button"
        className="flex items-center justify-center min-w-[36px] min-h-[34px] text-zinc-300 hover:bg-zinc-800 active:scale-95 transition-transform touch-manipulation"
        aria-label="Añadir una rep"
        onClick={() => onChange(value + 1)}
      >
        <Plus size={15} aria-hidden />
      </button>
    </div>
  </div>
);
