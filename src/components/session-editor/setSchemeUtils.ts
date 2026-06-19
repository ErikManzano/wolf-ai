export function formatRestSec(sec: number): string {
  const safe = Math.max(0, Math.round(sec));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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
