import React, { useCallback } from 'react';
import { Delete } from 'lucide-react';
import '../mobile-wl.css';

interface CoachNumpadProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export const CoachNumpad: React.FC<CoachNumpadProps> = ({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}) => {
  const clamp = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max]);

  const append = (digit: number) => {
    const next = value === 0 ? digit : Number(`${value}${digit}`);
    onChange(clamp(next));
  };

  const backspace = () => {
    const s = String(value);
    onChange(clamp(s.length <= 1 ? min : Number(s.slice(0, -1)) || min));
  };

  const bump = (delta: number) => onChange(clamp(value + delta));

  const keys: (number | 'back' | 'plus' | 'minus')[] = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 'minus', 0, 'plus',
  ];

  return (
    <div>
      {label ? <span className="mwl-field-label">{label}</span> : null}
      <div className="mwl-numpad-display" aria-live="polite">
        {value}
      </div>
      <div className="mwl-numpad-grid">
        {keys.map((k, i) => {
          if (k === 'back') {
            return (
              <button
                key={`k-${i}`}
                type="button"
                className="mwl-numpad-key mwl-numpad-key--wide"
                aria-label="Backspace"
                onClick={backspace}
              >
                <Delete size={18} />
              </button>
            );
          }
          if (k === 'plus') {
            return (
              <button key={`k-${i}`} type="button" className="mwl-numpad-key" onClick={() => bump(1)}>
                +1
              </button>
            );
          }
          if (k === 'minus') {
            return (
              <button key={`k-${i}`} type="button" className="mwl-numpad-key" onClick={() => bump(-1)}>
                −1
              </button>
            );
          }
          return (
            <button key={`k-${i}`} type="button" className="mwl-numpad-key" onClick={() => append(k)}>
              {k}
            </button>
          );
        })}
        <button
          type="button"
          className="mwl-numpad-key"
          aria-label="Clear"
          onClick={() => onChange(min)}
        >
          C
        </button>
      </div>
    </div>
  );
};
