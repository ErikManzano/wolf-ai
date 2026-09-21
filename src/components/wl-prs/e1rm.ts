/** Epley: e1RM = kg × (1 + reps / 30). A 1-rep is the mass itself. */
export function epleyE1rm(kg: number, reps: number): number {
  if (!Number.isFinite(kg) || kg <= 0) return 0;
  const n = Math.max(1, Math.round(reps));
  if (n <= 1) return kg;
  return kg * (1 + n / 30);
}

/** Load for nRM given an estimated 1RM. */
export function nrmFromE1rm(e1rm: number, n: number): number {
  if (!Number.isFinite(e1rm) || e1rm <= 0) return 0;
  if (n <= 1) return e1rm;
  return e1rm / (1 + n / 30);
}

export function percentOfE1rm(e1rm: number, pct: number): number {
  if (!Number.isFinite(e1rm) || e1rm <= 0) return 0;
  return (e1rm * pct) / 100;
}

export function roundKg(value: number, step = 0.5): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / step) * step;
}

export function formatKg(value: number): string {
  const rounded = roundKg(value);
  if (rounded <= 0) return '—';
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export const NRM_RANGE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
export const PCT_1RM_RANGE = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95] as const;
