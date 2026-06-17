/** Pause after the first tap before auto-repeat begins. */
export const SMOOTH_HOLD_INITIAL_PAUSE_MS = 360;

/** Accelerating repeat cadence while the button stays pressed. */
export function nextSmoothHoldDelayMs(tick: number): number {
  if (tick === 0) return SMOOTH_HOLD_INITIAL_PAUSE_MS;
  if (tick < 5) return 220;
  if (tick < 12) return 140;
  return 80;
}
