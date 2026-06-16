import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function WlListFieldSelect({
  icon: Icon,
  value,
  onChange,
  ariaLabel,
  title,
  active = false,
  children,
}: {
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  title?: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`wl-list-field${active ? ' wl-list-field--active' : ''}`}>
      <Icon size={14} className="wl-list-field__icon" aria-hidden />
      <select
        className="wl-list-field__select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        title={title}
      >
        {children}
      </select>
    </div>
  );
}
