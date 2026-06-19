import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface WlFormNumberStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  'aria-label': string;
  decrementAria: string;
  incrementAria: string;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const WlFormNumberStepper: React.FC<WlFormNumberStepperProps> = ({
  value,
  min,
  max,
  onChange,
  'aria-label': ariaLabel,
  decrementAria,
  incrementAria,
}) => {
  const handleInput = (raw: string) => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    onChange(clamp(parsed, min, max));
  };

  return (
    <div className="wl-form-sheet-stepper" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className="wl-form-sheet-stepper__btn"
        disabled={value <= min}
        aria-label={decrementAria}
        onClick={() => onChange(clamp(value - 1, min, max))}
      >
        <Minus size={16} strokeWidth={2.5} aria-hidden />
      </button>
      <input
        type="number"
        className="wl-form-sheet-stepper__input"
        value={value}
        min={min}
        max={max}
        aria-label={ariaLabel}
        onChange={(e) => handleInput(e.target.value)}
      />
      <button
        type="button"
        className="wl-form-sheet-stepper__btn"
        disabled={value >= max}
        aria-label={incrementAria}
        onClick={() => onChange(clamp(value + 1, min, max))}
      >
        <Plus size={16} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
};
