import React from 'react';

const PRESETS = [70, 75, 80, 85, 90] as const;

interface IntensityPresetBarProps {
  value: number;
  onChange: (pct: number) => void;
  isEs?: boolean;
}

export const IntensityPresetBar: React.FC<IntensityPresetBarProps> = ({ value, onChange, isEs }) => (
  <div
    className="mwl-intensity-bar"
    role="group"
    aria-label={isEs ? 'Presets de intensidad' : 'Intensity presets'}
  >
    {PRESETS.map((pct) => (
      <button
        key={pct}
        type="button"
        className={`mwl-intensity-chip${value === pct ? ' is-active' : ''}`}
        onClick={() => onChange(pct)}
      >
        {pct}%
      </button>
    ))}
  </div>
);
