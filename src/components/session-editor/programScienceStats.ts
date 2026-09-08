/**
 * Prescribed-load science stats for Estadísticas (mesocycle domain).
 *
 * Zones here follow DeepSeek buckets (<70 / 70–85 / >85).
 * Editor purpose zones remain in spreadsheetPurposeUtils (<75 / 75–83 / ≥83).
 *
 * ACWR / monotony / strain use program days/weeks as the time base
 * (not calendar rolling windows) — label UI accordingly.
 */

import type {
  Athlete,
  Exercise,
  GeneratedProgram,
  ProgramDay,
  ProgramWeek,
  Session,
  SessionExerciseBlock,
  SetScheme,
} from '../../models/training';
import {
  blockTonnage,
  blockTotalReps,
  blockTotalSets,
  estimateSessionMinutes,
  schemeRowTonnage,
} from './blockMetrics';
import {
  exercisesForTechnicalNBL,
  normalizeBlockType,
  parseRepTokens,
} from '../../services/trainingEngine';

export type ScienceZoneId = 'Tecnica_Velocidad' | 'Acumulacion_Tension' | 'Potencia_Neural';
export type AcwrStatus = 'OPTIMAL' | 'ATENCION' | 'RIESGO';

export interface ScienceZoneSlice {
  zone: ScienceZoneId;
  range: string;
  volumeKg: number;
  volumePct: number;
  reps: number;
  repsPct: number;
}

export interface IntensityRange {
  min: number;
  max: number;
}

export interface SessionScienceSummary {
  tonnage: number;
  intensityWeighted: number;
  intensityRange: IntensityRange;
  trainingLoad: number;
  totalSets: number;
  totalReps: number;
  density: number;
  densityEstimated: boolean;
  durationMinutes: number;
}

export interface FatigueMetrics {
  monotony: number | null;
  strain: number | null;
  acwr: {
    value: number | null;
    status: AcwrStatus | null;
    acute: number;
    chronic: number;
  };
  rampRate: number | null;
}

export interface DayScienceRow {
  dayNumber: number;
  name: string;
  summary: SessionScienceSummary;
  stimulusDistribution: ScienceZoneSlice[];
  coachNote: string | null;
}

export interface WeekSciencePayload {
  weekNumber: number;
  summary: SessionScienceSummary & { planCompliance: number | null };
  fatigue: FatigueMetrics;
  stimulusDistribution: ScienceZoneSlice[];
  days: DayScienceRow[];
  trend: {
    labels: string[];
    tonnageData: number[];
    intensityData: number[];
    trainingLoadData: number[];
    chronicBaseline: number;
  };
}

function workBlocks(session: Session): SessionExerciseBlock[] {
  return exercisesForTechnicalNBL(session);
}

/** DeepSeek functional zone for a %1RM (stats module only). */
export function scienceZoneForPct(percentage: number): ScienceZoneId {
  if (percentage < 70) return 'Tecnica_Velocidad';
  if (percentage <= 85) return 'Acumulacion_Tension';
  return 'Potencia_Neural';
}

export function scienceZoneLabel(zone: ScienceZoneId, isEs: boolean): string {
  if (zone === 'Tecnica_Velocidad') return isEs ? 'Técnica / Velocidad' : 'Technique / Speed';
  if (zone === 'Acumulacion_Tension') return isEs ? 'Acumulación de tensión' : 'Tension accumulation';
  return isEs ? 'Potencia / Neural' : 'Max power / Neural';
}

export function scienceZoneRange(zone: ScienceZoneId): string {
  if (zone === 'Tecnica_Velocidad') return '<70%';
  if (zone === 'Acumulacion_Tension') return '70–85%';
  return '>85%';
}

function schemeReps(block: SessionExerciseBlock, row: SetScheme): number {
  if (normalizeBlockType(block) === 'complex' && block.segments?.length) {
    let reps = 0;
    for (let si = 0; si < block.segments.length; si++) {
      reps += parseRepTokens(row.segmentReps?.[si] ?? '0');
    }
    return reps * row.sets;
  }
  return row.reps * row.sets;
}

