import { Copy, Pencil, Trash2 } from 'lucide-react';

function stopRowClick(event: React.MouseEvent) {
  event.stopPropagation();
}

export function PraxiogramActionsMenu({
  isEs,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  isEs: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="wl-programs-actions-bar"
      role="toolbar"
      aria-label={isEs ? 'Acciones del praxiograma' : 'Praxiogram actions'}
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

export default PraxiogramActionsMenu;
