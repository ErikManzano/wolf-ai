import type { GeneratedProgram } from '../models/training';

const DRAFT_KEY = 'wolf_program_edit_draft_v1';
const BACKUPS_KEY = 'wolf_program_edit_backups_v1';
const MAX_BACKUPS = 6;

export interface ProgramEditDraft {
  program: GeneratedProgram;
  athleteId: string;
  selectedWeek: number;
  selectedDay: number;
  assignmentId: string | null;
  savedAt: string;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function pushBackup(draft: ProgramEditDraft): void {
  try {
    const list = safeParse<ProgramEditDraft[]>(localStorage.getItem(BACKUPS_KEY)) ?? [];
    const next = [draft, ...list.filter((b) => b.savedAt !== draft.savedAt)].slice(0, MAX_BACKUPS);
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function saveProgramEditDraft(draft: ProgramEditDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    pushBackup(draft);
  } catch {
    /* ignore */
  }
}

export function readProgramEditDraft(): ProgramEditDraft | null {
  const draft = safeParse<ProgramEditDraft>(localStorage.getItem(DRAFT_KEY));
  if (!draft?.program?.weeks?.length) return null;
  return draft;
}

export function readProgramEditBackups(): ProgramEditDraft[] {
  return safeParse<ProgramEditDraft[]>(localStorage.getItem(BACKUPS_KEY)) ?? [];
}

export function clearProgramEditDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
