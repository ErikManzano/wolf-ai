import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ExerciseFamilyCode } from '../../models/exercise';
import { FamilyAvatar } from './FamilyAvatar';
import { FAMILY_CHIP_ORDER, FAMILY_DISPLAY_LABEL } from './exerciseListUtils';
import type { ExerciseFamilyId } from './types';

const WEIGHTLIFTING_FAMILIES = FAMILY_CHIP_ORDER.filter((code) => code !== 'accessory');

export function ExerciseTechnicalFamilySelect({
  isEs,
  value,
  onChange,
  className,
}: {
  isEs: boolean;
  value: ExerciseFamilyCode;
  onChange: (family: ExerciseFamilyCode) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = FAMILY_DISPLAY_LABEL[value as ExerciseFamilyId] ?? value;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={`wl-exercise-family-select${className ? ` ${className}` : ''}`} ref={rootRef}>
      <button
        type="button"
        className="wl-exercise-family-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={isEs ? `Familia técnica: ${label}` : `Technical family: ${label}`}
        onClick={() => setOpen((current) => !current)}
      >
        <FamilyAvatar family={value as ExerciseFamilyId} size={28} />
        <span className="wl-exercise-family-select__text">
          <span className="wl-exercise-family-select__label">{label}</span>
        </span>
        <ChevronDown size={15} strokeWidth={2.25} aria-hidden className="wl-exercise-family-select__chevron" />
      </button>

      {open ? (
        <ul
          className="wl-exercise-family-select__menu"
          role="listbox"
          aria-label={isEs ? 'Familia técnica' : 'Technical family'}
        >
          {WEIGHTLIFTING_FAMILIES.map((code) => {
            const optionLabel = FAMILY_DISPLAY_LABEL[code as ExerciseFamilyId] ?? code;
            const active = value === code;
            return (
              <li key={code} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`wl-exercise-family-select__option${active ? ' is-active' : ''}`}
                  onClick={() => {
                    onChange(code);
                    setOpen(false);
                  }}
                >
                  <FamilyAvatar family={code as ExerciseFamilyId} size={28} />
                  <span className="wl-exercise-family-select__text">
                    <span className="wl-exercise-family-select__label">{optionLabel}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
