import React, { useId, useState } from 'react';
import { Pencil } from 'lucide-react';
import './wl-editor-title.css';

export const WL_EDITOR_TITLE_MAX_LEN = 48;

export interface WlEditorTitleFieldProps {
  isEs: boolean;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  label: string;
  required?: boolean;
  readOnly?: boolean;
  className?: string;
}

export const WlEditorTitleField: React.FC<WlEditorTitleFieldProps> = ({
  isEs,
  value,
  onChange,
  onBlur,
  maxLength = WL_EDITOR_TITLE_MAX_LEN,
  placeholder,
  label,
  required = false,
  readOnly = false,
  className,
}) => {
  const fieldId = useId();
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);

  const trimmed = value.trim();
  const tooLong = value.length > maxLength;
  const missing = required && trimmed.length === 0;
  const invalid = tooLong || (touched && missing);
  const counterThreshold = Math.floor(maxLength * 0.75);
  const showCounter = focused || value.length >= counterThreshold || tooLong;

  const handleBlur = () => {
    setTouched(true);
    setFocused(false);
    const next = value.trim();
    if (next !== value) onChange(next);
    onBlur?.(next);
  };

  const counterClass =
    tooLong ? 'wl-editor-title-counter wl-editor-title-counter--warn' : 'wl-editor-title-counter';

  return (
    <div className={`wl-editor-title-field${className ? ` ${className}` : ''}`}>
      <label className="wl-editor-title-field__label" htmlFor={fieldId}>
        {label}
        {required ? <span className="wl-editor-title-field__required" aria-hidden> *</span> : null}
      </label>

      <div
        className={`wl-editor-title-wrap${invalid ? ' wl-editor-title-wrap--invalid' : ''}${focused ? ' wl-editor-title-wrap--focused' : ''}${readOnly ? ' wl-editor-title-wrap--readonly' : ''}`}
      >
        <Pencil size={17} strokeWidth={2.1} className="wl-editor-title-icon" aria-hidden />
        <input
          id={fieldId}
          type="text"
          className="wl-editor-title-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          maxLength={maxLength + 4}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={invalid}
          aria-required={required || undefined}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </div>

      <div className="wl-editor-title-meta">
        <div className="wl-editor-title-meta__errors">
          {tooLong && touched ? (
            <span className="wl-editor-title-error" role="alert">
              {isEs ? `Máximo ${maxLength} caracteres.` : `Maximum ${maxLength} characters.`}
            </span>
          ) : touched && missing ? (
            <span className="wl-editor-title-error" role="alert">
              {isEs ? 'El nombre es obligatorio.' : 'Name is required.'}
            </span>
          ) : focused && !readOnly ? (
            <span className="wl-editor-title-hint">
              {isEs ? 'Pulsa Enter o haz clic fuera para confirmar.' : 'Press Enter or click away to confirm.'}
            </span>
          ) : null}
        </div>

        {showCounter && !readOnly ? (
          <span className={counterClass} aria-live="polite">
            {value.length}/{maxLength}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default WlEditorTitleField;
