export function formatRelativeNoticeDate(iso: string, isEs: boolean): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return isEs ? 'Hoy' : 'Today';
    if (diffDays === 1) return isEs ? 'Ayer' : 'Yesterday';
    return d.toLocaleDateString(isEs ? 'es' : 'en', { day: 'numeric', month: 'short' });
  } catch {
    return iso.slice(0, 10);
  }
}
