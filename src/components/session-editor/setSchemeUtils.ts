export function formatRestSec(sec: number): string {
  const safe = Math.max(0, Math.round(sec));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Rest label with explicit min/sec units for spreadsheet presets. */
export function formatRestLabel(sec: number, isEs: boolean): string {
  const safe = Math.max(0, Math.round(sec));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  const secUnit = isEs ? 'seg' : 'sec';
  if (minutes <= 0) return `${seconds} ${secUnit}`;
  if (seconds <= 0) return `${minutes} min`;
  return `${minutes} min ${seconds} ${secUnit}`;
}

export function parseRestSec(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Math.max(0, Number(trimmed));
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  return Math.max(0, Number(match[1]) * 60 + Number(match[2]));
}

export const DEFAULT_TARGET_RIR = 2;
export const DEFAULT_REST_SEC = 150;
