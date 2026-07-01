import React, { useId, useState } from 'react';
import { WL_EDITOR_TITLE_MAX_LEN } from '../wl-shared/WlEditorTitleField';

export interface WlProgramMobileHeaderTitleProps {
  isEs: boolean;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

export const WlProgramMobileHeaderTitle: React.FC<WlProgramMobileHeaderTitleProps> = ({
  isEs,
  value,
  onChange,
  onBlur,
  maxLength = WL_EDITOR_TITLE_MAX_LEN,
  placeholder,
  inputRef,
}) => {
  const fieldId = useId();
  const [focused, setFocused] = useState(false);
  const label = isEs ? 'Nombre del plan' : 'Plan name';
  const trimmed = value.trim();
  const missing = trimmed.length === 0;

  const handleBlur = () => {
    setFocused(false);
    const next = value.trim();
    if (next !== value) onChange(next);
    onBlur?.(next);
  };

  return (
    <div
      className={`mobile-header-title-field${focused ? ' mobile-header-title-field--focused' : ''}${missing ? ' mobile-header-title-field--empty' : ''}`}
    >
      <input
        ref={inputRef}
        id={fieldId}
        type="text"
        className="mobile-header-title-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        maxLength={maxLength + 4}
        placeholder={placeholder ?? (isEs ? 'Nombre del mesociclo' : 'Mesocycle name')}
        aria-label={label}
        aria-invalid={missing || undefined}
        autoComplete="off"
        enterKeyHint="done"
      />
      {focused ? (
        <span className="mobile-header-title-counter" aria-live="polite">
          {value.length}/{maxLength}
        </span>
      ) : null}
    </div>
  );
};

export default WlProgramMobileHeaderTitle;