/** TL (AU) = Σ series × reps × (%1RM / 100) — external relative load, not sRPE×duration. */
export function schemeTrainingLoad(block: SessionExerciseBlock, row: SetScheme): number {
  return schemeReps(block, row) * (row.percentage / 100);
}

export function blockTrainingLoad(block: SessionExerciseBlock): number {
  if (block.countsTowardTechnicalNBL === false) return 0;
  return block.sets.reduce((sum, row) => sum + schemeTrainingLoad(block, row), 0);
}

export function sessionTrainingLoad(session: Session): number {
  return workBlocks(session).reduce((sum, block) => sum + blockTrainingLoad(block), 0);
}

/**
 * IMP = Σ (V_i × %_i) / Σ V_i  (volume-weighted mean %1RM).
 * V_i = scheme tonnage (kg).
 */
export function sessionIntensityWeighted(
  session: Session,
  athlete: Athlete,
  exercises: Exercise[],
): number {
  let volSum = 0;
  let weighted = 0;
  for (const block of workBlocks(session)) {
    for (const row of block.sets) {
      const v = schemeRowTonnage(row, block, athlete, exercises);
      if (v <= 0) continue;
      volSum += v;
      weighted += v * row.percentage;
    }
  }
  if (volSum <= 0) return 0;
  return Math.round((weighted / volSum) * 10) / 10;
}

export function sessionIntensityRange(session: Session): IntensityRange {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const block of workBlocks(session)) {
    for (const row of block.sets) {
      if (!Number.isFinite(row.percentage) || row.percentage <= 0) continue;
      min = Math.min(min, row.percentage);
      max = Math.max(max, row.percentage);
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 0 };
  return { min, max };
}

export function sessionScienceTonnage(
  session: Session,
  athlete: Athlete,
  exercises: Exercise[],
): number {
  return Math.round(
    workBlocks(session).reduce((sum, block) => sum + blockTonnage(block, athlete, exercises), 0),
  );
}

export function computeSessionScienceSummary(
  session: Session,
  athlete: Athlete,
  exercises: Exercise[],
): SessionScienceSummary {
  const blocks = workBlocks(session);
  const tonnage = sessionScienceTonnage(session, athlete, exercises);
  const intensityWeighted = sessionIntensityWeighted(session, athlete, exercises);
  const intensityRange = sessionIntensityRange(session);
  const trainingLoad = Math.round(sessionTrainingLoad(session) * 10) / 10;
  const totalSets = blocks.reduce((s, b) => s + blockTotalSets(b), 0);
  const totalReps = blocks.reduce((s, b) => s + blockTotalReps(b), 0);
  const durationMinutes = estimateSessionMinutes(session);
  const density =
    durationMinutes > 0 ? Math.round((tonnage / durationMinutes) * 10) / 10 : 0;

  return {
    tonnage,
    intensityWeighted,
    intensityRange,
    trainingLoad,
    totalSets,
    totalReps,
    density,
    densityEstimated: true,
    durationMinutes,
  };
}

