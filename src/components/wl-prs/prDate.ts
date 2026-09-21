export function formatPrDate(iso: string | null | undefined, isEs: boolean): string {
  if (!iso) return isEs ? 'Sin registro' : 'No log';
  try {
    return new Date(iso).toLocaleDateString(isEs ? 'es' : 'en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatPrDateTime(iso: string, isEs: boolean): string {
  try {
    return new Date(iso).toLocaleString(isEs ? 'es' : 'en', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 16);
  }
}
