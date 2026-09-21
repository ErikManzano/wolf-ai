import { KeyRound, MoreVertical, Pencil, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type AthleteActionsVariant = 'inline' | 'card';

function stopRowClick(event: React.MouseEvent) {
  event.stopPropagation();
}

export function AthleteActionsMenu({
  isEs,
  variant = 'inline',
  hasProgram,
  hasAccess,
  onEdit,
  onAssign,
  onUnassign,
  onInvite,
  onDelete,
}: {
  isEs: boolean;
  variant?: AthleteActionsVariant;
  hasProgram: boolean;
  hasAccess: boolean;
  onEdit: () => void;
  onAssign: () => void;
  onUnassign: () => void;
  onInvite: () => void;
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

  const run = (event: React.MouseEvent, action: () => void) => {
    stopRowClick(event);
    setOpen(false);
    action();
  };

  if (variant === 'inline') {
    return (
      <div
        className="wl-athletes-actions-bar"
        role="toolbar"
        aria-label={isEs ? 'Acciones del atleta' : 'Athlete actions'}
      >
        <button
          type="button"
          className="wl-athletes-action-chip wl-athletes-action-chip--primary"
          onClick={(event) => run(event, onEdit)}
        >
          <Pencil size={16} strokeWidth={2.1} aria-hidden />
          <span>{isEs ? 'Editar' : 'Edit'}</span>
        </button>
        <button type="button" className="wl-athletes-action-chip" onClick={(event) => run(event, onAssign)}>
          <UserPlus size={16} strokeWidth={2.1} aria-hidden />
          <span>{isEs ? 'Asignar' : 'Assign'}</span>
        </button>
        {hasProgram ? (
          <button type="button" className="wl-athletes-action-chip" onClick={(event) => run(event, onUnassign)}>
            <UserMinus size={16} strokeWidth={2.1} aria-hidden />
            <span>{isEs ? 'Quitar' : 'Unassign'}</span>
          </button>
        ) : null}
        {!hasAccess ? (
          <button type="button" className="wl-athletes-action-chip" onClick={(event) => run(event, onInvite)}>
            <KeyRound size={16} strokeWidth={2.1} aria-hidden />
            <span>{isEs ? 'Acceso' : 'Access'}</span>
          </button>
        ) : null}
        <button
          type="button"
          className="wl-athletes-action-chip wl-athletes-action-chip--danger"
          onClick={(event) => run(event, onDelete)}
        >
          <Trash2 size={16} strokeWidth={2.1} aria-hidden />
          <span>{isEs ? 'Eliminar' : 'Delete'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="wl-athletes-actions-menu" ref={ref}>
      <button
        type="button"
        className="wl-athletes-actions-menu__trigger"
        aria-label={isEs ? 'Acciones del atleta' : 'Athlete actions'}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreVertical size={18} />
      </button>
      {open ? (
        <div className="wl-athletes-actions-menu__list">
          <button type="button" onClick={(event) => run(event, onEdit)}>
            {isEs ? 'Editar atleta' : 'Edit athlete'}
          </button>
          <button type="button" onClick={(event) => run(event, onAssign)}>
            {isEs ? 'Asignar programa' : 'Assign program'}
          </button>
          {hasProgram ? (
            <button type="button" onClick={(event) => run(event, onUnassign)}>
              {isEs ? 'Quitar programa' : 'Remove program'}
            </button>
          ) : null}
          {!hasAccess ? (
            <button type="button" onClick={(event) => run(event, onInvite)}>
              {isEs ? 'Dar acceso a la app' : 'Grant app access'}
            </button>
          ) : null}
          <button type="button" className="is-danger" onClick={(event) => run(event, onDelete)}>
            {isEs ? 'Eliminar del roster' : 'Remove from roster'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
