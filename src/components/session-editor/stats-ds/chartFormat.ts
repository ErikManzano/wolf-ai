/** Formato de ticks para ejes de gráficos (kg / %). */

export function formatAxisKg(value: number, compact = false): string {
  return formatVolumeTicks([value], compact)[0] ?? '—';
}

/** Misma unidad en todo el eje: o todo en toneladas, o todo en kg. */
export function formatVolumeTicks(ticks: number[], preferTonnes = false): string[] {
  const useTonnes = preferTonnes && ticks.some((tick) => Math.abs(tick) >= 1000);
  return ticks.map((value) => {
    if (!Number.isFinite(value)) return '—';
    if (useTonnes) {
      const tonnes = Math.round((value / 1000) * 10) / 10;
      return Number.isInteger(tonnes) ? `${tonnes.toFixed(0)}t` : `${tonnes}t`;
    }
    if (Math.abs(value) >= 1000) {
      return `${Math.round(value).toLocaleString('es-MX')}`.replace(/,/g, ' ');
    }
    return String(Math.round(value));
  });
}

export function formatAxisPct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return `${decimals === 0 ? Math.round(rounded) : rounded}%`;
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
