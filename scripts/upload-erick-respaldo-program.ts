/**
 * Upload "Erick Respaldo" — 3-week × 4-day mesocycle from coach screenshot.
 *
 * Usage:
 *   npx tsx scripts/upload-erick-respaldo-program.ts
 *   ASSIGN=0 PUBLISH=0 npx tsx scripts/upload-erick-respaldo-program.ts
 *
 * Env:
 *   API_BASE — default Netlify PRD proxy
 *   COACH_LOGIN / COACH_PASSWORD — default coach-wl
 *   ASSIGN=1 — assign to Erik after create (default)
 *   PUBLISH=1 — set status published (default)
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Athlete, Exercise, GeneratedProgram } from '../src/models/training';
import { TEMPLATE_PROGRAM_ATHLETE_ID } from '../src/models/coach-architecture';
import { buildSessionFromBlocks } from '../src/services/sessionGenerator';
import { mergeExerciseCatalog, normalizeExercise } from '../src/utils/exerciseCatalog';
import { buildProgramDraft } from '../src/utils/programSchedule';
import { mockExercises } from '../src/data/loadMockData';
import { ERICK_RESPALDO_WEEKS, EX } from './data/erick-respaldo-program';

const API_BASE = (process.env.API_BASE ?? 'https://wolf-ai-test-v1-march-2026.netlify.app/api').replace(
  /\/+$/,
  '',
);
const COACH_LOGIN = process.env.COACH_LOGIN ?? 'coach-wl';
const COACH_PASSWORD = process.env.COACH_PASSWORD ?? 'CoachWL2026!';
const PROGRAM_NAME = process.env.PROGRAM_NAME?.trim() || 'Erick Respaldo';
const SHOULD_ASSIGN = (process.env.ASSIGN ?? '1') !== '0';
const SHOULD_PUBLISH = (process.env.PUBLISH ?? '1') !== '0';

const TEMPLATE_ATHLETE: Athlete = {
  id: TEMPLATE_PROGRAM_ATHLETE_ID,
  name: 'Template',
  level: 'intermediate',
  bodyweight: 80,
  oneRM: { snatch: 100, cleanJerk: 130, backSquat: 160, frontSquat: 140 },
  fatigueScore: 20,
  readinessScore: 80,
};

type LoginResponse = { token: string; user: { id: string; role: string } };
type CoachProgram = { id: string; name: string; status: string; program: GeneratedProgram };

async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${text.slice(0, 240)}`);
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data as T;
}

function loadLocalCatalog(): Exercise[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const bulgarianPath = join(here, '../src/data/exercises-bulgarian-catalog.json');
  const bulgarian = JSON.parse(readFileSync(bulgarianPath, 'utf8')) as Exercise[];
  return mergeExerciseCatalog(
    [...mockExercises, ...bulgarian].map((e) => normalizeExercise({ ...e } as Record<string, unknown>)),
    [],
  );
}

function collectExerciseIds(): string[] {
  const ids = new Set<string>(Object.values(EX));
  for (const week of ERICK_RESPALDO_WEEKS) {
    for (const day of week) {
      for (const block of day.blocks) {
        ids.add(block.exerciseId);
        for (const seg of block.segments ?? []) ids.add(seg.exerciseId);
      }
    }
  }
  return [...ids];
}

function assertCatalog(catalog: Exercise[]): void {
  const byId = new Map(catalog.map((e) => [e.id, e.name]));
  const missing = collectExerciseIds().filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new Error(`Missing exercises in catalog: ${missing.join(', ')}`);
  }
}

function buildProgram(catalog: Exercise[]): GeneratedProgram {
  const startDate = new Date().toISOString().slice(0, 10);
  const base = buildProgramDraft({
    name: PROGRAM_NAME,
    startDate,
    totalWeeks: 3,
    daysPerWeek: 4,
    primaryGoal: 'strength',
  });

  const weeks = ERICK_RESPALDO_WEEKS.map((days, weekIndex) => ({
    weekNumber: weekIndex + 1,
    days: days.map((day, dayIndex) => ({
      dayNumber: dayIndex + 1,
      label: day.label,
      session: buildSessionFromBlocks(
        TEMPLATE_PROGRAM_ATHLETE_ID,
        day.blocks,
        TEMPLATE_ATHLETE,
        catalog,
      ),
    })),
  }));

  return { ...base, name: PROGRAM_NAME, weeks };
}

async function findErikProfileId(token: string): Promise<string> {
  const roster = await api<Array<{ id: string; name: string }>>('/wl-athletes', {}, token);
  const erik = roster.find((row) => /erik/i.test(row.name));
  if (!erik) throw new Error(`Erik not found in roster: ${roster.map((r) => r.name).join(', ')}`);
  return erik.id;
}

async function main() {
  console.log(`\n=== Upload "${PROGRAM_NAME}" to PRD ===`);
  console.log(`API: ${API_BASE}`);

  const catalog = loadLocalCatalog();
  assertCatalog(catalog);
  const program = buildProgram(catalog);
  const totalDays = program.weeks.reduce((sum, w) => sum + w.days.length, 0);
  const totalBlocks = program.weeks.reduce(
    (sum, w) => sum + w.days.reduce((dSum, d) => dSum + d.session.exercises.length, 0),
    0,
  );
  console.log(`Program: ${program.totalWeeks} weeks, ${totalDays} days, ${totalBlocks} exercise blocks`);

  const coach = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: COACH_LOGIN, password: COACH_PASSWORD }),
  });
  console.log(`✓ coach login: ${coach.user.id}`);

  const existing = await api<CoachProgram[]>('/coach-programs', {}, coach.token);
  const duplicate = existing.find((p) => p.name === PROGRAM_NAME);
  if (duplicate) {
    console.log(`⚠ Program "${PROGRAM_NAME}" already exists (${duplicate.id}, status=${duplicate.status})`);
    console.log('  Skipping create. Set PROGRAM_NAME to upload another copy.');
    return;
  }

  const created = await api<CoachProgram>(
    '/coach-programs',
    {
      method: 'POST',
      body: JSON.stringify({
        name: PROGRAM_NAME,
        program,
        status: SHOULD_PUBLISH ? 'published' : 'draft',
      }),
    },
    coach.token,
  );
  console.log(`✓ created coach program: ${created.id} (${created.status})`);

  if (SHOULD_ASSIGN) {
    const athleteProfileId = await findErikProfileId(coach.token);
    const assigned = await api<Array<{ id: string; athleteProfileId: string }>>(
      `/coach-programs/${created.id}/assign`,
      { method: 'POST', body: JSON.stringify({ athleteProfileIds: [athleteProfileId] }) },
      coach.token,
    );
    console.log(`✓ assigned to Erik: ${assigned[0]?.id ?? '(none)'}`);
  }

  console.log('\n=== Done ===\n');
}

main().catch((err) => {
  console.error('\n=== Upload FAILED ===');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
