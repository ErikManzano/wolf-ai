import { Archive, Loader2, Star, Trash2, X } from 'lucide-react';

function handleAction(
  event: React.PointerEvent<HTMLButtonElement>,
  action: () => void,
  disabled: boolean,
) {
  if (disabled) return;
  event.preventDefault();
  event.stopPropagation();
  action();
}

export function ExerciseBulkBar({
  isEs,
  count,
  busy = false,
  onFavorite,
  onArchive,
  onDelete,
  onClear,
}: {
  isEs: boolean;
  count: number;
  busy?: boolean;
  onFavorite: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div
      className="wl-exercise-bulk-bar wl-exercise-bulk-bar--inline"
      role="toolbar"
      aria-label={isEs ? 'Acciones masivas' : 'Bulk actions'}
      aria-busy={busy}
    >
      <span className="wl-exercise-bulk-bar__count">
        {busy ? (
          <Loader2 size={14} className="wl-exercise-bulk-bar__spin" aria-hidden />
        ) : null}
        {isEs ? `${count} seleccionados` : `${count} selected`}
      </span>
      <div className="wl-exercise-bulk-bar__actions">
        <button
          type="button"
          className="wl-exercise-bulk-bar__btn"
          disabled={busy}
          aria-label={isEs ? 'Añadir a favoritos' : 'Add to favorites'}
          onPointerDown={(e) => handleAction(e, onFavorite, busy)}
        >
          <Star size={14} aria-hidden />
          <span className="wl-exercise-bulk-bar__btn-label">{isEs ? 'Favorito' : 'Favorite'}</span>
        </button>
        <button
          type="button"
          className="wl-exercise-bulk-bar__btn"
          disabled={busy}
          aria-label={isEs ? 'Archivar seleccionados' : 'Archive selected'}
          onPointerDown={(e) => handleAction(e, onArchive, busy)}
        >
          <Archive size={14} aria-hidden />
          <span className="wl-exercise-bulk-bar__btn-label">{isEs ? 'Archivar' : 'Archive'}</span>
        </button>
        <button
          type="button"
          className="wl-exercise-bulk-bar__btn wl-exercise-bulk-bar__btn--danger"
          disabled={busy}
          aria-label={isEs ? 'Eliminar seleccionados' : 'Delete selected'}
          onPointerDown={(e) => handleAction(e, onDelete, busy)}
        >
          <Trash2 size={14} aria-hidden />
          <span className="wl-exercise-bulk-bar__btn-label">{isEs ? 'Eliminar' : 'Delete'}</span>
        </button>
        <button
          type="button"
          className="wl-exercise-bulk-bar__btn wl-exercise-bulk-bar__btn--ghost"
          disabled={busy}
          aria-label={isEs ? 'Limpiar selección' : 'Clear selection'}
          onPointerDown={(e) => handleAction(e, onClear, busy)}
        >
          <X size={14} aria-hidden />
          <span className="wl-exercise-bulk-bar__btn-label">{isEs ? 'Limpiar' : 'Clear'}</span>
        </button>
      </div>
    </div>
  );
}
