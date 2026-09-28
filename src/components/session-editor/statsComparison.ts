/** Comparison helpers for stats KPIs (day/week deltas). */

export type MetricDeltaTone = 'up' | 'down' | 'flat';

export interface MetricDelta {
  pct: number;
  label: string;
  tone: MetricDeltaTone;
}

export function volumeDeltaPct(current: number, previous: number): number | null {
  if (previous <= 0 || current < 0) return null;
  if (current > 0 && previous < current * 0.2) return null;
  if (current === 0 && previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function intensityDeltaPts(current: number, previous: number): number | null {
  if (current <= 0 || previous <= 0) return null;
  return Math.round(current - previous);
}

export function buildPctDelta(
  pct: number | null,
  vsLabel: string,
  isEs: boolean,
): MetricDelta | undefined {
  if (pct == null || !Number.isFinite(pct)) return undefined;
  if (pct === 0) {
    return {
      pct: 0,
      label: isEs ? `Igual ${vsLabel}` : `Flat ${vsLabel}`,
      tone: 'flat',
    };
  }
  const abs = Math.abs(pct);
  const arrow = pct > 0 ? '↑' : '↓';
  return {
    pct,
    label: `${arrow} ${abs}% ${vsLabel}`,
    tone: pct > 0 ? 'up' : 'down',
  };
}

/** Delta compacto para barra de métricas (▲▼≈, ±1% flat). */
export function buildCompactDelta(
  pct: number | null,
  _vsLabel: string,
  _isEs: boolean,
): { symbol: string; text: string; tone: MetricDeltaTone } | undefined {
  if (pct == null || !Number.isFinite(pct)) return undefined;
  if (Math.abs(pct) <= 1) {
    return { symbol: '≈', text: `${Math.abs(pct)}%`, tone: 'flat' };
  }
  if (Math.abs(pct) > 100) {
    const mult = Math.round(Math.max(0.1, 1 + pct / 100) * 10) / 10;
    if (pct > 0) {
      return { symbol: '▲', text: `${mult}x`, tone: 'up' };
    }
    return { symbol: '▼', text: `${mult}x`, tone: 'down' };
  }
  if (pct > 0) {
    return { symbol: '▲', text: `${pct}%`, tone: 'up' };
  }
  return { symbol: '▼', text: `${Math.abs(pct)}%`, tone: 'down' };
}

export function buildCompactPtsDelta(
  pts: number | null,
  _vsLabel: string,
  _isEs: boolean,
): { symbol: string; text: string; tone: MetricDeltaTone } | undefined {
  if (pts == null || !Number.isFinite(pts)) return undefined;
  if (pts === 0) {
    return { symbol: '≈', text: '0', tone: 'flat' };
  }
  if (pts > 0) {
    return { symbol: '▲', text: `${pts}`, tone: 'up' };
  }
  return { symbol: '▼', text: `${Math.abs(pts)}`, tone: 'down' };
}

export function buildPtsDelta(
  pts: number | null,
  vsLabel: string,
  isEs: boolean,
): MetricDelta | undefined {
  if (pts == null || !Number.isFinite(pts)) return undefined;
  if (pts === 0) {
    return {
      pct: 0,
      label: isEs ? `Igual ${vsLabel}` : `Flat ${vsLabel}`,
      tone: 'flat',
    };
  }
  const abs = Math.abs(pts);
  const arrow = pts > 0 ? '↑' : '↓';
  return {
    pct: pts,
    label: `${arrow} ${abs} pts ${vsLabel}`,
    tone: pts > 0 ? 'up' : 'down',
  };
}
