import { Archive, Copy, GitFork, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
    stopCardClick(event);
    setOpen(false);
    action();
  };

  return (
    <div className="wl-exercises-actions-menu" ref={ref}>
      <button
        type="button"
        className="wl-exercises-actions-menu__trigger"
        aria-label={isEs ? 'Acciones del ejercicio' : 'Exercise actions'}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreVertical size={18} />
      </button>
      {open ? (
        <div className="wl-exercises-actions-menu__list">
          {isOfficial ? (
            <button type="button" onClick={(event) => run(event, onPersonalize)}>
              <GitFork size={14} aria-hidden /> {isEs ? 'Personalizar' : 'Personalize'}
            </button>
          ) : (
            <button type="button" onClick={(event) => run(event, onEdit)}>
              <Pencil size={14} aria-hidden /> {isEs ? 'Editar' : 'Edit'}
            </button>
          )}
          <button type="button" onClick={(event) => run(event, onDuplicate)}>
            <Copy size={14} aria-hidden /> {isEs ? 'Duplicar' : 'Duplicate'}
          </button>
          <button type="button" onClick={(event) => run(event, onArchive)}>
            <Archive size={14} aria-hidden /> {isEs ? 'Archivar' : 'Archive'}
          </button>
          {!isOfficial ? (
            <button type="button" className="is-danger" onClick={(event) => run(event, onDelete)}>
              <Trash2 size={14} aria-hidden /> {isEs ? 'Eliminar' : 'Delete'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
