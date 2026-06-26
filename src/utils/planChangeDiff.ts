import type {
  GeneratedProgram,
  SessionExerciseBlock,
  SetScheme,
} from '../models/training';
import type { ProgramEditContext } from '../models/notifications';

export type PlanChangeDiffLines = {
  linesEs: string[];
  linesEn: string[];
};

type NameResolver = (exerciseId: string) => string;

function getDayBlocks(
  program: GeneratedProgram,
  weekNumber: number,
  dayNumber: number,
): SessionExerciseBlock[] | null {
  const week = program.weeks.find((w) => w.weekNumber === weekNumber);
  const day = week?.days.find((d) => d.dayNumber === dayNumber);
  return day?.session.exercises ?? null;
}

function blockKey(block: SessionExerciseBlock): string {
  if (block.blockType === 'complex' && block.segments?.length) {
    return `complex:${block.segments.map((s) => s.exerciseId).join('+')}`;
  }
  return `single:${block.exerciseId}`;
}

function blockLabel(block: SessionExerciseBlock, resolveName: NameResolver): string {
  if (block.blockType === 'complex' && block.segments?.length) {
    return block.segments.map((s) => resolveName(s.exerciseId)).join(' + ');
  }
  return resolveName(block.exerciseId);
}

function totalWorkSets(sets: SetScheme[]): number {
  return sets.reduce((sum, row) => sum + row.sets, 0);
}

function intensityLabel(sets: SetScheme[]): string {
  const unique = [...new Set(sets.map((s) => s.percentage))];
  if (unique.length === 0) return '—';
  if (unique.length === 1) return `${unique[0]}%`;
  return unique.map((p) => `${p}%`).join('/');
}

function describeSetChange(
  label: string,
  before: SetScheme[],
  after: SetScheme[],
): { es: string; en: string } | null {
  const setsBefore = totalWorkSets(before);
  const setsAfter = totalWorkSets(after);
  const pctBefore = intensityLabel(before);
  const pctAfter = intensityLabel(after);
  const repsBefore = before[0]?.reps;
  const repsAfter = after[0]?.reps;

  const partsEs: string[] = [];
  const partsEn: string[] = [];

  if (setsBefore !== setsAfter) {
    partsEs.push(`${setsBefore}→${setsAfter} series`);
    partsEn.push(`${setsBefore}→${setsAfter} sets`);
  }
  if (pctBefore !== pctAfter) {
    partsEs.push(`${pctBefore}→${pctAfter}`);
    partsEn.push(`${pctBefore}→${pctAfter}`);
  }
  if (repsBefore != null && repsAfter != null && repsBefore !== repsAfter) {
    partsEs.push(`${repsBefore}→${repsAfter} reps`);
    partsEn.push(`${repsBefore}→${repsAfter} reps`);
  }

  if (partsEs.length === 0) return null;
  return {
    es: `${label}: ${partsEs.join(', ')}`,
    en: `${label}: ${partsEn.join(', ')}`,
  };
}

/** Diff ejercicios de un día concreto entre dos versiones del programa. */
export function diffProgramDay(
  previousProgram: GeneratedProgram,
  nextProgram: GeneratedProgram,
  editContext: ProgramEditContext,
  resolveName: NameResolver,
): PlanChangeDiffLines {
  const oldBlocks = getDayBlocks(previousProgram, editContext.weekNumber, editContext.dayNumber);
  const newBlocks = getDayBlocks(nextProgram, editContext.weekNumber, editContext.dayNumber);

  if (!oldBlocks && !newBlocks) {
    return { linesEs: [], linesEn: [] };
  }
  if (!oldBlocks && newBlocks) {
    const count = newBlocks.length;
    return {
      linesEs: [`Día con ${count} ejercicio${count === 1 ? '' : 's'} nuevo${count === 1 ? '' : 's'}`],
      linesEn: [`Day with ${count} new exercise${count === 1 ? '' : 's'}`],
    };
  }
  if (oldBlocks && !newBlocks) {
    return {
      linesEs: ['Se vació el día de entrenamiento'],
      linesEn: ['Training day was cleared'],
    };
  }

  const before = oldBlocks!;
  const after = newBlocks!;
  const linesEs: string[] = [];
  const linesEn: string[] = [];
  const maxLen = Math.max(before.length, after.length);

  for (let i = 0; i < maxLen; i += 1) {
    const oldBlock = before[i];
    const newBlock = after[i];

    if (!oldBlock && newBlock) {
      const label = blockLabel(newBlock, resolveName);
      linesEs.push(`Añadió ${label}`);
      linesEn.push(`Added ${label}`);
      continue;
    }
    if (oldBlock && !newBlock) {
      const label = blockLabel(oldBlock, resolveName);
      linesEs.push(`Quitó ${label}`);
      linesEn.push(`Removed ${label}`);
      continue;
    }
    if (!oldBlock || !newBlock) continue;

    const oldKey = blockKey(oldBlock);
    const newKey = blockKey(newBlock);
    const oldLabel = blockLabel(oldBlock, resolveName);
    const newLabel = blockLabel(newBlock, resolveName);

    if (oldKey !== newKey) {
      linesEs.push(`Cambió ${oldLabel} por ${newLabel}`);
      linesEn.push(`Replaced ${oldLabel} with ${newLabel}`);
      continue;
    }

    const setChange = describeSetChange(newLabel, oldBlock.sets, newBlock.sets);
    if (setChange) {
      linesEs.push(setChange.es);
      linesEn.push(setChange.en);
    }
  }

  return { linesEs, linesEn };
}

/** Fusiona líneas de resumen evitando duplicados; prioriza las más recientes. */
export function mergePlanChangeSummaryLines(
  existing: string[],
  incoming: string[],
  maxLines = 6,
): string[] {
  const merged = [...incoming, ...existing];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of merged) {
    const key = line.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= maxLines) break;
  }
  return out;
}
