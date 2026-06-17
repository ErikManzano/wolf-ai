import React, { useCallback, useEffect, useRef, useState } from 'react';
import { nextSmoothHoldDelayMs } from './smoothHold';

interface CompactNumberFieldProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  /** When false, renders a keyboard-friendly plain numeric input (no ± buttons). */
  showSteppers?: boolean;
  /** Tighter layout for table cells and narrow panels. */
  size?: 'default' | 'compact';
  'aria-label'?: string;
}

export const CompactNumberField: React.FC<CompactNumberFieldProps> = ({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
  showSteppers = true,
  size = 'default',
  'aria-label': ariaLabel,
}) => {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTickRef = useRef(0);
  const steppedRef = useRef(false);
  const editingRef = useRef(false);
  const draftRef = useRef<string | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const [draft, setDraft] = useState<string | null>(null);

  valueRef.current = value;
  onChangeRef.current = onChange;

  const clamp = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max]);

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdTickRef.current = 0;
    window.setTimeout(() => {
      steppedRef.current = false;
    }, 0);
  }, []);

  useEffect(() => () => stopHold(), [stopHold]);

  useEffect(() => {
    if (!editingRef.current) {
      draftRef.current = null;
      setDraft(null);
    }
  }, [value]);

  const commitDraft = useCallback(
    (raw: string | null) => {
      const trimmed = (raw ?? '').trim();
      if (!trimmed) {
        draftRef.current = null;
        setDraft(null);
        editingRef.current = false;
        return;
      }
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed)) {
        draftRef.current = null;
        setDraft(null);
        editingRef.current = false;
        return;
      }
      onChangeRef.current(clamp(parsed));
      draftRef.current = null;
      setDraft(null);
      editingRef.current = false;
    },
    [clamp],
  );

  const bump = useCallback(
    (delta: number) => {
      const raw = draftRef.current;
      const base =
        raw != null && raw.trim() !== '' ? Number(raw) : valueRef.current;
      const next = clamp((Number.isNaN(base) ? valueRef.current : base) + delta);
      draftRef.current = null;
      setDraft(null);
      editingRef.current = false;
      onChangeRef.current(next);
    },
    [clamp],
  );

  const stepOnce = useCallback(
    (delta: number) => {
      steppedRef.current = true;
      bump(delta);
    },
    [bump],
  );

  const scheduleHoldRepeat = useCallback(
    (delta: number, tick: number) => {
      holdTimerRef.current = setTimeout(() => {
        const raw = draftRef.current;
        const base = raw != null && raw.trim() !== '' ? Number(raw) : valueRef.current;
        const current = Number.isNaN(base) ? valueRef.current : base;
        const next = clamp(current + delta);
        if (next === current) {
          stopHold();
          return;
        }
        bump(delta);
        holdTickRef.current = tick + 1;
        scheduleHoldRepeat(delta, tick + 1);
      }, nextSmoothHoldDelayMs(tick));
    },
    [bump, clamp, stopHold],
  );

  const startHold = useCallback(
    (delta: number) => {
      stepOnce(delta);
      stopHold();
      holdTickRef.current = 0;
      scheduleHoldRepeat(delta, 0);
    },
    [scheduleHoldRepeat, stepOnce, stopHold],
  );

  const displayValue = draft ?? String(value);
  const numericForBounds = draft != null && draft.trim() !== '' ? Number(draft) : value;
  const atMin = (Number.isNaN(numericForBounds) ? value : numericForBounds) <= min;
  const atMax = (Number.isNaN(numericForBounds) ? value : numericForBounds) >= max;

  const inputEl = (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      className="wolf-se-num-compact-input"
      aria-label={ariaLabel}
      value={displayValue}
      onFocus={() => {
        editingRef.current = true;
        const next = String(value);
        draftRef.current = next;
        setDraft(next);
      }}
      onChange={(e) => {
        editingRef.current = true;
        const next = e.target.value.replace(/[^\d]/g, '');
        draftRef.current = next;
        setDraft(next);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={() => {
        commitDraft(draftRef.current);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitDraft(draftRef.current);
          (e.target as HTMLInputElement).blur();
        }
      }}
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

  const rootClass =
    size === 'compact'
      ? 'wolf-se-num-compact wolf-se-num-compact--compact'
      : 'wolf-se-num-compact';

  if (!showSteppers) {
    return (
      <div
        className={`${rootClass} wolf-se-num-compact--plain`}
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
      className={rootClass}
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
          e.stopPropagation();
          if (!atMin) startHold(-step);
        }}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
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
          e.stopPropagation();
          if (!atMax) startHold(step);
        }}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!steppedRef.current && !atMax) stepOnce(step);
        }}
      >
        +
      </button>
    </div>
  );
};
