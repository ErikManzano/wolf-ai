import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useBottomSheet } from '../hooks/useBottomSheet';
import '../mobile-wl.css';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** 0–1 fraction of viewport height, default 0.65 */
  snap?: number;
  footer?: React.ReactNode;
  panelClassName?: string;
  bodyClassName?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  children,
  snap = 0.65,
  footer,
  panelClassName,
  bodyClassName,
}) => {
  const { titleId, panelRef, onBackdropClick } = useBottomSheet(open, onClose);
  const snapVh = Math.round(snap * 100);

  if (typeof document === 'undefined') return null;

  const panelClass = ['mwl-sheet-panel', panelClassName].filter(Boolean).join(' ');
  const bodyClass = ['mwl-sheet-body', bodyClassName].filter(Boolean).join(' ');

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="mwl-sheet-root" aria-hidden={!open}>
          <motion.button
            type="button"
            className="mwl-sheet-backdrop"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onBackdropClick}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={panelClass}
            style={{ height: `${snapVh}vh`, maxHeight: `${snapVh}vh` }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 400) onClose();
            }}
          >
            <div className="mwl-sheet-handle" aria-hidden />
            <header className="mwl-sheet-header">
              {title ? (
                <h2 id={titleId} className="mwl-sheet-title">
                  {title}
                </h2>
              ) : (
                <span />
              )}
              <button type="button" className="mwl-sheet-close" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </header>
            <div className={bodyClass}>{children}</div>
            {footer ? <footer className="mwl-sheet-footer">{footer}</footer> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};
