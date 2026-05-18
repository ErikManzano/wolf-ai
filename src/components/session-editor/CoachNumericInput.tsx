import React, { useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';

interface CoachNumericInputProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  'aria-label'?: string;
}

export const CoachNumericInput: React.FC<CoachNumericInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  className,
  'aria-label': ariaLabel,
}) => {
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clamp = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max]);

  const bump = useCallback(
    (delta: number) => onChange(clamp(value + delta)),
    [clamp, onChange, value],
  );

  const startHold = (delta: number) => {
    bump(delta);
    holdRef.current = setInterval(() => bump(delta), 120);
  };

  const stopHold = () => {
    if (holdRef.current) clearInterval(holdRef.current);
    holdRef.current = null;
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        aria-label={ariaLabel ? `${ariaLabel} decrease` : 'Decrease'}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-wolf-border/70 bg-wolf-panel text-lg text-wolf-subtle transition-colors hover:bg-wolf-hover hover:text-wolf-text active:scale-95 touch-manipulation"
        onPointerDown={() => startHold(-step)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
      >
        −
      </button>
      <Input
        type="number"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={value}
        min={min}
        max={max}
        step={step}
        className="h-11 min-w-[72px] text-center font-semibold"
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        onWheel={(e) => {
          e.preventDefault();
          bump(e.deltaY < 0 ? step : -step);
        }}
      />
      <button
        type="button"
        aria-label={ariaLabel ? `${ariaLabel} increase` : 'Increase'}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-wolf-border/70 bg-wolf-panel text-lg text-wolf-subtle transition-colors hover:bg-wolf-hover hover:text-wolf-text active:scale-95 touch-manipulation"
        onPointerDown={() => startHold(step)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
      >
        +
      </button>
    </div>
  );
};
