import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import './wolf-app-select.css';

export type WolfAppSelectOption<T extends string | number = string> = {
  value: T;
  label: string;
};

export interface WolfAppSelectProps<T extends string | number = string> {
  options: readonly WolfAppSelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
}

type MenuCoords = { top: number; left: number; width: number; maxHeight: number };

export function WolfAppSelect<T extends string | number = string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  triggerClassName,
  menuClassName,
}: WolfAppSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const active = options.find((opt) => opt.value === value) ?? options[0] ?? null;
  const activeLabel = active?.label ?? ariaLabel;

  const updateCoords = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(320, openUp ? spaceAbove : spaceBelow));
    const top = openUp
      ? Math.max(8, rect.top - 6 - maxHeight)
      : Math.min(rect.bottom + 6, window.innerHeight - 8);
    setCoords({ top, left, width, maxHeight });
  };

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updateCoords();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onReposition = () => updateCoords();
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  const menu =
    open && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            className={['wolf-app-select__menu', menuClassName].filter(Boolean).join(' ')}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
            }}
          >
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`wolf-app-select__option${selected ? ' wolf-app-select__option--active' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="wolf-app-select__option-label">{opt.label}</span>
                  {selected ? (
                    <Check size={16} strokeWidth={2.25} aria-hidden className="wolf-app-select__check" />
                  ) : null}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={['wolf-app-select', className].filter(Boolean).join(' ')}
    >
      <button
        ref={triggerRef}
        type="button"
        className={['wolf-app-select__trigger', triggerClassName].filter(Boolean).join(' ')}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="wolf-app-select__value">{activeLabel}</span>
        <ChevronDown
          className={`wolf-app-select__chevron${open ? ' is-open' : ''}`}
          size={16}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
}
