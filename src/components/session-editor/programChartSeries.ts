import type { Athlete, Exercise, GeneratedProgram, ProgramWeek, Session } from '../../models/training';
import { exercisesForTechnicalNBL, normalizeBlockType, parseRepTokens } from '../../services/trainingEngine';
import type { SessionExerciseBlock, SetScheme } from '../../models/training';
import { schemeRowTonnage } from './blockMetrics';
import {
  sessionIntensityWeighted,
  sessionIntensityWeightedByRepVolume,
  sessionScienceTonnage,
  sessionTrainingLoad,
} from './programScienceStats';
import { sessionPurposeBreakdown } from './sessionSummaryMetrics';
import { statsSessionTonnage } from './statsTonnage';
import type { SetPurpose } from './spreadsheetPurposeUtils';

export type ScatterPurposeTone = SetPurpose;

export type ScatterScienceZone = 'technique' | 'accumulation' | 'neural';

export interface VolumeIntensityScatterPoint {
  id: string;
  label: string;
  weekNumber: number;
  dayNumber: number;
  tonnage: number;
  avgPct: number;
  sets: number;
  au: number;
  scienceZone: ScatterScienceZone;
  purpose: ScatterPurposeTone | null;
  /** Semana anterior — mismo día */
  prevTonnage?: number;
  prevImp?: number;
  /** Highlight current editor selection */
  isCurrent?: boolean;
}

export interface DailyTrendChartData {
  labels: string[];
  dayNumbers: number[];
  tonnage: Array<number | null>;
  imp: Array<number | null>;
  au: Array<number | null>;
  prevTonnage: Array<number | null>;
  prevImp: Array<number | null>;
  volumeBaseline: number | null;
}

export function scienceZoneFromPct(pct: number): ScatterScienceZone {
  if (pct < 70) return 'technique';
  if (pct <= 85) return 'accumulation';
  return 'neural';
}

export function scienceZoneLabel(zone: ScatterScienceZone, isEs: boolean): string {
  if (zone === 'technique') return isEs ? 'Técnica' : 'Technique';
  if (zone === 'accumulation') return isEs ? 'Acumulación' : 'Accumulation';
  return isEs ? 'Neural' : 'Neural';
}

export type IntensityHistogramMetric = 'series' | 'reps' | 'tonnage';

export interface IntensityHistogramBin {
  id: string;
  label: string;
  minPct: number;
  maxPct: number;
  series: number;
  reps: number;
  tonnage: number;
}

export interface WeekDayTrendPoint {
  dayNumber: number;
  label: string;
  tonnage: number;
  imp: number;
}

