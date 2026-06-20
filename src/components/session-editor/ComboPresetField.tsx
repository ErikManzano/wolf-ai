import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PortaledComboList } from './PortaledComboList';
import { wrapOptionIndex } from './comboMenuPortal';

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
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const selected = options[selectedIndex] ?? options[0];
  const isPremium = variant === 'premium';

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  const close = useCallback(() => setOpen(false), []);

  const pickOption = useCallback(
    (index: number) => {
      const opt = options[index];
      if (!opt) return;
      onChange(opt.value);
      setOpen(false);
    },
    [onChange, options],
  );

  const moveActive = useCallback(
    (delta: number) => {
      setActiveIndex((i) => wrapOptionIndex(i + delta, options.length));
    },
    [options.length],
  );

  const toggleOpen = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  const rootClass = [
    'wolf-se-combo-select',
    isPremium ? 'wolf-se-combo-select--premium wolf-se-combo-preset' : '',
    open ? 'is-open' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={rootRef} className={rootClass}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        className="wolf-se-combo-select__input wolf-se-sets-premium__select wolf-se-combo-preset__trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && options[activeIndex] != null ? `${listId}-opt-${activeIndex}` : undefined
        }
        onClick={toggleOpen}
        onKeyDown={(e) => {
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
            if (open) pickOption(activeIndex);
            else setOpen(true);
          }
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
        onPointerDown={(e) => e.preventDefault()}
        onClick={toggleOpen}
      >
        <ChevronDown size={14} strokeWidth={2.25} />
      </button>
      <PortaledComboList
        open={open}
        anchorRef={triggerRef}
        rootRef={rootRef}
        listId={listId}
        ariaLabel={ariaLabel}
        options={options}
        activeIndex={activeIndex}
        selectedIndex={selectedIndex}
        onPick={pickOption}
        onClose={close}
        onActiveIndexChange={setActiveIndex}
        renderOption={(opt) => opt.label}
      />
    </div>
  );
}
