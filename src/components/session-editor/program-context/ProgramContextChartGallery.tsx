import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Download, FileImage, X } from 'lucide-react';
import {
  buildProgramContextChartFilename,
  exportProgramContextChartAsPdf,
  exportProgramContextChartAsPng,
} from './programContextChartExport';

export type ProgramContextChartItem = {
  id: string;
  title: string;
  render: (variant: 'context' | 'detail') => ReactNode;
};

export function ProgramContextChartGallery({
  open,
  items,
  activeId,
  onActiveIdChange,
  onClose,
  isEs,
  scopeLabel,
  programName = '',
}: {
  open: boolean;
  items: ProgramContextChartItem[];
  activeId: string | null;
  onActiveIdChange: (id: string) => void;
  onClose: () => void;
  isEs: boolean;
  /** Semana / día visibles en el editor. */
  scopeLabel: string;
  programName?: string;
}) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [exportBusy, setExportBusy] = useState<'png' | 'pdf' | null>(null);

  const activeIndex = activeId ? items.findIndex((item) => item.id === activeId) : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex]! : null;
  const canNavigate = items.length > 1;

  const goPrev = useCallback(() => {
    if (!canNavigate || activeIndex < 0) return;
    const next = (activeIndex - 1 + items.length) % items.length;
    onActiveIdChange(items[next]!.id);
  }, [activeIndex, canNavigate, items, onActiveIdChange]);

  const goNext = useCallback(() => {
    if (!canNavigate || activeIndex < 0) return;
    const next = (activeIndex + 1) % items.length;
    onActiveIdChange(items[next]!.id);
  }, [activeIndex, canNavigate, items, onActiveIdChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, goPrev, goNext]);

  const runExport = async (format: 'png' | 'pdf') => {
    const root = exportRef.current;
    if (!root || !activeItem) return;
    setExportBusy(format);
    try {
      const filenameBase = buildProgramContextChartFilename({
        programName,
        scopeLabel,
        chartTitle: activeItem.title,
      });
      if (format === 'png') {
        await exportProgramContextChartAsPng(root, filenameBase);
      } else {
        await exportProgramContextChartAsPdf(root, filenameBase, filenameBase);
      }
    } finally {
      setExportBusy(null);
    }
  };

  if (!open || !activeItem) return null;

  return createPortal(
    <div className="wl-program-context-chart-detail wl-program-context-chart-detail--gallery">
      <button
        type="button"
        className="wl-program-context-chart-detail__backdrop"
        aria-label={isEs ? 'Cerrar vista ampliada' : 'Close expanded view'}
        onClick={onClose}
      />
      <div
        className="wl-program-context-chart-detail__dialog wl-program-context-chart-detail__dialog--gallery"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wl-program-context-chart-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="wl-program-context-chart-detail__head">
          <div className="wl-program-context-chart-detail__head-text">
            <p className="wl-program-context-chart-detail__scope">{scopeLabel}</p>
            <h2 id="wl-program-context-chart-detail-title" className="wl-program-context-chart-detail__title">
              {activeItem.title}
            </h2>
          </div>
          <button
            type="button"
            className="wl-program-context-chart-detail__close"
            onClick={onClose}
            aria-label={isEs ? 'Cerrar' : 'Close'}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="wl-program-context-chart-detail__toolbar">
          {canNavigate ? (
            <div className="wl-program-context-chart-detail__nav">
              <button
                type="button"
                className="wl-program-context-chart-detail__nav-btn"
                onClick={goPrev}
                aria-label={isEs ? 'Gráfica anterior' : 'Previous chart'}
              >
                <ChevronLeft size={18} strokeWidth={2.25} aria-hidden />
              </button>
              <span className="wl-program-context-chart-detail__nav-count">
                {activeIndex + 1} / {items.length}
              </span>
              <button
                type="button"
                className="wl-program-context-chart-detail__nav-btn"
                onClick={goNext}
                aria-label={isEs ? 'Gráfica siguiente' : 'Next chart'}
              >
                <ChevronRight size={18} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          ) : (
            <span className="wl-program-context-chart-detail__nav-count wl-program-context-chart-detail__nav-count--solo">
              1 / 1
            </span>
          )}

          <div className="wl-program-context-chart-detail__downloads">
            <button
              type="button"
              className="wl-program-context-chart-detail__download-btn"
              disabled={exportBusy != null}
              onClick={() => void runExport('png')}
            >
              <FileImage size={15} strokeWidth={2} aria-hidden />
              {exportBusy === 'png' ? (isEs ? 'Exportando…' : 'Exporting…') : 'PNG'}
            </button>
            <button
              type="button"
              className="wl-program-context-chart-detail__download-btn"
              disabled={exportBusy != null}
              onClick={() => void runExport('pdf')}
            >
              <Download size={15} strokeWidth={2} aria-hidden />
              {exportBusy === 'pdf' ? (isEs ? 'Exportando…' : 'Exporting…') : 'PDF'}
            </button>
          </div>
        </div>

        <div className="wl-program-context-chart-detail__body">
          <div ref={exportRef} className="wl-program-context-chart-detail__export-root">
            <div className="wl-program-context-chart-detail__export-meta">
              {programName ? <span className="wl-program-context-chart-detail__export-program">{programName}</span> : null}
              <span className="wl-program-context-chart-detail__export-scope">{scopeLabel}</span>
              <span className="wl-program-context-chart-detail__export-chart">{activeItem.title}</span>
            </div>
            <div className="wl-program-context-chart-detail__stage wl-program-context-chart-detail__stage--detail">
              {activeItem.render('detail')}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
