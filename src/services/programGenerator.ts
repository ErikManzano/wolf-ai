import type { Athlete, Exercise, GeneratedProgram, ProgramDay, ProgramWeek, SessionExerciseBlock, SessionGoal, SetScheme } from '../models/training';
import { roundPercentagePrilepin } from './trainingEngine';
import { buildSessionFromBlocks, getDefaultBlockTemplates, getExercisePoolForGoal, newSessionId } from './sessionGenerator';
import { replaceProgramSession } from './sessionMutations';

export interface ProgramGenConfig {
  athleteId: string;
  athlete: Athlete;
  exercises: Exercise[];
  totalWeeks: number;
  daysPerWeek: number;
  primaryGoal: SessionGoal;
  programName?: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Mesociclo en 3 fases + semana final de afinación (taper suave).
 */
function phaseModifiers(weekIndex: number, totalWeeks: number): { pctFactor: number; setFactor: number } {
  if (weekIndex === totalWeeks) {
    return { pctFactor: 0.96, setFactor: 0.62 };
  }
  if (weekIndex > 0 && weekIndex % 4 === 0) {
    return { pctFactor: 0.98, setFactor: 0.82 };
  }
  const p = weekIndex / Math.max(1, totalWeeks);
  if (p <= 0.38) return { pctFactor: 0.97, setFactor: 1.06 };
  if (p <= 0.72) return { pctFactor: 1.0, setFactor: 1.0 };
  return { pctFactor: 1.028, setFactor: 0.94 };
}

/** Objetivo por día para rotar estímulo sin repetir el mismo micro todos los días */
function dayGoal(dayIndex: number, primary: SessionGoal): SessionGoal {
  const cycle: SessionGoal[] = [primary, primary === 'strength' ? 'power' : 'strength', 'technique'];
  return cycle[dayIndex % 3]!;
}

function scaleTemplates(templates: SetScheme[][], mods: { pctFactor: number; setFactor: number }): SetScheme[][] {
  return templates.map((block) =>
    block.map((s) => ({
      percentage: roundPercentagePrilepin(clamp(s.percentage * mods.pctFactor, 52, 95)),
      reps: Math.max(1, Math.round(s.reps)),
      sets: Math.max(1, Math.round(s.sets * mods.setFactor)),
    })),
  );
}

export function buildBlocksForSlot(
  exercises: Exercise[],
  primaryGoal: SessionGoal,
  weekIndex: number,
  totalWeeks: number,
  daysPerWeek: number,
  dayIndex: number,
): SessionExerciseBlock[] {
  const g = dayGoal(dayIndex, primaryGoal);
  const pool = getExercisePoolForGoal(g, exercises);
  const templates = getDefaultBlockTemplates();
  const mods = phaseModifiers(weekIndex, totalWeeks);
  const scaled = scaleTemplates(templates, mods);
  const offset = (weekIndex - 1) * daysPerWeek + dayIndex;
  return scaled.map((sets, i) => ({
    exerciseId: pool[(offset + i) % pool.length]!.id,
    sets,
  }));
}

/**
 * Genera un plan completo (p.ej. 12 semanas × 4 días) con periodización lineal + micro-descargas.
 */
export function generatePeriodizedProgram(config: ProgramGenConfig): GeneratedProgram {
  const {
    athleteId,
    athlete,
    exercises,
    totalWeeks,
    daysPerWeek,
    primaryGoal,
    programName,
  } = config;

  const weeks: ProgramWeek[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const days: ProgramDay[] = [];
    for (let d = 1; d <= daysPerWeek; d++) {
      const blocks = buildBlocksForSlot(exercises, primaryGoal, w, totalWeeks, daysPerWeek, d - 1);
      const session = buildSessionFromBlocks(athleteId, blocks, athlete, exercises);
      days.push({
        dayNumber: d,
        label: `Día ${d}`,
        session,
      });
    }
    weeks.push({ weekNumber: w, days });
  }

  const name =
    programName?.trim() ||
    `Halterofilia ${totalWeeks}s — ${athlete.name}`;

  return {
    id: newSessionId(),
    name,
    athleteId,
    createdAt: new Date().toISOString(),
    totalWeeks,
    daysPerWeek,
    primaryGoal,
    weeks,
  };
}

/** Regenera una sola sesión del plan (misma semana/día, nueva selección de cargas). */
export function regenerateProgramDay(
  program: GeneratedProgram,
  weekNumber: number,
  dayNumber: number,
  athlete: Athlete,
  exercises: Exercise[],
): GeneratedProgram {
  const w = program.weeks.find((x) => x.weekNumber === weekNumber);
  const d = w?.days.find((x) => x.dayNumber === dayNumber);
  if (!d) return program;
  const blocks = buildBlocksForSlot(
    exercises,
    program.primaryGoal,
    weekNumber,
    program.totalWeeks,
    program.daysPerWeek,
    dayNumber - 1,
  );
  const session = buildSessionFromBlocks(program.athleteId, blocks, athlete, exercises, d.session.id);
  return replaceProgramSession(program, weekNumber, dayNumber, session);
}
