import type { ExerciseComposition } from '../../models/exercise';

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return Object.keys(o)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeysDeep(o[k]);
        return acc;
      }, {});
  }
  return value;
}

function fnv1a(str: string): string {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function buildSignature(composition: ExerciseComposition): string {
  const normalized = sortKeysDeep(composition);
  return fnv1a(JSON.stringify(normalized));
}
