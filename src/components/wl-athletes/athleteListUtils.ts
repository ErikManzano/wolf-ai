import type { AthleteLevel } from '../../models/training';
import type { WlAthleteRosterRow } from '../../utils/wlAthleteRoster';

export type AthleteFilterId = 'all' | 'no_program' | 'low_adherence' | AthleteLevel;
export type AthleteSortId = 'name_asc' | 'name_desc' | 'adherence_asc' | 'adherence_desc' | 'recent';

const LOW_ADHERENCE_PCT = 15;

export function filterAthleteRows(
  rows: WlAthleteRosterRow[],
  query: string,
  filter: AthleteFilterId,
): WlAthleteRosterRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (q) {
      const hay = `${row.name} ${row.level} ${row.programName ?? ''} ${row.loginLabel ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filter === 'no_program') return row.assignmentStatus === 'none';
    if (filter === 'low_adherence') {
      return row.assignmentStatus === 'active' && (row.completionPct ?? 0) < LOW_ADHERENCE_PCT;
    }
    if (filter === 'beginner' || filter === 'intermediate' || filter === 'advanced') {
      return row.level === filter;
    }
    return true;
  });
}

export function sortAthleteRows(rows: WlAthleteRosterRow[], sort: AthleteSortId): WlAthleteRosterRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'adherence_asc':
        return (a.completionPct ?? -1) - (b.completionPct ?? -1);
      case 'adherence_desc':
        return (b.completionPct ?? -1) - (a.completionPct ?? -1);
      case 'recent': {
        const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return tb - ta;
      }
      case 'name_asc':
      default:
        return a.name.localeCompare(b.name);
    }
  });
  return copy;
}
