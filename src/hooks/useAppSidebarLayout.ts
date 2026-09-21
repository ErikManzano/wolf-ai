import { useEffect, useState } from 'react';

/** Reads `.app-container` sidebar collapse state (bulk bar is portaled to body). */
export function useAppSidebarLayout(): { sidebarCollapsed: boolean } {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readSidebarCollapsed());

  useEffect(() => {
    const root = document.querySelector('.app-container');
    if (!root) return;

    const sync = () => setSidebarCollapsed(readSidebarCollapsed());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, []);

  return { sidebarCollapsed };
}

function readSidebarCollapsed(): boolean {
  if (typeof document === 'undefined') return true;
  return document.querySelector('.app-container')?.classList.contains('app-container--sidebar-collapsed') ?? true;
}
