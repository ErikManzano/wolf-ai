/**
 * Lightweight in-process counters for pilot monitoring (Architecture B metrics).
 */

type MetricKey =
  | 'coach_program_saves'
  | 'assignment_propagations'
  | 'set_log_patches'
  | 'set_log_batches';

const counters: Record<MetricKey, number> = {
  coach_program_saves: 0,
  assignment_propagations: 0,
  set_log_patches: 0,
  set_log_batches: 0,
};

let lastLogHour = -1;

function maybeLogHourly() {
  const hour = new Date().getUTCHours();
  if (hour === lastLogHour) return;
  lastLogHour = hour;
  console.info('[save-metrics]', { ...counters, hourUtc: hour });
}

export function incrementSaveMetric(key: MetricKey, by = 1): void {
  counters[key] += by;
  maybeLogHourly();
}

export function getSaveMetrics(): Readonly<Record<MetricKey, number>> {
  return { ...counters };
}
