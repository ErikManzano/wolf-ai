import React, { useCallback, useRef } from 'react';

interface CompactNumberFieldProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  'aria-label'?: string;
}

export const CompactNumberField: React.FC<CompactNumberFieldProps> = ({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  'aria-label': ariaLabel,
}) => {
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clamp = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max]);

  const bump = useCallback(
    (delta: number) => onChange(clamp(value + delta)),
    [clamp, onChange, value],
  );

  const stopHold = () => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };

  const startHold = (delta: number) => {
    bump(delta);
    holdRef.current = setInterval(() => bump(delta), 100);
  };

  return (
    <div
      className="wolf-se-num-compact"
      role="group"
      aria-label={ariaLabel}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
    >
      <button
        type="button"
        tabIndex={-1}
        className="wolf-se-num-compact-btn"
        aria-label={ariaLabel ? `${ariaLabel} −` : 'Decrease'}
        onPointerDown={(e) => {
          e.preventDefault();
          startHold(-step);
        }}
        onPointerUp={stopHold}
        onClick={() => bump(-step)}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        className="wolf-se-num-compact-input"
        aria-label={ariaLabel}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        onWheel={(e) => {
          e.preventDefault();
          bump(e.deltaY < 0 ? step : -step);
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        className="wolf-se-num-compact-btn"
        aria-label={ariaLabel ? `${ariaLabel} +` : 'Increase'}
        onPointerDown={(e) => {
          e.preventDefault();
          startHold(step);
        }}
        onPointerUp={stopHold}
        onClick={() => bump(step)}
      >
        +
      </button>
    </div>
  );
};
