import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PortaledComboList } from './PortaledComboList';
import { wrapOptionIndex } from './comboMenuPortal';
import { isValidSegmentRepToken, sanitizeSegmentRepInput } from './repPresets';

export interface ComboTextFieldProps {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  'aria-label'?: string;
  placeholder?: string;
  className?: string;
  /** When true, only allow segment rep notation (digits and +). */
  segmentRepMode?: boolean;
}

export const ComboTextField: React.FC<ComboTextFieldProps> = ({
  value,
  options,
  onChange,
  'aria-label': ariaLabel,
  placeholder,
  className,
  segmentRepMode = false,
}) => {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommitRef = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedIndex = options.findIndex((opt) => opt === value);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  const commit = useCallback(
    (raw: string | null) => {
      const trimmed = (raw ?? '').trim();
      if (!trimmed) {
        setDraft(null);
        return;
      }
      if (segmentRepMode && !isValidSegmentRepToken(trimmed)) {
        setDraft(null);
        return;
      }
      onChange(trimmed);
      setDraft(null);
    },
    [onChange, segmentRepMode],
  );

  const display = draft ?? value;

  const pickOption = useCallback(
    (index: number) => {
      const opt = options[index];
      if (opt == null) return;
      skipBlurCommitRef.current = true;
      onChange(opt);
      setDraft(null);
      setOpen(false);
    },
    [onChange, options],
  );

  const close = useCallback(() => setOpen(false), []);

  const moveActive = useCallback(
    (delta: number) => {
      setActiveIndex((i) => wrapOptionIndex(i + delta, options.length));
    },
    [options.length],
  );

  const rootClass = ['wolf-se-combo-text', open ? 'is-open' : '', className ?? ''].filter(Boolean).join(' ');

  return (
    <div ref={rootRef} className={rootClass}>
      <input
        ref={inputRef}
        type="text"
        inputMode={segmentRepMode ? 'text' : 'numeric'}
        role="combobox"
        className="wolf-se-combo-text__input wolf-se-num-compact-input wolf-se-rep-input"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && options[activeIndex] != null ? `${listId}-opt-${activeIndex}` : undefined
        }
        value={display}
        placeholder={placeholder}
        onChange={(e) => {
          const next = segmentRepMode ? sanitizeSegmentRepInput(e.target.value) : e.target.value;
          setDraft(next);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (skipBlurCommitRef.current) {
            skipBlurCommitRef.current = false;
            return;
          }
          if (draft != null) commit(draft);
        }}
        onPointerDown={(e) => e.stopPropagation()}
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
            if (open && options[activeIndex] != null) {
              pickOption(activeIndex);
              return;
            }
            commit(draft ?? value);
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
      <button
        type="button"
        className="wolf-se-combo-text__chevron"
        tabIndex={-1}
        aria-label={ariaLabel ? `${ariaLabel} presets` : 'Show presets'}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => {
          setOpen((v) => {
            if (!v) requestAnimationFrame(() => inputRef.current?.focus());
            return !v;
          });
        }}
      >
        <ChevronDown size={12} strokeWidth={2.25} aria-hidden />
      </button>
      <PortaledComboList
        open={open}
        anchorRef={inputRef}
        rootRef={rootRef}
        listId={listId}
        ariaLabel={ariaLabel}
        options={options}
        activeIndex={activeIndex}
        selectedIndex={selectedIndex}
        onPick={pickOption}
        onClose={close}
        onActiveIndexChange={setActiveIndex}
        renderOption={(opt) => opt}
      />
    </div>
  );
};
