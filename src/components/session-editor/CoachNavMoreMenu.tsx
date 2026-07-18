import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Trash2 } from 'lucide-react';

export interface CoachNavMoreMenuProps {
  ariaLabel: string;
  removeLabel: string;
  canRemove: boolean;
  onRemove: () => void;
  className?: string;
  triggerClassName?: string;
}

type MenuCoords = { top: number; left: number; minWidth: number };

export const CoachNavMoreMenu: React.FC<CoachNavMoreMenuProps> = ({
  ariaLabel,
  removeLabel,
  canRemove,
  onRemove,
  className,
  triggerClassName,
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const updateCoords = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.max(188, rect.width);
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8,
    );
    const top = Math.min(rect.bottom + 6, window.innerHeight - 8);
    setCoords({ top, left, minWidth: menuWidth });
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

  if (!canRemove) return null;

  const menu =
    open && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            className="wolf-coach-nav-more__menu wolf-coach-nav-more__menu--portal"
            role="menu"
            style={{
              top: coords.top,
              left: coords.left,
              minWidth: coords.minWidth,
            }}
          >
            <button
              type="button"
              role="menuitem"
              className="wolf-coach-nav-more__item wolf-coach-nav-more__item--danger"
              onClick={() => {
                setOpen(false);
                onRemove();
              }}
            >
              <Trash2 size={16} strokeWidth={2} aria-hidden />
              <span>{removeLabel}</span>
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={['wolf-coach-nav-more', className].filter(Boolean).join(' ')}
    >
      <button
        ref={triggerRef}
        type="button"
        className={['wolf-coach-nav-more__trigger', triggerClassName].filter(Boolean).join(' ')}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVertical size={16} strokeWidth={2.25} aria-hidden />
      </button>
      {menu}
    </div>
  );
};
