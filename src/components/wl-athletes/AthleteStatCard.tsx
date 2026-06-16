import type { LucideIcon } from 'lucide-react';

export function AthleteStatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="wl-athletes-stat-card">
      <div className="wl-athletes-stat-card__body">
        <strong className="wl-athletes-stat-card__value">{value}</strong>
        <span className="wl-athletes-stat-card__label">{label}</span>
      </div>
      <span className="wl-athletes-stat-card__icon" aria-hidden>
        <Icon size={22} strokeWidth={2} />
      </span>
    </div>
  );
}
