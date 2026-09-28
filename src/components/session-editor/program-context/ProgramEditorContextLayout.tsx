import React from 'react';
import { ChartColumn, ChevronLeft, PanelRightClose } from 'lucide-react';
import { programContextPanelTitle } from './constants';
import './program-context.css';

export function ProgramEditorContextLayout({
  isEs,
  sidebar,
  context,
  contextOpen,
  onToggleContext,
  mobileContextOpen,
  onMobileContextOpenChange,
  isMobile,
}: {
  isEs: boolean;
  /** Navegación semana/día + hoja — columna izquierda */
  sidebar: React.ReactNode;
  context: React.ReactNode;
  contextOpen: boolean;
  onToggleContext: () => void;
  mobileContextOpen: boolean;
  onMobileContextOpenChange: (open: boolean) => void;
  isMobile: boolean;
}) {
  const panelTitle = programContextPanelTitle(isEs);

  return (
    <div
      className={`wl-program-editor-split${contextOpen && !isMobile ? ' wl-program-editor-split--open' : ''}${!isMobile && !contextOpen ? ' wl-program-editor-split--context-collapsed' : ''}${isMobile ? ' wl-program-editor-split--mobile' : ''}`}
    >
      <div className="wl-program-editor-split__sidebar wl-program-editor-split__main">{sidebar}</div>

      {!isMobile && contextOpen ? (
        <aside
          className="wl-program-editor-split__context"
          aria-label={isEs ? 'Panel de análisis del programa' : 'Program analysis panel'}
        >
          <div className="wl-program-editor-split__context-head">
            <span className="wl-program-editor-split__context-title">{panelTitle}</span>
            <button
              type="button"
              className="wl-program-editor-split__context-toggle"
              aria-expanded
              aria-controls="wl-program-context-panel-body"
              aria-label={isEs ? 'Ocultar panel de análisis' : 'Hide analysis panel'}
              onClick={onToggleContext}
            >
              <PanelRightClose size={16} strokeWidth={2} aria-hidden />
            </button>
          </div>
          <div id="wl-program-context-panel-body" className="wl-program-editor-split__context-body">
            {context}
          </div>
        </aside>
      ) : null}

      {!isMobile && !contextOpen ? (
        <aside
          className="wl-program-editor-split__context-rail"
          aria-label={isEs ? 'Panel de análisis colapsado' : 'Collapsed analysis panel'}
        >
          <button
            type="button"
            className="wl-program-editor-split__reopen"
            aria-expanded={false}
            aria-label={
              isEs ? `Mostrar panel de análisis (${panelTitle})` : `Show analysis panel (${panelTitle})`
            }
            onClick={onToggleContext}
          >
            <span className="wl-program-editor-split__reopen-expand" aria-hidden>
              <ChevronLeft size={18} strokeWidth={2.25} />
            </span>
            <span className="wl-program-editor-split__reopen-mark" aria-hidden>
              <ChartColumn size={20} strokeWidth={2} />
            </span>
          </button>
        </aside>
      ) : null}

      {isMobile ? (
        <>
          <button
            type="button"
            className="wl-program-editor-split__mobile-fab"
            onClick={() => onMobileContextOpenChange(true)}
          >
            {panelTitle}
          </button>
          {mobileContextOpen ? (
            <div className="wl-program-context-drawer" role="dialog" aria-modal="true">
              <div
                className="wl-program-context-drawer__backdrop"
                onClick={() => onMobileContextOpenChange(false)}
                aria-hidden
              />
              <div className="wl-program-context-drawer__sheet">
                <div className="wl-program-editor-split__context-head">
                  <span className="wl-program-editor-split__context-title">{panelTitle}</span>
                  <button type="button" onClick={() => onMobileContextOpenChange(false)}>
                    {isEs ? 'Cerrar' : 'Close'}
                  </button>
                </div>
                {context}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
