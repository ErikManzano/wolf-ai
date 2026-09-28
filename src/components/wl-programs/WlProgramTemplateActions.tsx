import { CalendarRange, Copy, MoreVertical, Pencil, Trash2, UserPlus } from 'lucide-react';
import { useRef, useState } from 'react';
import { ProgramsActionsMenuList } from './ProgramsActionsMenuList';

function stopRowClick(event: React.MouseEvent) {
  event.stopPropagation();
}

export function WlProgramTemplateActions({
  isEs,
  onAssign,
  onEdit,
  onSchedule,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  isEs: boolean;
  onAssign: () => void;
  onEdit: () => void;
  onSchedule: () => void;
  onDuplicate: () => void;
  onArchive?: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="wl-programs-unified-actions" role="toolbar" aria-label={isEs ? 'Acciones' : 'Actions'}>
      <button
        type="button"
        className="wl-programs-unified-actions__primary"
        onClick={(e) => {
          stopRowClick(e);
          onAssign();
        }}
      >
        <UserPlus size={15} aria-hidden />
        {isEs ? 'Asignar' : 'Assign'}
      </button>
      <div className="wl-programs-actions-menu" ref={anchorRef}>
        <button
          type="button"
          className="wl-programs-actions-menu__trigger"
          aria-label={isEs ? 'Más acciones' : 'More actions'}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={(e) => {
            stopRowClick(e);
            setOpen((v) => !v);
          }}
        >
          <MoreVertical size={18} />
        </button>
        <ProgramsActionsMenuList open={open} anchorRef={anchorRef} onClose={() => setOpen(false)}>
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              stopRowClick(e);
              setOpen(false);
              onEdit();
            }}
          >
            <Pencil size={14} aria-hidden />
            {isEs ? 'Editar plantilla' : 'Edit template'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              stopRowClick(e);
              setOpen(false);
              onSchedule();
            }}
          >
            <CalendarRange size={14} aria-hidden />
            {isEs ? 'Fechas' : 'Dates'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              stopRowClick(e);
              setOpen(false);
              onDuplicate();
            }}
          >
            <Copy size={14} aria-hidden />
            {isEs ? 'Duplicar' : 'Duplicate'}
          </button>
          {onArchive ? (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                stopRowClick(e);
                setOpen(false);
                onArchive();
              }}
            >
              {isEs ? 'Archivar' : 'Archive'}
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="is-danger"
            onClick={(e) => {
              stopRowClick(e);
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 size={14} aria-hidden />
            {isEs ? 'Eliminar' : 'Delete'}
          </button>
        </ProgramsActionsMenuList>
      </div>
    </div>
  );
}
