import React, { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './wl-form-sheet.css';

export interface WlFormSheetProps {
  isEs: boolean;
  kicker: string;
  title: string;
  subtitle?: string;
  titleId?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export const WlFormSheet: React.FC<WlFormSheetProps> = ({
  isEs,
  kicker,
  title,
  subtitle,
  titleId = 'wl-form-sheet-title',
  onClose,
  children,
  footer,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return createPortal(
    <div className="wl-form-sheet-overlay" role="presentation" onClick={onClose}>
      <div
        className="wl-form-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wl-form-sheet-handle" aria-hidden />
        <header className="wl-form-sheet-head">
          <div className="wl-form-sheet-head__content">
            <p className="wl-form-sheet-kicker">{kicker}</p>
            <h2 id={titleId} className="wl-form-sheet-title">
              {title}
            </h2>
            {subtitle ? <p className="wl-form-sheet-meta">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="wl-form-sheet-close"
            onClick={onClose}
            aria-label={isEs ? 'Cerrar' : 'Close'}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="wl-form-sheet-body">{children}</div>

        {footer ? <footer className="wl-form-sheet-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
};
