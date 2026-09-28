/** Formato de ticks para ejes de gráficos (kg / %). */

export function formatAxisKg(value: number, compact = false): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (compact && abs >= 1000) {
    const t = value / 1000;
    return t >= 10 ? `${Math.round(t)}t` : `${Math.round(t * 10) / 10}t`;
  }
  if (abs >= 1000) {
    return `${Math.round(value).toLocaleString('es-MX')}`.replace(/,/g, ' ');
  }
  return String(Math.round(value));
}

export function formatAxisPct(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value * 10) / 10}%`;
}

export function niceLinearTicks(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [min];
  }
  const span = max - min;
  const step = span / Math.max(count - 1, 1);
  const ticks: number[] = [];
  for (let i = 0; i < count; i++) {
    ticks.push(min + step * i);
  }
  return ticks;
}

export function padDomain(min: number, max: number, ratio = 0.08): { min: number; max: number } {
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  const pad = (max - min) * ratio;
  return { min: min - pad, max: max + pad };
}
