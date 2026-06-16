import { MoreHorizontal, MoreVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function ProgramActionsMenu({
  isEs,
  variant = 'table',
  onEdit,
  onAssign,
  onDuplicate,
  onDelete,
}: {
  isEs: boolean;
  variant?: 'table' | 'card';
  onEdit: () => void;
  onAssign: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClickAway);
    return () => window.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const MenuIcon = variant === 'card' ? MoreVertical : MoreHorizontal;

  return (
    <div
      className={`wl-programs-actions-menu${variant === 'card' ? ' wl-programs-actions-menu--card' : ''}`}
      ref={ref}
    >
      <button
        type="button"
        className="wl-programs-actions-menu__trigger"
        aria-label={isEs ? 'Acciones del programa' : 'Program actions'}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MenuIcon size={variant === 'card' ? 18 : 16} />
      </button>
      {open ? (
        <div className="wl-programs-actions-menu__list">
          <button type="button" onClick={onEdit}>
            {isEs ? 'Editar' : 'Edit'}
          </button>
          <button type="button" onClick={onAssign}>
            {isEs ? 'Asignar atleta' : 'Assign athlete'}
          </button>
          <button type="button" onClick={onDuplicate}>
            {isEs ? 'Duplicar' : 'Duplicate'}
          </button>
          <button type="button" className="is-danger" onClick={onDelete}>
            {isEs ? 'Eliminar' : 'Delete'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
