export type StatusBadgeVariant = 'active' | 'idle' | 'warning' | 'none';

export function StatusBadge({
  variant,
  children,
}: {
  variant: StatusBadgeVariant;
  children: React.ReactNode;
}) {
  return <span className={`wl-athletes-status-badge wl-athletes-status-badge--${variant}`}>{children}</span>;
}
