import React from 'react';

export interface ProgramEditorSheetSidebarProps {
  navigation: React.ReactNode;
  children: React.ReactNode;
}

/** Semanas + días + hoja del día — columna izquierda del editor embebido. */
export function ProgramEditorSheetSidebar({ navigation, children }: ProgramEditorSheetSidebarProps) {
  return (
    <div className="wl-program-editor-sheet-sidebar">
      <div className="wl-program-editor-sheet-sidebar__nav">{navigation}</div>
      <div className="wl-program-editor-sheet-sidebar__body">{children}</div>
    </div>
  );
}
