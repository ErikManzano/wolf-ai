export function formatRelativeNoticeDate(iso: string, isEs: boolean): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMin < 1) return isEs ? 'Ahora' : 'Just now';
    if (diffMin < 60) return isEs ? `Hace ${diffMin} min` : `${diffMin}m ago`;
    if (diffHours < 24) return isEs ? `Hace ${diffHours} h` : `${diffHours}h ago`;
    if (diffDays === 1) return isEs ? 'Ayer' : 'Yesterday';
    if (diffDays < 7) return isEs ? `Hace ${diffDays} d` : `${diffDays}d ago`;
    return d.toLocaleDateString(isEs ? 'es' : 'en', { day: 'numeric', month: 'short' });
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatPlanDayRef(
  notice: { weekNumber: number; dayNumber: number; dayLabel?: string },
  isEs: boolean,
): string {
  if (notice.dayLabel?.trim()) {
    return isEs
      ? `Semana ${notice.weekNumber} · ${notice.dayLabel.trim()}`
      : `Week ${notice.weekNumber} · ${notice.dayLabel.trim()}`;
  }
  return isEs
    ? `Semana ${notice.weekNumber} · Día ${notice.dayNumber}`
    : `Week ${notice.weekNumber} · Day ${notice.dayNumber}`;
}
