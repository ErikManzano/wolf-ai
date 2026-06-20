import React, { useCallback, useEffect, useRef } from 'react';
import { parseRepTokens } from '../../services/trainingEngine';
import { ComboTextField } from './ComboTextField';
import { SEGMENT_REP_PRESETS } from './repPresets';
import { nextSmoothHoldDelayMs } from './smoothHold';

interface SegmentRepFieldProps {
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  'aria-label'?: string;
}

/** Reps por segmento en complejos — texto (2+1) o entero, con ± y presets. */
export const SegmentRepField: React.FC<SegmentRepFieldProps> = ({
  value,
  onChange,
  min = 1,
  max = 30,
  'aria-label': ariaLabel,
}) => {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTickRef = useRef(0);
  const steppedRef = useRef(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  valueRef.current = value;
  onChangeRef.current = onChange;

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

  const clampTotal = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max]);

  const bump = useCallback(
    (delta: number) => {
      const base = parseRepTokens(valueRef.current);
      const next = clampTotal(base + delta);
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

  const scheduleHoldRepeat = useCallback(
    (delta: number, tick: number) => {
      holdTimerRef.current = setTimeout(() => {
        const base = parseRepTokens(valueRef.current);
        const next = clampTotal(base + delta);
        if (next === base) {
          stopHold();
          return;
        }
        bump(delta);
        holdTickRef.current = tick + 1;
        scheduleHoldRepeat(delta, tick + 1);
      }, nextSmoothHoldDelayMs(tick));
    },
    [bump, clampTotal, stopHold],
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

  const numericForBounds = parseRepTokens(value);
  const atMin = numericForBounds <= min;
  const atMax = numericForBounds >= max;

  return (
    <div
      className="wolf-se-num-compact wolf-se-num-compact--segment wolf-se-num-compact--segment-combo"
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
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!steppedRef.current && !atMin) stepOnce(-1);
        }}
      >
        −
      </button>
      <div className="wolf-se-num-compact-value wolf-se-num-compact-value--combo">
        <ComboTextField
          value={value}
          options={SEGMENT_REP_PRESETS}
          onChange={onChange}
          aria-label={ariaLabel}
          placeholder="2+1"
          segmentRepMode
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
        onContextMenu={(e) => e.preventDefault()}
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
