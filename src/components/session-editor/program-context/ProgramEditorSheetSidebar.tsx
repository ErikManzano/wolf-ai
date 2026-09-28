import React from 'react';

export interface ProgramEditorSheetSidebarProps {
  navigation: React.ReactNode;
  /** Mobile-only tab rendered under week/day navigation. */
  analysisTab?: React.ReactNode;
  /** Keep the sheet mounted but hidden while the analysis tab is active. */
  hideBody?: boolean;
  children: React.ReactNode;
}

/** Semanas + días + hoja del día — columna izquierda del editor embebido. */
export function ProgramEditorSheetSidebar({
  navigation,
  analysisTab,
  hideBody = false,
  children,
}: ProgramEditorSheetSidebarProps) {
  return (
    <div className="wl-program-editor-sheet-sidebar">
      <div className="wl-program-editor-sheet-sidebar__nav">
        {navigation}
        {analysisTab}
      </div>
      <div className={`wl-program-editor-sheet-sidebar__body${hideBody ? ' is-hidden' : ''}`}>{children}</div>
    </div>
  );
}
