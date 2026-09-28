import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function ProgramContextChartDetail({
  open,
  title,
  isEs,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  isEs: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="wl-program-context-chart-detail">
      <button
        type="button"
        className="wl-program-context-chart-detail__backdrop"
        aria-label={isEs ? 'Cerrar vista ampliada' : 'Close expanded view'}
        onClick={onClose}
      />
      <div
        className="wl-program-context-chart-detail__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wl-program-context-chart-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="wl-program-context-chart-detail__head">
          <h2 id="wl-program-context-chart-detail-title" className="wl-program-context-chart-detail__title">
            {title}
          </h2>
          <button
            type="button"
            className="wl-program-context-chart-detail__close"
            onClick={onClose}
            aria-label={isEs ? 'Cerrar' : 'Close'}
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="wl-program-context-chart-detail__body">
          <div className="wl-program-context-chart-detail__stage">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
