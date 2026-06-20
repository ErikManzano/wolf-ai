import { useCallback, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { usePortaledComboMenu } from './comboMenuPortal';

export interface ComboPresetOption<T extends string | number> {
  value: T;
  label: string;
}

export interface ComboPresetFieldProps<T extends string | number> {
  value: T;
  options: readonly ComboPresetOption<T>[];
  onChange: (value: T) => void;
  'aria-label'?: string;
  className?: string;
  variant?: 'premium';
}

export function ComboPresetField<T extends string | number>({
  value,
  options,
  onChange,
  'aria-label': ariaLabel,
  className,
  variant = 'premium',
}: ComboPresetFieldProps<T>) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const menuRect = usePortaledComboMenu(open, triggerRef, rootRef, menuRef, close);

  const selected = options.find((opt) => opt.value === value) ?? options[0];
  const isPremium = variant === 'premium';

  const rootClass = [
    'wolf-se-combo-select',
    isPremium ? 'wolf-se-combo-select--premium wolf-se-combo-preset' : '',
    open ? 'is-open' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const pickOption = (opt: ComboPresetOption<T>) => {
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.blur();
  };

  const menu =
    open && menuRect && typeof document !== 'undefined' ? (
      <ul
        ref={menuRef}
        id={listId}
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
        {options.map((opt) => (
          <li key={String(opt.value)} role="option" aria-selected={opt.value === value}>
            <button
              type="button"
              className={`wolf-se-combo-select__option${opt.value === value ? ' is-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickOption(opt)}
            >
              {opt.label}
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div ref={rootRef} className={rootClass}>
      <button
        ref={triggerRef}
        type="button"
        className="wolf-se-combo-select__input wolf-se-sets-premium__select wolf-se-combo-preset__trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            triggerRef.current?.blur();
          }
        }}
      >
        <span className="wolf-se-combo-preset__value">{selected?.label ?? ''}</span>
      </button>
      <button
        type="button"
        className="wolf-se-combo-select__chevron"
        tabIndex={-1}
        aria-hidden
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setOpen((v) => !v);
          triggerRef.current?.focus();
        }}
      >
        <ChevronDown size={14} strokeWidth={2.25} />
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