export function computeStimulusDistribution(
  session: Session,
  athlete: Athlete,
  exercises: Exercise[],
): ScienceZoneSlice[] {
  const volumes: Record<ScienceZoneId, number> = {
    Tecnica_Velocidad: 0,
    Acumulacion_Tension: 0,
    Potencia_Neural: 0,
  };
  const reps: Record<ScienceZoneId, number> = {
    Tecnica_Velocidad: 0,
    Acumulacion_Tension: 0,
    Potencia_Neural: 0,
  };

  for (const block of workBlocks(session)) {
    for (const row of block.sets) {
      const zone = scienceZoneForPct(row.percentage);
      volumes[zone] += schemeRowTonnage(row, block, athlete, exercises);
      reps[zone] += schemeReps(block, row);
    }
  }

  const volTotal = volumes.Tecnica_Velocidad + volumes.Acumulacion_Tension + volumes.Potencia_Neural;
  const repsTotal = reps.Tecnica_Velocidad + reps.Acumulacion_Tension + reps.Potencia_Neural;
  const order: ScienceZoneId[] = ['Tecnica_Velocidad', 'Acumulacion_Tension', 'Potencia_Neural'];

  return order.map((zone) => ({
    zone,
    range: scienceZoneRange(zone),
    volumeKg: Math.round(volumes[zone]),
    volumePct: volTotal > 0 ? Math.round((volumes[zone] / volTotal) * 100) : 0,
    reps: Math.round(reps[zone]),
    repsPct: repsTotal > 0 ? Math.round((reps[zone] / repsTotal) * 100) : 0,
  }));
}

function mergeDistributions(parts: ScienceZoneSlice[][]): ScienceZoneSlice[] {
  const volumes: Record<ScienceZoneId, number> = {
    Tecnica_Velocidad: 0,
    Acumulacion_Tension: 0,
    Potencia_Neural: 0,
  };
  const reps: Record<ScienceZoneId, number> = {
    Tecnica_Velocidad: 0,
    Acumulacion_Tension: 0,
    Potencia_Neural: 0,
  };
  for (const part of parts) {
    for (const slice of part) {
      volumes[slice.zone] += slice.volumeKg;
      reps[slice.zone] += slice.reps;
    }
  }
  const volTotal = volumes.Tecnica_Velocidad + volumes.Acumulacion_Tension + volumes.Potencia_Neural;
  const repsTotal = reps.Tecnica_Velocidad + reps.Acumulacion_Tension + reps.Potencia_Neural;
  const order: ScienceZoneId[] = ['Tecnica_Velocidad', 'Acumulacion_Tension', 'Potencia_Neural'];
  return order.map((zone) => ({
    zone,
    range: scienceZoneRange(zone),
    volumeKg: Math.round(volumes[zone]),
    volumePct: volTotal > 0 ? Math.round((volumes[zone] / volTotal) * 100) : 0,
    reps: Math.round(reps[zone]),
    repsPct: repsTotal > 0 ? Math.round((reps[zone] / repsTotal) * 100) : 0,
  }));
}

export function dayTrainingLoad(day: ProgramDay): number {
  return sessionTrainingLoad(day.session);
}

export function weekDailyTrainingLoads(week: ProgramWeek | undefined): number[] {
  if (!week) return [];
  return [...week.days]
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((d) => dayTrainingLoad(d));
}

export function weekTrainingLoad(week: ProgramWeek | undefined): number {
  return weekDailyTrainingLoads(week).reduce((a, b) => a + b, 0);
}

/** Monotony M = μ_TL / σ_TL over days of the microcycle (Foster-style on prescribed days). */
export function computeMonotony(dailyTl: number[]): number | null {
  const active = dailyTl.filter((v) => v > 0);
  if (active.length < 2) return null;
  const mean = active.reduce((a, b) => a + b, 0) / active.length;
  if (mean <= 0) return null;
  const variance = active.reduce((sum, v) => sum + (v - mean) ** 2, 0) / active.length;
  const sd = Math.sqrt(variance);
  if (sd <= 0) return null;
  return Math.round((mean / sd) * 100) / 100;
}

export function computeStrain(dailyTl: number[], monotony: number | null): number | null {
  if (monotony == null) return null;
  const sum = dailyTl.reduce((a, b) => a + b, 0);
  return Math.round(sum * monotony);
}

export function classifyAcwr(value: number): AcwrStatus {
  if (value >= 0.8 && value <= 1.3) return 'OPTIMAL';
  if (value > 1.3 && value <= 1.5) return 'ATENCION';
  return 'RIESGO';
}

/**
 * ACWR over mesocycle: acute = mean TL of current week days;
 * chronic = mean TL of days in last up-to-4 weeks including current.
 */