function dominantPurposeFromSession(session: Session): ScatterPurposeTone | null {
  const breakdown = sessionPurposeBreakdown(session.exercises);
  if (breakdown.total <= 0) return null;
  const entries: Array<[ScatterPurposeTone, number]> = [
    ['technique', breakdown.technique],
    ['work', breakdown.work],
    ['intensity', breakdown.intensity],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? null;
}

function sessionScatterMetrics(
  session: Session,
  athlete: Athlete,
  exercises: Exercise[],
  templateMetrics: boolean,
): { tonnage: number; avgPct: number; sets: number; au: number } {
  const blocks = exercisesForTechnicalNBL(session);
  const sets = blocks.reduce((s, b) => s + b.sets.reduce((rs, row) => rs + row.sets, 0), 0);
  const avgPct = templateMetrics
    ? sessionIntensityWeightedByRepVolume(session)
    : sessionIntensityWeighted(session, athlete, exercises);
  const tonnage = templateMetrics ? 0 : statsSessionTonnage(session, athlete, exercises);
  const au = Math.round(sessionTrainingLoad(session) * 10) / 10;
  return { tonnage, avgPct, sets, au };
}

function sessionToScatterPoint(
  session: Session,
  athlete: Athlete,
  exercises: Exercise[],
  weekNumber: number,
  dayNumber: number,
  label: string,
  templateMetrics: boolean,
  isCurrent?: boolean,
): VolumeIntensityScatterPoint | null {
  if (!session.exercises.length) return null;
  const { tonnage, avgPct, sets, au } = sessionScatterMetrics(session, athlete, exercises, templateMetrics);
  if (sets <= 0 && avgPct <= 0 && tonnage <= 0) return null;
  const imp = avgPct > 0 ? avgPct : 0;
  return {
    id: `w${weekNumber}-d${dayNumber}`,
    label,
    weekNumber,
    dayNumber,
    tonnage,
    avgPct: imp,
    sets,
    au,
    scienceZone: scienceZoneFromPct(imp > 0 ? imp : 70),
    purpose: dominantPurposeFromSession(session),
    isCurrent,
  };
}

export function buildWeekScatterSeries(params: {
  week: ProgramWeek | undefined;
  previousWeek?: ProgramWeek;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  templateMetrics?: boolean;
  highlightWeekNumber?: number;
  highlightDayNumber?: number;
}): VolumeIntensityScatterPoint[] {
  const {
    week,
    previousWeek,
    athlete,
    exercises,
    isEs,
    templateMetrics = false,
    highlightWeekNumber,
    highlightDayNumber,
  } = params;
  if (!week) return [];
  const points: VolumeIntensityScatterPoint[] = [];
  for (const day of [...week.days].sort((a, b) => a.dayNumber - b.dayNumber)) {
    const label = isEs ? `D${day.dayNumber}` : `D${day.dayNumber}`;
    const pt = sessionToScatterPoint(
      day.session,
      athlete,
      exercises,
      week.weekNumber,
      day.dayNumber,
      label,
      templateMetrics,
      highlightWeekNumber === week.weekNumber && highlightDayNumber === day.dayNumber,
    );
    if (!pt) continue;
    const prevDay = previousWeek?.days.find((d) => d.dayNumber === day.dayNumber);
    if (prevDay?.session.exercises.length) {
      const prev = sessionScatterMetrics(prevDay.session, athlete, exercises, templateMetrics);
      if (prev.tonnage > 0 || prev.avgPct > 0) {
        pt.prevTonnage = prev.tonnage;
        pt.prevImp = prev.avgPct;
      }
    }
    points.push(pt);
  }
  return points;
}

export function buildProgramScatterSeries(params: {
  program: GeneratedProgram;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  templateMetrics?: boolean;
  /** Limit to selected week when set */
  weekNumber?: number;
}): VolumeIntensityScatterPoint[] {
  const { program, athlete, exercises, isEs, templateMetrics = false, weekNumber } = params;
  const weeks = [...program.weeks]
    .filter((w) => (weekNumber != null ? w.weekNumber === weekNumber : true))
    .sort((a, b) => a.weekNumber - b.weekNumber);
  const points: VolumeIntensityScatterPoint[] = [];
  for (const week of weeks) {
    for (const day of [...week.days].sort((a, b) => a.dayNumber - b.dayNumber)) {
      const label = isEs
        ? `S${week.weekNumber} D${day.dayNumber}`
        : `W${week.weekNumber} D${day.dayNumber}`;
      const pt = sessionToScatterPoint(
        day.session,
        athlete,
        exercises,
        week.weekNumber,
        day.dayNumber,
        label,
        templateMetrics,
      );
      if (pt) points.push(pt);
    }
  }
  return points;
}

const INTENSITY_BIN_DEFS: Array<{ id: string; label: string; minPct: number; maxPct: number }> = [
  { id: 'lt70', label: '<70%', minPct: 0, maxPct: 69.999 },
  { id: '70-80', label: '70–80%', minPct: 70, maxPct: 80 },
  { id: '80-90', label: '80–90%', minPct: 80.001, maxPct: 90 },
  { id: '90-95', label: '90–95%', minPct: 90.001, maxPct: 95 },
  { id: 'gt95', label: '>95%', minPct: 95.001, maxPct: 200 },
];

function pctInBin(pct: number, binId: string): boolean {
  if (pct <= 0) return false;
  switch (binId) {
    case 'lt70':
      return pct < 70;
    case '70-80':
      return pct >= 70 && pct <= 80;
    case '80-90':
      return pct > 80 && pct <= 90;
    case '90-95':
      return pct > 90 && pct <= 95;
    case 'gt95':
      return pct > 95;
    default:
      return false;
  }
}

function schemeRepsForRow(block: SessionExerciseBlock, row: SetScheme): number {
  if (normalizeBlockType(block) === 'complex' && block.segments?.length) {
    let reps = 0;
    for (let si = 0; si < block.segments.length; si++) {
      reps += parseRepTokens(row.segmentReps?.[si] ?? '0');
    }
    return reps * row.sets;
  }
  const repsPerSet = row.reps > 0 ? row.reps : 1;
  return row.sets * repsPerSet;
}

export function buildSessionIntensityBins(params: {
  session: Session | null;
  athlete: Athlete;
  exercises: Exercise[];
  templateMetrics?: boolean;
}): IntensityHistogramBin[] {
  const { session, athlete, exercises, templateMetrics = false } = params;
  const empty = INTENSITY_BIN_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    minPct: def.minPct,
    maxPct: def.maxPct,
    series: 0,
    reps: 0,
    tonnage: 0,
  }));
  if (!session?.exercises.length) return empty;

  const acc = empty.map((b) => ({ ...b }));

  for (const block of exercisesForTechnicalNBL(session)) {
    for (const row of block.sets) {
      const pct = row.percentage;
      if (!pct || pct <= 0) continue;
      const binIdx = INTENSITY_BIN_DEFS.findIndex((def) => pctInBin(pct, def.id));
      if (binIdx < 0) continue;
      const reps = schemeRepsForRow(block, row);
      const tonnage = templateMetrics ? 0 : Math.round(schemeRowTonnage(row, block, athlete, exercises));
      acc[binIdx]!.series += row.sets;
      acc[binIdx]!.reps += reps;
      acc[binIdx]!.tonnage += tonnage;
    }
  }

  return acc;
}

