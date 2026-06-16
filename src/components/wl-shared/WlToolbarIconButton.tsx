import type { ReactNode } from 'react';

export function WlToolbarIconButton({
  active = false,
  variant = 'default',
  onClick,
  ariaLabel,
  ariaExpanded,
  children,
}: {
  active?: boolean;
  variant?: 'default' | 'accent';
  onClick: () => void;
  ariaLabel: string;
  ariaExpanded?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`wl-list-toolbar__icon-btn${active ? ' is-active' : ''}${
        variant === 'accent' ? ' wl-list-toolbar__icon-btn--accent' : ''
      }`}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
