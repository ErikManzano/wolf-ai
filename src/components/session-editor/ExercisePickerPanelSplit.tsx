import type { ReactNode } from 'react';

export function ExercisePickerPanelSplit({
  sidebar,
  showSidebar,
  filterBar,
  children,
  footer,
}: {
  sidebar: ReactNode;
  showSidebar: boolean;
  filterBar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="wolf-se-picker-panel-split">
      {showSidebar ? <aside className="wolf-se-picker-panel-split__sidebar">{sidebar}</aside> : null}
      <div className="wolf-se-picker-panel-split__main">
        {filterBar}
        <div className="wolf-se-picker-panel-split__body">{children}</div>
        {footer}
      </div>
    </div>
  );
}
