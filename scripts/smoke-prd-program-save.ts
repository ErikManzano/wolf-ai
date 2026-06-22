/**
 * Smoke: autosave PATCH on enrolled program (series registration path).
 *
 * Usage:
 *   npx tsx scripts/smoke-prd-program-save.ts
 *   API_BASE=https://wolf-ai-api.onrender.com npx tsx scripts/smoke-prd-program-save.ts
 */
const API_BASE = (process.env.API_BASE ?? 'https://wolf-ai-test-v1-march-2026.netlify.app/api').replace(/\/+$/, '');

const COACH_LOGIN = { email: 'coach-wl', password: 'CoachWL2026!' };

type LoginResponse = {
  user: { id: string; role: string };
  token: string;
};

type CoachProgram = {
  id: string;
  name: string;
  program: {
    weeks: Array<{
      days: Array<{
        session: {
          exercises: Array<{
            exerciseId: string;
            blockType?: string;
            segments?: Array<{ exerciseId: string }>;
            sets: Array<{ percentage: number; reps: number; sets: number; restSec?: number }>;
          }>;
        };
      }>;
    }>;
  };
};

type Assignment = {
  id: string;
  program: CoachProgram['program'];
};

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<{ status: number; data: T }> {
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
  return { status: res.status, data: data as T };
}

function buildProgram(athleteProfileId: string, setCount: number) {
  const sets = Array.from({ length: setCount }, (_, index) => ({
    percentage: 80 - index * 2,
    reps: 2,
    sets: 1,
    restSec: 150,
  }));
  return {
    id: `prog-save-smoke-${Date.now()}`,
    name: 'PRD save smoke',
    athleteId: athleteProfileId,
    createdAt: new Date().toISOString(),
    totalWeeks: 1,
    daysPerWeek: 1,
    primaryGoal: 'strength' as const,
    weeks: [
      {
        weekNumber: 1,
        days: [
          {
            dayNumber: 1,
            label: 'Save smoke day',
            session: {
              id: 'session-save-smoke',
              athleteId: athleteProfileId,
              exercises: [
                {
                  exerciseId: 'ex-001',
                  blockType: 'complex',
                  segments: [{ exerciseId: 'ex-001' }, { exerciseId: 'ex-022' }],
                  sets,
                },
              ],
              totalReps: sets.reduce((sum, row) => sum + row.reps, 0),
              avgRelativeIntensity: 75,
              avgAbsoluteIntensity: 0,
              load: 0,
              kValue: 75,
            },
          },
        ],
      },
    ],
  };
}

async function main() {
  console.log(`\n=== PRD smoke: program save (series) ===`);
  console.log(`API: ${API_BASE}\n`);

  const coach = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(COACH_LOGIN),
  });
  const token = coach.data.token;

  const roster = await api<Array<{ id: string; name: string }>>('/wl-athletes', {}, token);
  const erik = roster.data.find((row) => /erik/i.test(row.name));
  assert(Boolean(erik), 'Erik not found in roster');
  const athleteProfileId = erik!.id;

  const programName = `PRD save smoke ${new Date().toISOString().slice(0, 16)}`;
  const created = await api<CoachProgram>(
    '/coach-programs',
    {
      method: 'POST',
      body: JSON.stringify({ name: programName, program: buildProgram(athleteProfileId, 1) }),
    },
    token,
  );
  console.log(`✓ program created: ${created.data.id}`);

  const assigned = await api<Assignment[]>(
    `/coach-programs/${created.data.id}/assign`,
    { method: 'POST', body: JSON.stringify({ athleteProfileIds: [athleteProfileId] }) },
    token,
  );
  assert(assigned.data.length === 1, 'expected one assignment');
  const assignmentId = assigned.data[0]!.id;
  console.log(`✓ assigned to ${erik!.name}: ${assignmentId}`);

  let currentProgram = created.data.program;
  const patchRounds = 5;
  for (let round = 1; round <= patchRounds; round += 1) {
    const block = currentProgram.weeks[0]!.days[0]!.session.exercises[0]!;
    const last = block.sets[block.sets.length - 1] ?? { percentage: 75, reps: 2, sets: 1, restSec: 150 };
    block.sets = [
      ...block.sets,
      {
        percentage: last.percentage,
        reps: last.reps,
        sets: 1,
        restSec: last.restSec ?? 150,
      },
    ];
    const started = Date.now();
    const saved = await api<CoachProgram>(
      `/coach-programs/${created.data.id}`,
      { method: 'PATCH', body: JSON.stringify({ program: currentProgram }) },
      token,
    );
    const elapsed = Date.now() - started;
    currentProgram = saved.data.program;
    const setCount = currentProgram.weeks[0]!.days[0]!.session.exercises[0]!.sets.length;
    console.log(`✓ PATCH round ${round}: ${setCount} sets (${elapsed}ms)`);
    assert(setCount === round + 1, `expected ${round + 1} sets after round ${round}`);
  }

  const athleteAssignments = await api<Assignment[]>('/assignments', {}, token);
  const athleteView = athleteAssignments.data.find((row) => row.id === assignmentId);
  assert(Boolean(athleteView), 'assignment not visible to athlete');
  const athleteSets = athleteView!.program.weeks[0]!.days[0]!.session.exercises[0]!.sets.length;
  assert(athleteSets === patchRounds + 1, `athlete assignment has ${athleteSets} sets, expected ${patchRounds + 1}`);
  console.log(`✓ athlete assignment synced: ${athleteSets} sets`);

  console.log('\n=== PRD program save smoke PASSED ===\n');
}

main().catch((err) => {
  console.error('\n=== PRD program save smoke FAILED ===');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