export function buildWeekIntensityBins(params: {
  week: ProgramWeek | undefined;
  athlete: Athlete;
  exercises: Exercise[];
  templateMetrics?: boolean;
}): IntensityHistogramBin[] {
  const { week, athlete, exercises, templateMetrics = false } = params;
  const merged = INTENSITY_BIN_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    minPct: def.minPct,
    maxPct: def.maxPct,
    series: 0,
    reps: 0,
    tonnage: 0,
  }));
  if (!week) return merged;
  for (const day of week.days) {
    const dayBins = buildSessionIntensityBins({
      session: day.session,
      athlete,
      exercises,
      templateMetrics,
    });
    dayBins.forEach((bin, i) => {
      merged[i]!.series += bin.series;
      merged[i]!.reps += bin.reps;
      merged[i]!.tonnage += bin.tonnage;
    });
  }
  return merged;
}

export function buildProgramIntensityBins(params: {
  program: GeneratedProgram;
  athlete: Athlete;
  exercises: Exercise[];
  templateMetrics?: boolean;
  weekNumber?: number;
}): IntensityHistogramBin[] {
  const { program, athlete, exercises, templateMetrics = false, weekNumber } = params;
  const merged = INTENSITY_BIN_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    minPct: def.minPct,
    maxPct: def.maxPct,
    series: 0,
    reps: 0,
    tonnage: 0,
  }));
  const weeks = program.weeks.filter((w) => (weekNumber != null ? w.weekNumber === weekNumber : true));
  for (const week of weeks) {
    const weekBins = buildWeekIntensityBins({ week, athlete, exercises, templateMetrics });
    weekBins.forEach((bin, i) => {
      merged[i]!.series += bin.series;
      merged[i]!.reps += bin.reps;
      merged[i]!.tonnage += bin.tonnage;
    });
  }
  return merged;
}

