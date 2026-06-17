import React, { useCallback, useEffect, useRef, useState } from 'react';
import { parseRepTokens } from '../../services/trainingEngine';

interface SegmentRepFieldProps {
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  'aria-label'?: string;
}

/** Reps por segmento en complejos — texto (2+1) o entero, con ±. */
export const SegmentRepField: React.FC<SegmentRepFieldProps> = ({
  value,
  onChange,
  min = 1,
  max = 30,
  'aria-label': ariaLabel,
}) => {
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const steppedRef = useRef(false);
  const editingRef = useRef(false);
  const draftRef = useRef<string | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const [draft, setDraft] = useState<string | null>(null);

  valueRef.current = value;
  onChangeRef.current = onChange;

  const stopHold = useCallback(() => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
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

  const clampTotal = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max]);

  const commitDraft = useCallback((raw: string | null) => {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) {
      draftRef.current = null;
      setDraft(null);
      editingRef.current = false;
      return;
    }
    onChangeRef.current(trimmed);
    draftRef.current = null;
    setDraft(null);
    editingRef.current = false;
  }, []);

  const bump = useCallback(
    (delta: number) => {
      const base = parseRepTokens(draftRef.current ?? valueRef.current);
      const next = clampTotal(base + delta);
      draftRef.current = null;
      setDraft(null);
      editingRef.current = false;
      onChangeRef.current(String(next));
    },
    [clampTotal],
  );

  const stepOnce = useCallback(
    (delta: number) => {
      steppedRef.current = true;
      bump(delta);
    },
    [bump],
  );

  const startHold = useCallback(
    (delta: number) => {
      stepOnce(delta);
      stopHold();
      holdRef.current = setInterval(() => bump(delta), 120);
    },
    [bump, stepOnce, stopHold],
  );

  const displayValue = draft ?? value;
  const numericForBounds = parseRepTokens(draft ?? value);
  const atMin = numericForBounds <= min;
  const atMax = numericForBounds >= max;

  return (
    <div
      className="wolf-se-num-compact wolf-se-num-compact--segment"
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
        aria-label={ariaLabel ? `${ariaLabel} −` : 'Decrease reps'}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!atMin) startHold(-1);
        }}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!steppedRef.current && !atMin) stepOnce(-1);
        }}
      >
        −
      </button>
      <div className="wolf-se-num-compact-value">
        <input
          type="text"
          inputMode="text"
          className="wolf-se-num-compact-input wolf-se-rep-input"
          aria-label={ariaLabel}
          value={displayValue}
          placeholder="2+1"
          onFocus={() => {
            editingRef.current = true;
            draftRef.current = value;
            setDraft(value);
          }}
          onChange={(e) => {
            editingRef.current = true;
            draftRef.current = e.target.value;
            setDraft(e.target.value);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={() => commitDraft(draftRef.current)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitDraft(draftRef.current);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
      <button
        type="button"
        tabIndex={-1}
        className="wolf-se-num-compact-btn"
        disabled={atMax}
        aria-label={ariaLabel ? `${ariaLabel} +` : 'Increase reps'}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!atMax) startHold(1);
        }}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!steppedRef.current && !atMax) stepOnce(1);
        }}
      >
        +
      </button>
    </div>
  );
};
