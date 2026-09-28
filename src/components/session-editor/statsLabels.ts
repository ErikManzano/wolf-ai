/** Coach-facing copy for weighted intensity (IMP). */
export function intensityMetricLabel(isEs: boolean): string {
  return isEs ? 'Intensidad' : 'Intensity';
}

export function intensityMetricTooltip(isEs: boolean): string {
  return isEs
    ? 'Intensidad media ponderada (IMP). Promedio de intensidad según las series programadas.'
    : 'Weighted mean intensity (IMP). Average intensity from prescribed sets.';
}

/** Right axis / legend secondary label for intensity scale. */
export function intensityAxisTitle(isEs: boolean): string {
  return isEs ? 'IMP %' : 'IMP %';
}
