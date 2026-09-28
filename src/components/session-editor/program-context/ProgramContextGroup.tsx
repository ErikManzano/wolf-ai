import type { ReactNode } from 'react';

export function ProgramContextGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="wl-program-context-tab__group">
      <p className="wl-program-context-tab__group-title">{title}</p>
      {children}
    </div>
  );
}
