/**
 * Smoke: complex block segmentReps round-trip coach PATCH → athlete assignment.
 *
 * Usage:
 *   npx tsx scripts/smoke-prd-complex-sync.ts
 */
const API_BASE = (process.env.API_BASE ?? 'https://wolf-ai-test-v1-march-2026.netlify.app/api').replace(/\/+$/, '');

const COACH_LOGIN = { email: 'coach-wl', password: 'CoachWL2026!' };
const ATHLETE_LOGIN = { email: 'erik', password: 'ErikWL2026!' };

type LoginResponse = { token: string };

type CoachProgram = {
  id: string;
  program: {
    weeks: Array<{
      days: Array<{
        session: {
          exercises: Array<{
            sets: Array<{
              percentage: number;
              reps: number;
              sets: number;
              segmentReps?: string[];
              restSec?: number;
            }>;
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

async function main() {
  console.log(`\n=== PRD smoke: complex segmentReps sync ===`);
  console.log(`API: ${API_BASE}\n`);

  const coach = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(COACH_LOGIN),
  });

  const roster = await api<Array<{ id: string; name: string }>>('/wl-athletes', {}, coach.token);
  const erik = roster.find((row) => /erik/i.test(row.name));
  assert(Boolean(erik), 'Erik not found in roster');

  const program = {
    id: `prog-complex-smoke-${Date.now()}`,
    name: 'Complex sync smoke',
    athleteId: erik!.id,
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
            label: 'Complex day',
            session: {
              id: 'session-complex-smoke',
              athleteId: erik!.id,
              exercises: [
                {
                  exerciseId: 'ex-001',
                  blockType: 'complex',
                  segments: [{ exerciseId: 'ex-001' }, { exerciseId: 'ex-022' }],
                  sets: [{ percentage: 84, reps: 3, sets: 3, segmentReps: ['2', '1'], restSec: 150 }],
                },
              ],
              totalReps: 9,
              avgRelativeIntensity: 84,
              avgAbsoluteIntensity: 0,
              load: 0,
              kValue: 84,
            },
          },
        ],
      },
    ],
  };

  const created = await api<CoachProgram>(
    '/coach-programs',
    {
      method: 'POST',
      body: JSON.stringify({ name: `Complex sync ${new Date().toISOString().slice(0, 16)}`, program }),
    },
    coach.token,
  );
  console.log(`✓ program created: ${created.id}`);

  const assigned = await api<Assignment[]>(
    `/coach-programs/${created.id}/assign`,
    { method: 'POST', body: JSON.stringify({ athleteProfileIds: [erik!.id] }) },
    coach.token,
  );
  assert(assigned.length === 1, 'expected one assignment');
  const assignmentId = assigned[0]!.id;
  console.log(`✓ assigned: ${assignmentId}`);

  const block = program.weeks[0]!.days[0]!.session.exercises[0]!;
  block.sets = [{ percentage: 80, reps: 3, sets: 2, segmentReps: ['1', '2'], restSec: 120 }];

  const saved = await api<CoachProgram>(
    `/coach-programs/${created.id}`,
    { method: 'PATCH', body: JSON.stringify({ program }) },
    coach.token,
  );

  const coachScheme = saved.program.weeks[0]!.days[0]!.session.exercises[0]!.sets[0]!;
  assert(coachScheme.percentage === 80, `coach pct ${coachScheme.percentage}`);
  assert(coachScheme.sets === 2, `coach sets ${coachScheme.sets}`);
  assert(JSON.stringify(coachScheme.segmentReps) === JSON.stringify(['1', '2']), 'coach segmentReps');
  console.log(`✓ coach PATCH: segmentReps=${JSON.stringify(coachScheme.segmentReps)}, reps=${coachScheme.reps}`);

  const athlete = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(ATHLETE_LOGIN),
  });
  const athleteAssignments = await api<Assignment[]>('/assignments', {}, athlete.token);
  const athleteView = athleteAssignments.find((row) => row.id === assignmentId);
  assert(Boolean(athleteView), 'assignment not visible to athlete');

  const athleteScheme = athleteView!.program.weeks[0]!.days[0]!.session.exercises[0]!.sets[0]!;
  assert(athleteScheme.percentage === 80, `athlete pct ${athleteScheme.percentage}`);
  assert(athleteScheme.sets === 2, `athlete sets ${athleteScheme.sets}`);
  assert(JSON.stringify(athleteScheme.segmentReps) === JSON.stringify(['1', '2']), 'athlete segmentReps');
  console.log(`✓ athlete synced: segmentReps=${JSON.stringify(athleteScheme.segmentReps)}, reps=${athleteScheme.reps}`);

  console.log('\n=== PRD complex sync smoke PASSED ===\n');
}

main().catch((err) => {
  console.error('\n=== PRD complex sync smoke FAILED ===');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
