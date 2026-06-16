import { Copy, MoreVertical, Pencil, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type ProgramActionsVariant = 'inline' | 'card';

function stopRowClick(event: React.MouseEvent) {
  event.stopPropagation();
}

export function ProgramActionsMenu({
  isEs,
  variant = 'inline',
  onEdit,
  onAssign,
  onDuplicate,
  onDelete,
}: {
  isEs: boolean;
  variant?: ProgramActionsVariant;
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

  if (variant === 'inline') {
    return (
      <div
        className="wl-programs-actions-bar"
        role="toolbar"
        aria-label={isEs ? 'Acciones del programa' : 'Program actions'}
      >
        <button
          type="button"
          className="wl-programs-action-chip wl-programs-action-chip--primary"
          onClick={(event) => {
            stopRowClick(event);
            onEdit();
          }}
        >
          <Pencil size={16} strokeWidth={2.1} aria-hidden />
          <span>{isEs ? 'Editar' : 'Edit'}</span>
        </button>
        <button
          type="button"
          className="wl-programs-action-chip"
          onClick={(event) => {
            stopRowClick(event);
            onAssign();
          }}
        >
          <UserPlus size={16} strokeWidth={2.1} aria-hidden />
          <span>{isEs ? 'Asignar' : 'Assign'}</span>
        </button>
        <button
          type="button"
          className="wl-programs-action-chip"
          onClick={(event) => {
            stopRowClick(event);
            onDuplicate();
          }}
        >
          <Copy size={16} strokeWidth={2.1} aria-hidden />
          <span>{isEs ? 'Duplicar' : 'Duplicate'}</span>
        </button>
        <button
          type="button"
          className="wl-programs-action-chip wl-programs-action-chip--danger"
          onClick={(event) => {
            stopRowClick(event);
            onDelete();
          }}
        >
          <Trash2 size={16} strokeWidth={2.1} aria-hidden />
          <span>{isEs ? 'Eliminar' : 'Delete'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="wl-programs-actions-menu wl-programs-actions-menu--card" ref={ref}>
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
        <MoreVertical size={18} />
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
