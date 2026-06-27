import { WL_SESSION_LIMITS } from '../../services/sessionMutations';
import type { ComboPresetOption } from './ComboPresetField';
import { formatRestLabel } from './setSchemeUtils';

const SETS_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10] as const;
const REPS_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20] as const;
const REST_PRESETS_SEC = [90, 120, 150, 180, 210, 240] as const;

function presetOptions(
  presets: readonly number[],
  value: number,
  min: number,
  max: number,
): ComboPresetOption<number>[] {
  const values = new Set<number>();
  for (const n of presets) {
    if (n >= min && n <= max) values.add(n);
  }
  values.add(Math.min(max, Math.max(min, value)));
  return [...values]
    .sort((a, b) => a - b)
    .map((n) => ({ value: n, label: String(n) }));
}

export function spreadsheetSetsOptions(value: number): ComboPresetOption<number>[] {
  return presetOptions(
    SETS_PRESETS,
    value,
    WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME,
    WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME,
  );
}

export function spreadsheetRepsOptions(value: number): ComboPresetOption<number>[] {
  return presetOptions(
    REPS_PRESETS,
    value,
    WL_SESSION_LIMITS.MIN_REPS_PER_SET,
    WL_SESSION_LIMITS.MAX_REPS_PER_SET,
  );
}

export function spreadsheetRestPresetOptions(isEs: boolean): ComboPresetOption<number>[] {
  return REST_PRESETS_SEC.map((sec) => ({
    value: sec,
    label: formatRestLabel(sec, isEs),
  }));
}

/** Clase del menú portalado para combos del spreadsheet (series, %, reps, descanso). */
export const SPREADSHEET_COMBO_MENU_CLASS = 'wolf-se-combo-select__menu--spreadsheet';
