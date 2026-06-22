import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import {
  usePortaledComboMenu,
  type MeasureComboMenuOptions,
} from './comboMenuPortal';

export interface PortaledComboListProps<T> {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  rootRef: RefObject<HTMLElement | null>;
  listId: string;
  ariaLabel?: string;
  options: readonly T[];
  activeIndex: number;
  selectedIndex: number;
  onPick: (index: number) => void;
  onClose: () => void;
  onActiveIndexChange?: (index: number) => void;
  renderOption: (option: T, index: number, isActive: boolean, isSelected: boolean) => ReactNode;
  measureOptions?: MeasureComboMenuOptions;
}

export function PortaledComboList<T>({
  open,
  anchorRef,
  rootRef,
  listId,
  ariaLabel,
  options,
  activeIndex,
  selectedIndex,
  onPick,
  onClose,
  onActiveIndexChange,
  renderOption,
  measureOptions,
}: PortaledComboListProps<T>) {
  const menuRef = useRef<HTMLUListElement>(null);
  const resolvedMeasure = useMemo(
    () => ({ ...measureOptions, optionCount: options.length }),
    [measureOptions, options.length],
  );
  const menuRect = usePortaledComboMenu(open, anchorRef, rootRef, menuRef, onClose, resolvedMeasure);

  useEffect(() => {
    if (!open || !menuRef.current || menuRect?.layout === 'sheet') return;
    const active = menuRef.current.querySelector('.wolf-se-combo-select__option.is-active');
    active?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, options.length, menuRect?.layout]);

  if (!open || typeof document === 'undefined') return null;

  if (!menuRect) return null;
  const rect = menuRect;

  const isSheet = rect.layout === 'sheet';
  const menuClass = [
    'wolf-se-combo-select__menu',
    'wolf-se-combo-select__menu--portal',
    isSheet ? 'wolf-se-combo-select__menu--sheet' : '',
    rect.columns === 2 ? 'wolf-se-combo-select__menu--grid' : '',
    'is-visible',
  ]
    .filter(Boolean)
    .join(' ');

  const menuStyle = isSheet
    ? {
        position: 'fixed' as const,
        left: 0,
        right: 0,
        bottom: 0,
        top: 'auto' as const,
        width: '100%',
        maxHeight: rect.maxHeight,
        height: rect.height,
        overflowY: rect.overflowY,
        transform: 'none',
        zIndex: 10051,
      }
    : {
        position: 'fixed' as const,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        maxHeight: rect.maxHeight,
        height: rect.height,
        overflowY: rect.overflowY,
        transform: rect.transform,
        zIndex: 10050,
      };

  return createPortal(
    <>
      {isSheet ? (
        <button
          type="button"
          className="wolf-se-combo-select__backdrop is-visible"
          aria-label={ariaLabel ? `Cerrar ${ariaLabel}` : 'Close menu'}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
        />
      ) : null}
      <ul
        ref={menuRef}
        id={listId}
        className={menuClass}
        role="listbox"
        aria-label={ariaLabel}
        aria-modal={isSheet ? true : undefined}
        style={menuStyle}
      >
        {isSheet ? (
          <li className="wolf-se-combo-select__sheet-handle" aria-hidden role="presentation" />
        ) : null}
        {options.map((option, index) => {
          const isActive = index === activeIndex;
          const isSelected = index === selectedIndex;
          return (
            <li
              key={index}
              id={`${listId}-opt-${index}`}
              role="option"
              aria-selected={isSelected}
            >
              <button
                type="button"
                className={`wolf-se-combo-select__option${isSelected ? ' is-selected' : ''}${isActive ? ' is-active' : ''}`}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.preventDefault();
                  e.stopPropagation();
                  onPick(index);
                }}
                onMouseEnter={() => onActiveIndexChange?.(index)}
              >
                {renderOption(option, index, isActive, isSelected)}
              </button>
            </li>
          );
        })}
      </ul>
    </>,
    document.body,
  );
}
