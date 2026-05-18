import React from 'react';

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
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div className="wolf-se-num-compact" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        tabIndex={-1}
        aria-label={ariaLabel ? `${ariaLabel} decrease` : 'Decrease'}
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        className=""
        aria-label={ariaLabel}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        onWheel={(e) => {
          e.preventDefault();
          onChange(clamp(value + (e.deltaY < 0 ? step : -step)));
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={ariaLabel ? `${ariaLabel} increase` : 'Increase'}
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </button>
    </div>
  );
};