export function buildWeekDayTrendSeries(params: {
  week: ProgramWeek | undefined;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  templateMetrics?: boolean;
}): WeekDayTrendPoint[] {
  const { week, athlete, exercises, isEs, templateMetrics = false } = params;
  if (!week) return [];
  return [...week.days]
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => {
      const session = day.session;
      const hasWork = session.exercises.length > 0;
      const tonnage = hasWork
        ? templateMetrics
          ? 0
          : sessionScienceTonnage(session, athlete, exercises)
        : 0;
      const imp = hasWork
        ? templateMetrics
          ? sessionIntensityWeightedByRepVolume(session)
          : sessionIntensityWeighted(session, athlete, exercises)
        : 0;
      return {
        dayNumber: day.dayNumber,
        label: isEs ? `D${day.dayNumber}` : `D${day.dayNumber}`,
        tonnage,
        imp,
      };
    })
    .filter((p) => p.tonnage > 0 || p.imp > 0);
}

function programDailyVolumeBaseline(
  program: GeneratedProgram,
  athlete: Athlete,
  exercises: Exercise[],
  throughWeekNumber: number,
  templateMetrics: boolean,
): number | null {
  let sum = 0;
  let count = 0;
  for (const week of program.weeks.filter((w) => w.weekNumber <= throughWeekNumber)) {
    for (const day of week.days) {
      if (!day.session.exercises.length) continue;
      const vol = templateMetrics
        ? 0
        : sessionScienceTonnage(day.session, athlete, exercises);
      if (vol > 0) {
        sum += vol;
        count += 1;
      }
    }
  }
  if (count === 0) return null;
  return Math.round(sum / count);
}

export function buildWeekDailyTrendChartData(params: {
  program: GeneratedProgram;
  week: ProgramWeek | undefined;
  previousWeek?: ProgramWeek;
  weekNumber: number;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  templateMetrics?: boolean;
}): DailyTrendChartData {
  const {
    program,
    week,
    previousWeek,
    weekNumber,
    athlete,
    exercises,
    isEs,
    templateMetrics = false,
  } = params;

  const empty: DailyTrendChartData = {
    labels: [],
    dayNumbers: [],
    tonnage: [],
    imp: [],
    au: [],
    prevTonnage: [],
    prevImp: [],
    volumeBaseline: null,
  };
  if (!week?.days.length) return empty;

  const sorted = [...week.days].sort((a, b) => a.dayNumber - b.dayNumber);
  const labels = sorted.map((d) => (isEs ? `D${d.dayNumber}` : `D${d.dayNumber}`));
  const dayNumbers = sorted.map((d) => d.dayNumber);

  const tonnage: Array<number | null> = [];
  const imp: Array<number | null> = [];
  const au: Array<number | null> = [];
  const prevTonnage: Array<number | null> = [];
  const prevImp: Array<number | null> = [];

  for (const day of sorted) {
    const hasWork = day.session.exercises.length > 0;
    if (!hasWork) {
      tonnage.push(null);
      imp.push(null);
      au.push(null);
    } else {
      const m = sessionScatterMetrics(day.session, athlete, exercises, templateMetrics);
      tonnage.push(templateMetrics ? null : m.tonnage > 0 ? m.tonnage : null);
      imp.push(m.avgPct > 0 ? m.avgPct : null);
      au.push(m.au > 0 ? m.au : null);
    }
    const prevDay = previousWeek?.days.find((d) => d.dayNumber === day.dayNumber);
    if (prevDay?.session.exercises.length) {
      const pm = sessionScatterMetrics(prevDay.session, athlete, exercises, templateMetrics);
      prevTonnage.push(templateMetrics ? null : pm.tonnage > 0 ? pm.tonnage : null);
      prevImp.push(pm.avgPct > 0 ? pm.avgPct : null);
    } else {
      prevTonnage.push(null);
      prevImp.push(null);
    }
  }

  return {
    labels,
    dayNumbers,
    tonnage,
    imp,
    au,
    prevTonnage,
    prevImp,
    volumeBaseline: programDailyVolumeBaseline(
      program,
      athlete,
      exercises,
      weekNumber,
      templateMetrics,
    ),
  };
}

