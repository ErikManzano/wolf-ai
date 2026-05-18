import React from 'react';

interface PresetChipsProps {
  values: readonly number[];
  active?: number;
  onSelect: (v: number) => void;
  suffix?: string;
  format?: (v: number) => string;
  'aria-label'?: string;
}

export const PresetChips: React.FC<PresetChipsProps> = ({
  values,
  active,
  onSelect,
  suffix = '',
  format = (v) => String(v),
  'aria-label': ariaLabel,
}) => (
  <div role="group" aria-label={ariaLabel} className="wolf-se-chip-row">
    {values.map((v) => (
      <button
        key={v}
        type="button"
        className={`wolf-se-pct-chip ${active === v ? 'active' : ''}`}
        aria-pressed={active === v}
        onClick={() => onSelect(v)}
      >
        {format(v)}
        {suffix}
      </button>
    ))}
  </div>
);
