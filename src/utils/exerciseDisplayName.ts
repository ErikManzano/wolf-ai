/** Normaliza nombres sucios del catálogo para mostrar en UI. */
export function sanitizeExerciseDisplayName(raw: string): string {
  let name = raw.trim();
  if (!name) return name;

  name = name.replace(/^\.-\s*/i, '');
  name = name.replace(/^\.+\s*/i, '');
  name = name.replace(/^A-\s*/i, '');
  name = name.replace(/^\d+\s*(metros|m)\.?\s*[-–—]\s*/i, '');
  name = name.replace(/^[-–—]+\s*/, '');
  name = name.replace(/\s{2,}/g, ' ').trim();

  return toSentenceCase(name);
}

/** Primera letra mayúscula; resto en minúsculas (sentence case). */
export function toSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Etiqueta con pluralización correcta. */
export function pluralLabel(
  count: number,
  isEs: boolean,
  forms: { es: [string, string]; en: [string, string] },
): string {
  const [singular, plural] = isEs ? forms.es : forms.en;
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Convierte bloques de texto en bullets legibles. */
export function cuesToBullets(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];

  const normalized = text.trim();
  const lineParts = normalized
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  if (lineParts.length > 1) return lineParts;

  const dashParts = normalized
    .split(/\s+[-–—]\s+/)
    .map((part) => part.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  if (dashParts.length > 1) return dashParts;

  const sentenceParts = normalized
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ0-9(-])/)
    .map((part) => part.replace(/^[-•*]\s*/, '').trim())
    .filter((part) => part.length > 2);
  if (sentenceParts.length > 1) return sentenceParts;

  return [normalized.replace(/^[-•*]\s*/, '').trim()];
}
