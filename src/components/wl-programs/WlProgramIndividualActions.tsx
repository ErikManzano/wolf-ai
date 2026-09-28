import { Copy, MoreVertical, Pencil, Trash2, Upload, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function stopRowClick(event: React.MouseEvent) {
  event.stopPropagation();
}

export function WlProgramIndividualActions({
  isEs,
  onEdit,
  onSaveAsTemplate,
  onUpdateTemplate,
  showUpdateTemplate,
  onAssignOther,
  onDuplicate,
  onDelete,
}: {
  isEs: boolean;
  onEdit: () => void;
  onSaveAsTemplate: () => void;
  onUpdateTemplate?: () => void;
  showUpdateTemplate: boolean;
  onAssignOther: () => void;
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

  return (
    <div className="wl-programs-unified-actions" role="toolbar" aria-label={isEs ? 'Acciones' : 'Actions'}>
      <button
        type="button"
        className="wl-programs-unified-actions__primary"
        onClick={(e) => {
          stopRowClick(e);
          onEdit();
        }}
      >
        <Pencil size={15} aria-hidden />
        {isEs ? 'Editar' : 'Edit'}
      </button>
      <div className="wl-programs-actions-menu" ref={ref}>
        <button
          type="button"
          className="wl-programs-actions-menu__trigger"
          aria-label={isEs ? 'Más acciones' : 'More actions'}
          aria-expanded={open}
          onClick={(e) => {
            stopRowClick(e);
            setOpen((v) => !v);
          }}
        >
          <MoreVertical size={18} />
        </button>
        {open ? (
          <div className="wl-programs-actions-menu__list">
            <button
              type="button"
              onClick={(e) => {
                stopRowClick(e);
                setOpen(false);
                onSaveAsTemplate();
              }}
            >
              <Upload size={14} aria-hidden />
              {isEs ? 'Guardar como plantilla' : 'Save as template'}
            </button>
            {showUpdateTemplate && onUpdateTemplate ? (
              <button
                type="button"
                onClick={(e) => {
                  stopRowClick(e);
                  setOpen(false);
                  onUpdateTemplate();
                }}
              >
                {isEs ? 'Actualizar plantilla original' : 'Update source template'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={(e) => {
                stopRowClick(e);
                setOpen(false);
                onAssignOther();
              }}
            >
              <UserPlus size={14} aria-hidden />
              {isEs ? 'Asignar a otro atleta' : 'Assign to another athlete'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                stopRowClick(e);
                setOpen(false);
                onDuplicate();
              }}
            >
              <Copy size={14} aria-hidden />
              {isEs ? 'Duplicar' : 'Duplicate'}
            </button>
            <button
              type="button"
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
