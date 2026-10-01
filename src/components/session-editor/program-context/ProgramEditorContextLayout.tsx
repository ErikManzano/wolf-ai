import React from 'react';
import { ChartColumn, ChevronDown } from 'lucide-react';
import { programContextPanelTitle } from './constants';
import './program-context.css';

export function ProgramEditorContextLayout({
  isEs,
  sidebar,
  context,
  contextOpen,
  onToggleContext,
  isMobile,
  dockTabs,
}: {
  isEs: boolean;
  /** Navegación semana/día + hoja — columna izquierda */
  sidebar: React.ReactNode;
  context: React.ReactNode;
  contextOpen: boolean;
  onToggleContext: () => void;
  isMobile: boolean;
  /** Pestañas de análisis, en la barra del dock cuando está abierto. */
  dockTabs?: React.ReactNode;
}) {
  const panelTitle = programContextPanelTitle(isEs);

  return (
    <div
      className={`wl-program-editor-split${!isMobile ? ' wl-program-editor-split--dock' : ''}${contextOpen && !isMobile ? ' wl-program-editor-split--open' : ''}${isMobile ? ' wl-program-editor-split--mobile' : ''}`}
    >
      <div className="wl-program-editor-split__sidebar wl-program-editor-split__main">{sidebar}</div>

      {!isMobile ? (
        <aside
          className={`wl-program-editor-split__context wl-program-editor-split__dock${contextOpen ? ' is-open' : ''}`}
          aria-label={isEs ? 'Panel de análisis del programa' : 'Program analysis panel'}
        >
          <div
            className="wl-program-editor-split__context-head wl-program-editor-split__dock-bar"
            role={contextOpen ? undefined : 'button'}
            tabIndex={contextOpen ? undefined : 0}
            aria-expanded={contextOpen ? undefined : false}
            aria-controls={contextOpen ? undefined : 'wl-program-context-panel-body'}
            aria-label={
              contextOpen
                ? undefined
                : isEs
                  ? `Mostrar panel de análisis (${panelTitle})`
                  : `Show analysis panel (${panelTitle})`
            }
            onClick={contextOpen ? undefined : onToggleContext}
            onKeyDown={
              contextOpen
                ? undefined
                : (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onToggleContext();
                    }
                  }
            }
          >
            <div className="wl-program-editor-split__dock-toggle">
              <ChartColumn size={16} strokeWidth={2} aria-hidden />
              <span className="wl-program-editor-split__context-title">{panelTitle}</span>
            </div>
            {dockTabs ? (
              <div
                className="wl-program-editor-split__dock-tabs"
                aria-hidden={!contextOpen}
                inert={!contextOpen}
              >
                {dockTabs}
              </div>
            ) : null}
            {contextOpen ? (
              <button
                type="button"
                className="wl-program-editor-split__dock-chevron"
                aria-expanded
                aria-controls="wl-program-context-panel-body"
                aria-label={isEs ? 'Ocultar panel de análisis' : 'Hide analysis panel'}
                onClick={onToggleContext}
              >
                <ChevronDown className="wl-program-editor-split__dock-chevron__icon" size={16} strokeWidth={2.25} aria-hidden />
              </button>
            ) : (
              <span className="wl-program-editor-split__dock-chevron" aria-hidden>
                <ChevronDown className="wl-program-editor-split__dock-chevron__icon" size={16} strokeWidth={2.25} aria-hidden />
              </span>
            )}
          </div>
          <div
            id="wl-program-context-panel-body"
            className="wl-program-editor-split__context-body"
            aria-hidden={!contextOpen}
            inert={!contextOpen}
          >
            {context}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
