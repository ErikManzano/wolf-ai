import type { CoachProgram, CoachProgramRow } from '../../models/coach-architecture';
import { TEMPLATE_PROGRAM_ATHLETE_ID } from '../../models/coach-architecture';

const STORAGE_KEY = 'wolf_coach_programs_v1';

function emptyProgram(name: string): CoachProgram['program'] {
  return {
    id: `prog-${Date.now()}`,
    name,
    athleteId: TEMPLATE_PROGRAM_ATHLETE_ID,
    createdAt: new Date().toISOString(),
    totalWeeks: 4,
    daysPerWeek: 3,
    primaryGoal: 'strength',
    weeks: [],
  };
}

function readAll(): CoachProgram[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CoachProgram[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistAll(list: CoachProgram[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function loadCoachProgramsLocal(coachId: string): CoachProgramRow[] {
  return readAll()
    .filter((p) => p.coachId === coachId && p.status !== 'archived')
    .map((p) => ({ ...p, enrolledAthletes: [] }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function upsertCoachProgramLocal(program: CoachProgram): CoachProgram[] {
  const next = readAll().filter((p) => p.id !== program.id);
  next.push(program);
  persistAll(next);
  return next.filter((p) => p.coachId === program.coachId);
}

export function removeCoachProgramLocal(coachId: string, id: string): CoachProgram[] {
  persistAll(readAll().filter((p) => !(p.id === id && p.coachId === coachId)));
  return readAll().filter((p) => p.coachId === coachId);
}

export function createCoachProgramLocal(coachId: string, name: string): CoachProgram {
  const now = new Date().toISOString();
  return {
    id: `cpr-${Date.now()}`,
    coachId,
    name: name.trim(),
    program: emptyProgram(name.trim()),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}
