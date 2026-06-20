import React, { useCallback, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { usePortaledComboMenu } from './comboMenuPortal';

export interface ComboNumberFieldProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  options?: number[];
  suffix?: string;
  onChange: (value: number) => void;
  'aria-label'?: string;
  className?: string;
  variant?: 'default' | 'premium';
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function buildOptions(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  for (let n = min; n <= max; n += step) out.push(n);
  return out;
}

export const ComboNumberField: React.FC<ComboNumberFieldProps> = ({
  value,
  min,
  max,
  step = 1,
  options,
  suffix,
  onChange,
  'aria-label': ariaLabel,
  className,
  variant = 'default',
}) => {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuOptions = options ?? buildOptions(min, max, step);
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const commit = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setDraft(null);
        return;
      }
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed)) {
        setDraft(null);
        return;
      }
      onChange(clamp(Math.round(parsed), min, max));
      setDraft(null);
    },
    [max, min, onChange],
  );

  const display = draft ?? String(value);

  const pickOption = (opt: number) => {
    onChange(opt);
    setDraft(null);
    setOpen(false);
    inputRef.current?.blur();
  };

  const close = useCallback(() => setOpen(false), []);
  const isPremium = variant === 'premium';
  const menuRect = usePortaledComboMenu(isPremium && open, inputRef, rootRef, menuRef, close);

  const rootClass = [
    'wolf-se-combo-select',
    isPremium ? 'wolf-se-combo-select--premium' : '',
    open ? 'is-open' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const menu =
    isPremium && open && menuRect && typeof document !== 'undefined' ? (
      <ul
        ref={menuRef}
        className="wolf-se-combo-select__menu wolf-se-combo-select__menu--portal"
        role="listbox"
        aria-label={ariaLabel}
        style={{
          position: 'fixed',
          top: menuRect.top,
          left: menuRect.left,
          width: menuRect.width,
          maxHeight: menuRect.maxHeight,
          transform: menuRect.transform,
          zIndex: 1200,
        }}
      >
        {menuOptions.map((opt) => (
          <li key={opt} role="option" aria-selected={opt === value}>
            <button
              type="button"
              className={`wolf-se-combo-select__option${opt === value ? ' is-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickOption(opt)}
            >
              {opt}
              {suffix ? suffix : ''}
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div ref={rootRef} className={rootClass}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className={
          isPremium
            ? 'wolf-se-combo-select__input wolf-se-sets-premium__select'
            : 'wolf-se-combo-select__input'
        }
        list={isPremium ? undefined : listId}
        aria-label={ariaLabel}
        aria-expanded={isPremium ? open : undefined}
        aria-haspopup={isPremium ? 'listbox' : undefined}
        value={display}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onFocus={() => isPremium && setOpen(true)}
        onBlur={() => {
          commit(draft ?? String(value));
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(draft ?? String(value));
            setOpen(false);
            inputRef.current?.blur();
          }
          if (e.key === 'Escape') {
            setDraft(null);
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
      />
      {!isPremium ? (
        <datalist id={listId}>
          {menuOptions.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      ) : null}
      {suffix && !isPremium ? <span className="wolf-se-combo-select__suffix">{suffix}</span> : null}
      {isPremium ? (
        <>
          {suffix ? <span className="wolf-se-combo-select__suffix wolf-se-combo-select__suffix--inline">{suffix}</span> : null}
          <button
            type="button"
            className="wolf-se-combo-select__chevron"
            tabIndex={-1}
            aria-hidden
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setOpen((v) => !v);
              inputRef.current?.focus();
            }}
          >
            <ChevronDown size={14} strokeWidth={2.25} />
          </button>
          {menu ? createPortal(menu, document.body) : null}
        </>
      ) : null}
    </div>
  );
};
