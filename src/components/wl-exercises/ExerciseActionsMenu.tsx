import { Archive, Copy, GitFork, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type MenuCoords = { top: number; left: number; minWidth: number };

function stopCardClick(event: React.MouseEvent) {
  event.stopPropagation();
}

export function ExerciseActionsMenu({
  isEs,
  isOfficial,
  onEdit,
  onPersonalize,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  isEs: boolean;
  isOfficial: boolean;
  onEdit: () => void;
  onPersonalize: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
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
    const minWidth = 188;
    const menuHeight = isOfficial ? 148 : 188;
    const left = Math.min(Math.max(8, rect.right - minWidth), window.innerWidth - minWidth - 8);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
    const top = openUp
      ? Math.max(8, rect.top - 6 - menuHeight)
      : Math.min(rect.bottom + 6, window.innerHeight - 8);
    setCoords({ top, left, minWidth });
  };

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updateCoords();
  }, [open, isOfficial]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onReposition = () => updateCoords();
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, isOfficial]);

  const run = (event: React.MouseEvent, action: () => void) => {
    stopCardClick(event);
    setOpen(false);
    action();
  };

  const menu =
    open && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            className="wl-exercises-actions-menu__list wl-exercises-actions-menu__list--portal"
            role="menu"
            style={{ top: coords.top, left: coords.left, minWidth: coords.minWidth }}
          >
            {isOfficial ? (
              <button type="button" role="menuitem" onClick={(event) => run(event, onPersonalize)}>
                <GitFork size={14} aria-hidden /> {isEs ? 'Personalizar' : 'Personalize'}
              </button>
            ) : (
              <button type="button" role="menuitem" onClick={(event) => run(event, onEdit)}>
                <Pencil size={14} aria-hidden /> {isEs ? 'Editar' : 'Edit'}
              </button>
            )}
            <button type="button" role="menuitem" onClick={(event) => run(event, onDuplicate)}>
              <Copy size={14} aria-hidden /> {isEs ? 'Duplicar' : 'Duplicate'}
            </button>
            <button type="button" role="menuitem" onClick={(event) => run(event, onArchive)}>
              <Archive size={14} aria-hidden /> {isEs ? 'Archivar' : 'Archive'}
            </button>
            {!isOfficial ? (
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={(event) => run(event, onDelete)}
              >
                <Trash2 size={14} aria-hidden /> {isEs ? 'Eliminar' : 'Delete'}
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="wl-exercises-actions-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="wl-exercises-actions-menu__trigger"
        aria-label={isEs ? 'Acciones del ejercicio' : 'Exercise actions'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreVertical size={18} />
      </button>
      {menu}
    </div>
  );
}
