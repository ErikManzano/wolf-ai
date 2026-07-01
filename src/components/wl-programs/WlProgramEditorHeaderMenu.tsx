import { useEffect, useRef, useState } from 'react';
import { Copy, MoreVertical, Redo2, Undo2 } from 'lucide-react';

export interface WlProgramEditorMobileActions {
  onDuplicateDay?: () => void;
  canDuplicateDay?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function WlProgramEditorHeaderMenu({
  isEs,
  actions,
}: {
  isEs: boolean;
  actions: WlProgramEditorMobileActions | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClickAway);
    return () => window.removeEventListener('mousedown', onClickAway);
  }, [open]);

  if (!actions) return null;

  const run = (fn?: () => void) => {
    if (!fn) return;
    setOpen(false);
    fn();
  };

  return (
    <div className="wl-program-editor-header-menu" ref={ref}>
      <button
        type="button"
        className="mobile-header-btn wl-program-editor-header-menu__trigger"
        aria-label={isEs ? 'Acciones del programa' : 'Program actions'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVertical size={22} strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div className="wl-program-editor-header-menu__list" role="menu">
          {actions.onDuplicateDay ? (
            <button
              type="button"
              role="menuitem"
              disabled={!actions.canDuplicateDay}
              onClick={() => run(actions.onDuplicateDay)}
            >
              <Copy size={16} aria-hidden />
              {isEs ? 'Duplicar día' : 'Duplicate day'}
            </button>
          ) : null}
          {actions.onUndo ? (
            <button
              type="button"
              role="menuitem"
              disabled={!actions.canUndo}
              onClick={() => run(actions.onUndo)}
            >
              <Undo2 size={16} aria-hidden />
              {isEs ? 'Deshacer' : 'Undo'}
            </button>
          ) : null}
          {actions.onRedo ? (
            <button
              type="button"
              role="menuitem"
              disabled={!actions.canRedo}
              onClick={() => run(actions.onRedo)}
            >
              <Redo2 size={16} aria-hidden />
              {isEs ? 'Rehacer' : 'Redo'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
