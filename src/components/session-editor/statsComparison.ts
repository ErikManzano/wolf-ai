/** Comparison helpers for stats KPIs (day/week deltas). */

export type MetricDeltaTone = 'up' | 'down' | 'flat';

export interface MetricDelta {
  pct: number;
  label: string;
  tone: MetricDeltaTone;
}

export function volumeDeltaPct(current: number, previous: number): number | null {
  if (previous <= 0 || current < 0) return null;
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
