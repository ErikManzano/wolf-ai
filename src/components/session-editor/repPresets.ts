/** Presets comunes para reps por segmento en complejos olímpicos. */
export const SEGMENT_REP_PRESETS = [
  '1',
  '2',
  '3',
  '1+1',
  '2+1',
  '1+2',
  '2+2',
  '3+1',
  '1+1+1',
] as const;

/** Acepta notación de reps compleja: dígitos separados por + */
export function sanitizeSegmentRepInput(raw: string): string {
  return raw.replace(/[^\d+]/g, '').replace(/\+{2,}/g, '+');
}

export function isValidSegmentRepToken(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return /^\d+(\+\d+)*$/.test(trimmed);
}
