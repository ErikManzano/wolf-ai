import React from 'react';
import { parseRepTokens } from '../../services/trainingEngine';
import { ComboNumberField } from './ComboNumberField';
import { ComboPresetField } from './ComboPresetField';
import { SEGMENT_REP_OPTIONS } from './repPresets';
import { spreadsheetRepsOptions, SPREADSHEET_COMBO_MENU_CLASS } from './spreadsheetSetFieldPresets';

interface SegmentRepFieldProps {
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  variant?: 'default' | 'premium';
  suffix?: string;
  'aria-label'?: string;
}

/** Reps por segmento en complejos — dropdown numérico (sin notación 2+1). */
export const SegmentRepField: React.FC<SegmentRepFieldProps> = ({
  value,
  onChange,
  min = 1,
  max = 30,
  variant = 'premium',
  suffix,
  'aria-label': ariaLabel,
}) => {
  const parsed = parseRepTokens(value);
  const numeric = parsed >= min ? Math.min(max, parsed) : min;

  if (variant === 'premium') {
    return (
      <ComboPresetField
        variant="premium"
        value={numeric}
        options={spreadsheetRepsOptions(numeric)}
        onChange={(n) => onChange(String(n))}
        suffix={suffix}
        aria-label={ariaLabel}
        menuClassName={SPREADSHEET_COMBO_MENU_CLASS}
      />
    );
  }

  const options = SEGMENT_REP_OPTIONS.filter((n) => n >= min && n <= max);

  return (
    <ComboNumberField
      variant={variant}
      value={numeric}
      min={min}
      max={max}
      step={1}
      options={options}
      onChange={(n) => onChange(String(n))}
      suffix={suffix}
      aria-label={ariaLabel}
    />
  );
};
