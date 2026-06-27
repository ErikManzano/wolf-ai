import type { ProgramDay, ProgramWeek } from '../../models/training';

export type WeekRow = { id: string; weekNumber: number };
export type DayRow = { id: string; dayNumber: number; label?: string };

export const TAB_SPRING = { type: 'spring' as const, stiffness: 640, damping: 40, mass: 0.7 };

export const TAB_DRAG = {
  scale: 1.045,
  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.28)',
  zIndex: 24,
};

export const MATRIX_ROW_DRAG = {
  scale: 1.012,
  boxShadow: '0 14px 36px rgba(0, 0, 0, 0.35)',
  zIndex: 20,
};

export const MATRIX_COL_DRAG = {
  scale: 1.03,
  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.32)',
  zIndex: 22,
};

export function newRowId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function syncWeekRows(weeks: ProgramWeek[], prev: WeekRow[]): WeekRow[] {
  return weeks.map((w, i) => ({
    id: prev[i]?.id ?? newRowId('week'),
    weekNumber: w.weekNumber,
  }));
}

export function syncDayRows(days: ProgramDay[], prev: DayRow[]): DayRow[] {
  return days.map((d, i) => ({
    id: prev[i]?.id ?? newRowId('day'),
    dayNumber: d.dayNumber,
    label: d.label,
  }));
}

export function syncDayRowsFromNumbers(dayNumbers: number[], prev: DayRow[]): DayRow[] {
  return dayNumbers.map((dayNumber, i) => ({
    id: prev[i]?.id ?? newRowId('day'),
    dayNumber,
  }));
}

export function findMoveIndices(before: string[], after: string[]): { from: number; to: number } | null {
  if (before.length !== after.length) return null;
  let from = -1;
  for (let i = 0; i < before.length; i++) {
    if (before[i] !== after[i]) {
      from = i;
      break;
    }
  }
  if (from < 0) return null;
  const movedId = before[from];
  const to = after.indexOf(movedId!);
  if (to < 0 || from === to) return null;
  return { from, to };
}

/** Desktop: columns share all available width (min 0 so grid can shrink). */
export function matrixGridTemplate(dayCount: number) {
  return `var(--matrix-week-col, 88px) repeat(${dayCount}, minmax(0, 1fr))`;
}

/** Mobile / narrow: enforce minimum day width; table scrolls horizontally. */
export function matrixGridTemplateCompact(dayCount: number) {
  return `var(--matrix-week-col, 88px) repeat(${dayCount}, minmax(var(--matrix-day-min, 96px), 1fr))`;
}