/** Día abierto: el mismo día en cada semana del mesociclo. */
export function buildDayAcrossWeeksTrend(params: {
  program: GeneratedProgram;
  weekNumber: number;
  dayNumber: number;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  templateMetrics?: boolean;
}): DailyTrendChartData {
  const { program, dayNumber, athlete, exercises, isEs, templateMetrics = false } = params;
  const weeks = [...program.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const metrics = weeks.map((week) => {
    const day = week.days.find((d) => d.dayNumber === dayNumber);
    if (!day?.session.exercises.length) return null;
    return sessionScatterMetrics(day.session, athlete, exercises, templateMetrics);
  });

  return {
    labels: weeks.map((week) => (isEs ? `S${week.weekNumber}` : `W${week.weekNumber}`)),
    dayNumbers: weeks.map(() => dayNumber),
    tonnage: metrics.map((m) => (m && !templateMetrics && m.tonnage > 0 ? m.tonnage : null)),
    imp: metrics.map((m) => (m && m.avgPct > 0 ? m.avgPct : null)),
    au: metrics.map((m) => (m && m.au > 0 ? m.au : null)),
    prevTonnage: metrics.map((m, i) => {
      const prev = i > 0 ? metrics[i - 1] : null;
      if (!m || !prev || templateMetrics || prev.tonnage <= 0) return null;
      return prev.tonnage;
    }),
    prevImp: metrics.map((m, i) => {
      const prev = i > 0 ? metrics[i - 1] : null;
      if (!m || !prev || prev.avgPct <= 0) return null;
      return prev.avgPct;
    }),
    volumeBaseline: null,
  };
}

/** Day tab: same weekday across weeks (current week highlighted). */
export function buildDayScatterSeries(params: {
  program: GeneratedProgram;
  weekNumber: number;
  dayNumber: number;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  templateMetrics?: boolean;
}): VolumeIntensityScatterPoint[] {
  const { program, weekNumber, dayNumber, athlete, exercises, isEs, templateMetrics = false } = params;
  const points: VolumeIntensityScatterPoint[] = [];
  const weeks = [...program.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  for (const week of weeks) {
    const day = week.days.find((d) => d.dayNumber === dayNumber);
    if (!day?.session.exercises.length) continue;
    const label = isEs ? `S${week.weekNumber} · D${dayNumber}` : `W${week.weekNumber} · D${dayNumber}`;
    const pt = sessionToScatterPoint(
      day.session,
      athlete,
      exercises,
      week.weekNumber,
      dayNumber,
      label,
      templateMetrics,
      week.weekNumber === weekNumber,
    );
    if (pt) points.push(pt);
  }
  return points;
}

export function histogramMetricValue(bin: IntensityHistogramBin, metric: IntensityHistogramMetric): number {
  if (metric === 'series') return bin.series;
  if (metric === 'reps') return bin.reps;
  return bin.tonnage;
}

export const SCATTER_PURPOSE_COLORS: Record<ScatterPurposeTone, string> = {
  technique: 'var(--stats-technique, #3b82f6)',
  work: 'var(--stats-work, #10b981)',
  intensity: 'var(--stats-intensity, #f97316)',
};

/** Color por zona científica IMP (técnica / acumulación / neural). */
export const SCATTER_ZONE_COLORS: Record<ScatterScienceZone, string> = {
  technique: 'var(--stats-work, #10b981)',
  accumulation: 'var(--stats-blue, #2563eb)',
  neural: 'var(--stats-orange, #f97316)',
};
