import type { DaySessionMetrics } from '../programMetricsService';
import { ScienceDistributionBar } from '../stats-ds/ScienceDistributionBar';

export function DayDistributionBlock({
  metrics,
  isEs,
  templateMetrics = false,
  variant = 'inline',
}: {
  metrics: DaySessionMetrics;
  isEs: boolean;
  templateMetrics?: boolean;
  /** inline = bajo ejercicios; panel = pestaña contexto */
  variant?: 'inline' | 'panel';
}) {
  if (metrics.empty) return null;
  if (metrics.stimulus.length === 0 && metrics.families.length === 0) return null;

  const famLine = metrics.families.map((f) => `${f.label} ${f.pct}%`).join(' · ');

  const rootClass =
    variant === 'panel' ? 'wl-day-distribution wl-day-distribution--panel' : 'wl-day-distribution';

  return (
    <section className={rootClass} aria-label={isEs ? 'Distribución del día' : 'Day distribution'}>
      {variant === 'inline' ? (
        <p className="wl-day-distribution__title">
          {isEs ? 'Distribución del día' : 'Day distribution'}
        </p>
      ) : null}
      {metrics.stimulus.some((s) => s.repsPct > 0 || s.volumePct > 0) ? (
        <div className="wl-day-distribution__row">
          <span className="wl-day-distribution__label">{isEs ? 'Zonas' : 'Zones'}</span>
          <ScienceDistributionBar slices={metrics.stimulus} isEs={isEs} />
        </div>
      ) : null}
      {famLine ? (
        <p className="wl-day-distribution__families">
          <span className="wl-day-distribution__label">{isEs ? 'Familias' : 'Families'}</span>
          {famLine}
        </p>
      ) : null}
      {templateMetrics ? (
        <p className="wl-day-distribution__hint wl-program-context-muted">
          {isEs ? 'Porcentajes del día (%1RM / reps).' : 'Day percentages (%1RM / reps).'}
        </p>
      ) : null}
    </section>
  );
}
