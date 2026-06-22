/**
 * Smoke test: production coach-wl ↔ erik interaction via Netlify proxy.
 *
 * Usage:
 *   npx tsx scripts/smoke-prd-coach-erik.ts
 *   API_BASE=https://wolf-ai-api.onrender.com npx tsx scripts/smoke-prd-coach-erik.ts
 */
const API_BASE = (process.env.API_BASE ?? 'https://wolf-ai-test-v1-march-2026.netlify.app/api').replace(/\/+$/, '');

const COACH_LOGIN = { email: 'coach-wl', password: 'CoachWL2026!' };
const ATHLETE_LOGIN = { email: 'erik', password: 'ErikWL2026!' };

type LoginResponse = {
  user: { id: string; role: string; linkedAthleteId?: string; coachId?: string };
  token: string;
};

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

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
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data as T;
}

async function login(creds: { email: string; password: string }): Promise<LoginResponse> {
  return api<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(creds) });
}

async function main() {
  console.log(`\n=== PRD smoke: coach-wl ↔ erik ===`);
  console.log(`API: ${API_BASE}\n`);

  const health = await api<{ ok: boolean; persistence: string; exerciseCatalog?: { officialDefinitions: number } }>('/health');
  assert(health.ok === true, 'health ok');
  assert(health.persistence === 'postgres', `expected postgres, got ${health.persistence}`);
  assert((health.exerciseCatalog?.officialDefinitions ?? 0) > 0, 'exercise catalog empty');
  console.log(`✓ health: persistence=${health.persistence}, catalog=${health.exerciseCatalog?.officialDefinitions}`);

  const coach = await login(COACH_LOGIN);
  assert(coach.user.role === 'coach', `coach role expected, got ${coach.user.role}`);
  console.log(`✓ coach login: ${coach.user.id}`);

  const athlete = await login(ATHLETE_LOGIN);
  assert(athlete.user.role === 'athlete', `athlete role expected, got ${athlete.user.role}`);
  assert(athlete.user.coachId === coach.user.id, `athlete coachId ${athlete.user.coachId} !== coach ${coach.user.id}`);
  console.log(`✓ athlete login: ${athlete.user.id} → linked ${athlete.user.linkedAthleteId ?? '(none)'}`);

  const roster = await api<Array<{ id: string; name: string }>>('/wl-athletes', {}, coach.token);
  const erikProfile =
    roster.find((a) => a.id === athlete.user.linkedAthleteId) ??
    roster.find((a) => /erik/i.test(a.name));
  assert(Boolean(erikProfile), `No Erik profile in coach roster: ${JSON.stringify(roster.map((a) => a.id))}`);
  const athleteProfileId = erikProfile!.id;
  if (athlete.user.linkedAthleteId !== athleteProfileId) {
    console.log(
      `⚠ linkedAthleteId (${athlete.user.linkedAthleteId}) ≠ roster (${athleteProfileId}) — API reconcile should fix on login after deploy`,
    );
  }
  console.log(`✓ coach roster includes ${erikProfile!.name} (${athleteProfileId})`);

  const programName = `PRD smoke ${new Date().toISOString().slice(0, 16)}`;
  const minimalProgram = {
    id: `prog-smoke-${Date.now()}`,
    name: programName,
    athleteId: '__template__',
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
            label: 'Smoke day 1',
            session: {
              id: 'session-smoke-1',
              athleteId: athleteProfileId,
              exercises: [{ exerciseId: 'ex-001', sets: [{ reps: 3, sets: 3, percentage: 75 }] }],
              totalReps: 9,
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

  const createdProgram = await api<{ id: string; name: string }>(
    '/coach-programs',
    { method: 'POST', body: JSON.stringify({ name: programName, program: minimalProgram, status: 'draft' }) },
    coach.token,
  );
  console.log(`✓ coach program created: ${createdProgram.id}`);

  const assigned = await api<Array<{ id: string; athleteProfileId: string; program: { name: string } }>>(
    `/coach-programs/${createdProgram.id}/assign`,
    { method: 'POST', body: JSON.stringify({ athleteProfileIds: [athleteProfileId] }) },
    coach.token,
  );
  assert(assigned.length === 1, `expected 1 assignment, got ${assigned.length}`);
  assert(assigned[0]!.athleteProfileId === athleteProfileId, 'assignment athleteProfileId mismatch');
  const assignmentId = assigned[0]!.id;
  console.log(`✓ assigned to Erik: ${assignmentId}`);

  const athleteAssignments = await api<Array<{ id: string; athleteProfileId: string; program: { name: string } }>>(
    '/assignments',
    {},
    athlete.token,
  );
  const athletePlan = athleteAssignments.find((a) => a.id === assignmentId);
  assert(Boolean(athletePlan), `athlete does not see assignment ${assignmentId} (linked=${athlete.user.linkedAthleteId}, roster=${athleteProfileId})`);
  assert(athletePlan!.program.name.includes('PRD smoke') || athletePlan!.program.name === programName, 'program name mismatch');
  console.log(`✓ athlete sees assignment: "${athletePlan!.program.name}"`);

  const toggle = await api<{ active: boolean }>(
    '/completions/toggle',
    {
      method: 'POST',
      body: JSON.stringify({ assignmentId, weekNumber: 1, dayNumber: 1, exerciseIndex: 0 }),
    },
    athlete.token,
  );
  assert(toggle.active === true, 'completion toggle should be active');
  console.log(`✓ athlete marked exercise complete (week 1 day 1)`);

  const coachCompletions = await api<Array<{ assignmentId: string; weekNumber: number; dayNumber: number }>>(
    `/completions?assignmentId=${assignmentId}`,
    {},
    coach.token,
  );
  const done = coachCompletions.some(
    (c) => c.assignmentId === assignmentId && c.weekNumber === 1 && c.dayNumber === 1,
  );
  assert(done, 'coach does not see athlete completion');
  console.log(`✓ coach sees completion for assignment ${assignmentId}`);

  console.log('\n=== PRD smoke PASSED ===\n');
}

main().catch((err) => {
  console.error('\n=== PRD smoke FAILED ===');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
