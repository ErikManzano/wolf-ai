import React, { useCallback, useRef } from 'react';

interface CompactNumberFieldProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  /** When false, renders a keyboard-friendly plain numeric input (no ± buttons). */
  showSteppers?: boolean;
  'aria-label'?: string;
}

export const CompactNumberField: React.FC<CompactNumberFieldProps> = ({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
  showSteppers = false,
  'aria-label': ariaLabel,
}) => {
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const steppedRef = useRef(false);
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
    window.setTimeout(() => {
      steppedRef.current = false;
    }, 0);
  };

  const stepOnce = (delta: number) => {
    steppedRef.current = true;
    bump(delta);
  };

  const startHold = (delta: number) => {
    stepOnce(delta);
    holdRef.current = setInterval(() => bump(delta), 90);
  };

  const atMin = value <= min;
  const atMax = value >= max;

  const inputEl = (
    <input
      type="number"
      inputMode="numeric"
      className="wolf-se-num-compact-input"
      aria-label={ariaLabel}
      value={value}
      min={min}
      max={max}
      step={step > 1 ? 1 : step}
      onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
      onBlur={(e) => onChange(clamp(Number(e.target.value) || min))}
      onWheel={
        showSteppers
          ? (e) => {
              e.preventDefault();
              bump(e.deltaY < 0 ? step : -step);
            }
          : undefined
      }
    />
  );

  if (!showSteppers) {
    return (
      <div
        className="wolf-se-num-compact wolf-se-num-compact--plain"
        role="group"
        aria-label={ariaLabel}
      >
        <div className="wolf-se-num-compact-value">
          {inputEl}
          {suffix ? <span className="wolf-se-num-compact-suffix" aria-hidden>{suffix}</span> : null}
        </div>
      </div>
    );
  }

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
        disabled={atMin}
        aria-label={ariaLabel ? `${ariaLabel} −` : 'Decrease'}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!atMin) startHold(-step);
        }}
        onPointerUp={stopHold}
        onClick={(e) => {
          e.preventDefault();
          if (!steppedRef.current && !atMin) stepOnce(-step);
        }}
      >
        −
      </button>
      <div className="wolf-se-num-compact-value">
        {inputEl}
        {suffix ? <span className="wolf-se-num-compact-suffix" aria-hidden>{suffix}</span> : null}
      </div>
      <button
        type="button"
        tabIndex={-1}
        className="wolf-se-num-compact-btn"
        disabled={atMax}
        aria-label={ariaLabel ? `${ariaLabel} +` : 'Increase'}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!atMax) startHold(step);
        }}
        onPointerUp={stopHold}
        onClick={(e) => {
          e.preventDefault();
          if (!steppedRef.current && !atMax) stepOnce(step);
        }}
      >
        +
      </button>
    </div>
  );
};
