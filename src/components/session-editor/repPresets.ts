/** Opciones de reps por segmento (enteros simples). */
export const SEGMENT_REP_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20] as const;

/** @deprecated Solo compatibilidad con datos antiguos (2+1, etc.). */
export const SEGMENT_REP_PRESETS = SEGMENT_REP_OPTIONS.map(String);

/** Acepta notación de reps compleja: dígitos separados por + */
export function sanitizeSegmentRepInput(raw: string): string {
  return raw.replace(/[^\d+]/g, '').replace(/\+{2,}/g, '+');
}

export function isValidSegmentRepToken(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return /^\d+(\+\d+)*$/.test(trimmed);
}
