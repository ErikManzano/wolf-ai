import type { ReactNode } from 'react';

export function WlToolbarIconButton({
  active = false,
  onClick,
  ariaLabel,
  ariaExpanded,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  ariaLabel: string;
  ariaExpanded?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`wl-list-toolbar__icon-btn${active ? ' is-active' : ''}`}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
