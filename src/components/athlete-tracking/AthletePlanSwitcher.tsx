import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import type { ProgramAssignment } from '../../models/training';
import './athlete-plan-select.css';

export interface AthletePlanSelectProps {
  assignments: ProgramAssignment[];
  activeAssignmentId: string;
  isEs: boolean;
  onSelect: (assignmentId: string) => void;
  showLabel?: boolean;
  className?: string;
}

type MenuCoords = { top: number; left: number; width: number; maxHeight: number };

export const AthletePlanSelect: React.FC<AthletePlanSelectProps> = ({
  assignments,
  activeAssignmentId,
  isEs,
  onSelect,
  showLabel = true,
  className,
}) => {
  const selectLabel = isEs ? 'Programa' : 'Program';
  const rootClass = ['wolf-athlete-plan-select', className].filter(Boolean).join(' ');
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const activeAssignment =
    assignments.find((asg) => asg.id === activeAssignmentId) ?? assignments[0] ?? null;
  const activeLabel = activeAssignment?.program.name ?? selectLabel;

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
            className="wolf-athlete-plan-select__menu"
            role="listbox"
            aria-label={selectLabel}
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
            }}
          >
            {assignments.map((asg) => {
              const selected = asg.id === activeAssignmentId;
              return (
                <button
                  key={asg.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`wolf-athlete-plan-select__option${
                    selected ? ' wolf-athlete-plan-select__option--active' : ''
                  }`}
                  onClick={() => {
                    onSelect(asg.id);
                    setOpen(false);
                  }}
                >
                  <span className="wolf-athlete-plan-select__option-label">{asg.program.name}</span>
                  {selected ? (
                    <Check size={16} strokeWidth={2.25} aria-hidden className="wolf-athlete-plan-select__check" />
                  ) : null}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={rootClass}>
      {showLabel ? (
        <span className="wolf-athlete-plan-select__label">{selectLabel}</span>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        className="wolf-athlete-plan-select__trigger"
        aria-label={selectLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="wolf-athlete-plan-select__value">{activeLabel}</span>
        <ChevronDown
          className={`wolf-athlete-plan-select__chevron${open ? ' is-open' : ''}`}
          size={16}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
};

/** @deprecated Use AthletePlanSelect in sticky nav */
export const AthletePlanSwitcher = AthletePlanSelect;
