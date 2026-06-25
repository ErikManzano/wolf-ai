import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ExerciseBlockKind } from '../../services/sessionMutations';
import { PortaledComboList } from './PortaledComboList';
import { wrapOptionIndex } from './comboMenuPortal';

type TypeOption = { value: ExerciseBlockKind; label: string; hint: string };

const TYPE_OPTIONS = (isEs: boolean): readonly TypeOption[] => [
  {
    value: 'simple',
    label: isEs ? 'Simple' : 'Single',
    hint: isEs ? 'Un ejercicio por bloque' : 'One exercise per block',
  },
  {
    value: 'complex',
    label: isEs ? 'Complejo' : 'Complex',
    hint: isEs ? 'Varios movimientos enlazados' : 'Linked movements in one set',
  },
  {
    value: 'warmup',
    label: isEs ? 'Calentamiento' : 'Warm-up',
    hint: isEs ? 'Activación antes del trabajo' : 'Activation before work sets',
  },
];

function TypeDot({ kind }: { kind: ExerciseBlockKind }) {
  return <span className={`wolf-se-block-type__dot wolf-se-block-type__dot--${kind}`} aria-hidden />;
}

function TypeMenuOption({
  kind,
  label,
  hint,
  active,
}: {
  kind: ExerciseBlockKind;
  label: string;
  hint: string;
  active?: boolean;
}) {
  return (
    <span className={`wolf-se-block-type__menu-option${active ? ' is-active' : ''}`}>
      <TypeDot kind={kind} />
      <span className="wolf-se-block-type__menu-copy">
        <span className="wolf-se-block-type__menu-label">{label}</span>
        <span className="wolf-se-block-type__menu-hint">{hint}</span>
      </span>
    </span>
  );
}

export interface SpreadsheetBlockTypeSelectProps {
  kind: ExerciseBlockKind;
  isEs: boolean;
  onChange: (kind: ExerciseBlockKind) => void;
}

export const SpreadsheetBlockTypeSelect: React.FC<SpreadsheetBlockTypeSelectProps> = ({
  kind,
  isEs,
  onChange,
}) => {
  const options = TYPE_OPTIONS(isEs);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedIndex = options.findIndex((opt) => opt.value === kind);
  const selected = options[selectedIndex] ?? options[0]!;

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

  const onTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
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
    },
    [activeIndex, moveActive, open, pickOption],
  );

  const ariaLabel = isEs ? 'Tipo de ejercicio' : 'Exercise type';
  const triggerTitle = isEs
    ? 'Tipo de ejercicio — define cómo se prescribe el bloque'
    : 'Exercise type — defines how this block is prescribed';

  const rootClass = [
    'wolf-se-spreadsheet__type-combo',
    `wolf-se-spreadsheet__type-combo--${kind}`,
    open ? 'is-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={rootRef}
      className={rootClass}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        className="wolf-se-spreadsheet__type-trigger"
        aria-label={ariaLabel}
        title={triggerTitle}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && options[activeIndex] != null ? `${listId}-opt-${activeIndex}` : undefined
        }
        onClick={toggleOpen}
        onKeyDown={onTriggerKeyDown}
      >
        <TypeDot kind={kind} />
        <span className="wolf-se-spreadsheet__type-label">{selected.label}</span>
        <ChevronDown size={13} strokeWidth={2.25} className="wolf-se-spreadsheet__type-chevron" aria-hidden />
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
        measureOptions={{ minWidth: 220 }}
        menuClassName="wolf-se-combo-select__menu--block-type"
        renderOption={(opt, _index, isActive) => (
          <TypeMenuOption
            kind={opt.value}
            label={opt.label}
            hint={opt.hint}
            active={isActive}
          />
        )}
      />
    </div>
  );
};