export function computeMesocycleAcwr(
  program: GeneratedProgram,
  weekNumber: number,
): FatigueMetrics['acwr'] {
  const weeks = [...program.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const current = weeks.find((w) => w.weekNumber === weekNumber);
  const acuteLoads = weekDailyTrainingLoads(current).filter((v) => v > 0);
  const acute =
    acuteLoads.length > 0 ? acuteLoads.reduce((a, b) => a + b, 0) / acuteLoads.length : 0;

  const chronicWeeks = weeks.filter(
    (w) => w.weekNumber <= weekNumber && w.weekNumber > weekNumber - 4,
  );
  const chronicLoads = chronicWeeks.flatMap((w) => weekDailyTrainingLoads(w)).filter((v) => v > 0);
  const chronic =
    chronicLoads.length > 0 ? chronicLoads.reduce((a, b) => a + b, 0) / chronicLoads.length : 0;

  if (acute <= 0 || chronic <= 0) {
    return { value: null, status: null, acute: Math.round(acute), chronic: Math.round(chronic) };
  }
  const value = Math.round((acute / chronic) * 100) / 100;
  return {
    value,
    status: classifyAcwr(value),
    acute: Math.round(acute),
    chronic: Math.round(chronic),
  };
}

export function computeRampRate(currentTl: number, previousTl: number): number | null {
  if (previousTl <= 0) return null;
  return Math.round(((currentTl - previousTl) / previousTl) * 1000) / 10;
}

export function computeWeekScience(
  program: GeneratedProgram,
  weekNumber: number,
  athlete: Athlete,
  exercises: Exercise[],
  planCompliance: number | null = null,
): WeekSciencePayload | null {
  const week = program.weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) return null;

  const daysSorted = [...week.days].sort((a, b) => a.dayNumber - b.dayNumber);
  const dayRows: DayScienceRow[] = daysSorted.map((day) => {
    const summary = computeSessionScienceSummary(day.session, athlete, exercises);
    return {
      dayNumber: day.dayNumber,
      name: day.label || `D${day.dayNumber}`,
      summary,
      stimulusDistribution: computeStimulusDistribution(day.session, athlete, exercises),
      coachNote: day.coachNote?.trim() || null,
    };
  });

  const tonnage = dayRows.reduce((s, d) => s + d.summary.tonnage, 0);
  const trainingLoad = Math.round(dayRows.reduce((s, d) => s + d.summary.trainingLoad, 0) * 10) / 10;
  const totalSets = dayRows.reduce((s, d) => s + d.summary.totalSets, 0);
  const totalReps = dayRows.reduce((s, d) => s + d.summary.totalReps, 0);
  const durationMinutes = dayRows.reduce((s, d) => s + d.summary.durationMinutes, 0);

  let volWeightedPct = 0;
  let volSum = 0;
  let minPct = Number.POSITIVE_INFINITY;
  let maxPct = Number.NEGATIVE_INFINITY;
  for (const day of daysSorted) {
    for (const block of workBlocks(day.session)) {
      for (const row of block.sets) {
        const v = schemeRowTonnage(row, block, athlete, exercises);
        if (v > 0) {
          volSum += v;
          volWeightedPct += v * row.percentage;
        }
        if (row.percentage > 0) {
          minPct = Math.min(minPct, row.percentage);
          maxPct = Math.max(maxPct, row.percentage);
        }
      }
    }
  }

  const intensityWeighted =
    volSum > 0 ? Math.round((volWeightedPct / volSum) * 10) / 10 : 0;
  const intensityRange: IntensityRange =
    Number.isFinite(minPct) && Number.isFinite(maxPct)
      ? { min: minPct, max: maxPct }
      : { min: 0, max: 0 };

  const density =
    durationMinutes > 0 ? Math.round((tonnage / durationMinutes) * 10) / 10 : 0;

  const dailyTl = weekDailyTrainingLoads(week);
  const monotony = computeMonotony(dailyTl);
  const strain = computeStrain(dailyTl, monotony);
  const prevWeek = program.weeks.find((w) => w.weekNumber === weekNumber - 1);
  const rampRate = computeRampRate(weekTrainingLoad(week), weekTrainingLoad(prevWeek));
  const acwr = computeMesocycleAcwr(program, weekNumber);

  const weeksSorted = [...program.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const trendLabels: string[] = [];
  const tonnageData: number[] = [];
  const intensityData: number[] = [];
  const trainingLoadData: number[] = [];

  for (const w of weeksSorted) {
    const scienceDays = w.days.map((d) => computeSessionScienceSummary(d.session, athlete, exercises));
    const wTon = scienceDays.reduce((s, d) => s + d.tonnage, 0);
    let wVol = 0;
    let wW = 0;
    for (const d of w.days) {
      for (const block of workBlocks(d.session)) {
        for (const row of block.sets) {
          const v = schemeRowTonnage(row, block, athlete, exercises);
          if (v > 0) {
            wVol += v;
            wW += v * row.percentage;
          }
        }
      }
    }
    trendLabels.push(`Sem ${w.weekNumber}`);
    tonnageData.push(wTon);
    intensityData.push(wVol > 0 ? Math.round((wW / wVol) * 10) / 10 : 0);
    trainingLoadData.push(Math.round(weekTrainingLoad(w) * 10) / 10);
  }

  const chronicWeeks = weeksSorted.filter(
    (w) => w.weekNumber <= weekNumber && w.weekNumber > weekNumber - 4,
  );
  const chronicBaseline =
    chronicWeeks.length > 0
      ? Math.round(
          chronicWeeks.reduce((s, w) => s + weekTrainingLoad(w), 0) / chronicWeeks.length,
        )
      : 0;

  return {
    weekNumber,
    summary: {
      tonnage,
      intensityWeighted,
      intensityRange,
      trainingLoad,
      totalSets,
      totalReps,
      density,
      densityEstimated: true,
      durationMinutes,
      planCompliance,
    },
    fatigue: {
      monotony,
      strain,
      acwr,
      rampRate,
    },
    stimulusDistribution: mergeDistributions(dayRows.map((d) => d.stimulusDistribution)),
    days: dayRows,
    trend: {
      labels: trendLabels,
      tonnageData,
      intensityData,
      trainingLoadData,
      chronicBaseline,
    },
  };
}

/** Prescribed TL ACWR for the current week of a program (enrollment roster). */
export function programAthleteAcwr(
  program: GeneratedProgram,
  weekNumber: number,
): { weeklyTl: number; acwr: number | null; acwrStatus: AcwrStatus | null } {
  const week = program.weeks.find((w) => w.weekNumber === weekNumber);
  const weeklyTl = Math.round(weekTrainingLoad(week));
  const acwr = computeMesocycleAcwr(program, weekNumber);
  return {
    weeklyTl,
    acwr: acwr.value,
    acwrStatus: acwr.status,
  };
}

/** Calendar date for program day when startDate is set (YYYY-MM-DD). */
export function programDayDate(
  program: GeneratedProgram,
  weekNumber: number,
  dayNumber: number,
): string | null {
  if (!program.startDate) return null;
  const start = new Date(`${program.startDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const week = program.weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) return null;
  const days = [...week.days].sort((a, b) => a.dayNumber - b.dayNumber);
  const dayIndex = days.findIndex((d) => d.dayNumber === dayNumber);
  if (dayIndex < 0) return null;
  const weeksBefore = program.weeks.filter((w) => w.weekNumber < weekNumber);
  const daysBefore = weeksBefore.reduce((sum, w) => sum + w.days.length, 0) + dayIndex;
  const d = new Date(start);
  d.setDate(d.getDate() + daysBefore);
  return d.toISOString().slice(0, 10);
}

export function formatShortDate(iso: string, isEs: boolean): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(isEs ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' });
}
