import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PortaledComboList } from './PortaledComboList';
import { wrapOptionIndex } from './comboMenuPortal';

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
  const skipBlurCommitRef = useRef(false);
  const menuOptions = options ?? buildOptions(min, max, step);
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedIndex = menuOptions.findIndex((opt) => opt === value);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setDraft(null);
  }, [value]);

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

  const pickOption = useCallback(
    (index: number) => {
      const opt = menuOptions[index];
      if (opt == null) return;
      skipBlurCommitRef.current = true;
      onChange(opt);
      setDraft(null);
      setOpen(false);
    },
    [menuOptions, onChange],
  );

  const close = useCallback(() => setOpen(false), []);
  const isPremium = variant === 'premium';

  const moveActive = useCallback(
    (delta: number) => {
      setActiveIndex((i) => wrapOptionIndex(i + delta, menuOptions.length));
    },
    [menuOptions.length],
  );

  const rootClass = [
    'wolf-se-combo-select',
    isPremium ? 'wolf-se-combo-select--premium' : '',
    open ? 'is-open' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={rootRef} className={rootClass}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        role={isPremium ? 'combobox' : undefined}
        className={
          isPremium
            ? 'wolf-se-combo-select__input wolf-se-sets-premium__select'
            : 'wolf-se-combo-select__input'
        }
        list={isPremium ? undefined : listId}
        aria-label={ariaLabel}
        aria-expanded={isPremium ? open : undefined}
        aria-haspopup={isPremium ? 'listbox' : undefined}
        aria-controls={isPremium && open ? listId : undefined}
        aria-activedescendant={
          isPremium && open && menuOptions[activeIndex] != null
            ? `${listId}-opt-${activeIndex}`
            : undefined
        }
        value={display}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onFocus={() => isPremium && setOpen(true)}
        onClick={() => {
          if (isPremium) setOpen(true);
        }}
        onBlur={() => {
          if (skipBlurCommitRef.current) {
            skipBlurCommitRef.current = false;
            return;
          }
          if (draft != null) commit(draft);
        }}
        onKeyDown={(e) => {
          if (!isPremium) {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(draft ?? String(value));
              inputRef.current?.blur();
            }
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!open) setOpen(true);
            else moveActive(1);
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) setOpen(true);
            else moveActive(-1);
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            if (open && menuOptions[activeIndex] != null) {
              pickOption(activeIndex);
              return;
            }
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
          {suffix ? (
            <span className="wolf-se-combo-select__suffix wolf-se-combo-select__suffix--inline">{suffix}</span>
          ) : null}
          <button
            type="button"
            className="wolf-se-combo-select__chevron"
            tabIndex={-1}
            aria-hidden
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              setOpen((v) => {
                if (!v) requestAnimationFrame(() => inputRef.current?.focus());
                return !v;
              });
            }}
          >
            <ChevronDown size={14} strokeWidth={2.25} />
          </button>
          <PortaledComboList
            open={open}
            anchorRef={inputRef}
            rootRef={rootRef}
            listId={listId}
            ariaLabel={ariaLabel}
            options={menuOptions}
            activeIndex={activeIndex}
            selectedIndex={selectedIndex}
            onPick={pickOption}
            onClose={close}
            onActiveIndexChange={setActiveIndex}
            renderOption={(opt) => (
              <>
                {opt}
                {suffix ? suffix : ''}
              </>
            )}
          />
        </>
      ) : null}
    </div>
  );
};
