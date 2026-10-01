import React from 'react';

export interface ProgramEditorSheetSidebarProps {
  navigation: React.ReactNode;
  /** Week/day nav classes, hosted on the single nav container. */
  navClassName?: string;
  /** Mobile-only tab rendered under week/day navigation. */
  analysisTab?: React.ReactNode;
  /** Mobile: analysis panel rendered below nav (same slot as the exercise sheet). */
  mobileAnalysisPanel?: React.ReactNode;
  showMobileAnalysis?: boolean;
  children: React.ReactNode;
}

/** Semanas + días + hoja del día — columna izquierda del editor embebido. */
export function ProgramEditorSheetSidebar({
  navigation,
  navClassName,
  analysisTab,
  mobileAnalysisPanel,
  showMobileAnalysis = false,
  children,
}: ProgramEditorSheetSidebarProps) {
  const mobileStacked = mobileAnalysisPanel != null;

  return (
    <div className="wl-program-editor-sheet-sidebar">
      <div className={['wl-program-editor-sheet-sidebar__nav', navClassName].filter(Boolean).join(' ')}>
        {navigation}
        {analysisTab}
      </div>
      <div className="wl-program-editor-sheet-sidebar__body">
        {mobileStacked ? (
          <>
            <div
              id="wl-program-editor-mobile-context"
              className={`wl-program-editor-sheet-sidebar__analysis-panel${showMobileAnalysis ? ' is-active' : ''}`}
              role="tabpanel"
              aria-hidden={!showMobileAnalysis}
            >
              {mobileAnalysisPanel}
            </div>
            <div
              className={`wl-program-editor-sheet-sidebar__sheet${showMobileAnalysis ? ' is-hidden' : ''}`}
              aria-hidden={showMobileAnalysis}
            >
              {children}
            </div>
          </>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
