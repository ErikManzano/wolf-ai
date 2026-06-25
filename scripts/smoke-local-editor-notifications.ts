/**
 * Smoke: local API — coach program save + plan-change notifications for athlete.
 *
 * Usage:
 *   npx tsx scripts/smoke-local-editor-notifications.ts
 *   API_BASE=http://localhost:4000 npx tsx scripts/smoke-local-editor-notifications.ts
 */
const API_BASE = (process.env.API_BASE ?? 'http://localhost:4000').replace(/\/+$/, '');

const COACH_LOGIN = { email: 'coach-wl', password: 'CoachWL2026!' };
const ATHLETE_LOGIN = { email: 'erik', password: 'ErikWL2026!' };

type LoginResponse = {
  user: { id: string; role: string; linkedAthleteId?: string };
  token: string;
};

type CoachProgram = {
  id: string;
  name: string;
  program: {
    weeks: Array<{
      days: Array<{
        dayNumber: number;
        label: string;
        session: {
          exercises: Array<{
            exerciseId: string;
            sets: Array<{ percentage: number; reps: number; sets: number; restSec?: number }>;
          }>;
        };
      }>;
    }>;
  };
};

type Assignment = { id: string; athleteProfileId: string; program: CoachProgram['program'] };

type PlanChangeNotification = {
  id: string;
  recipientUserId: string;
  readAt: string | null;
  weekNumber: number;
  dayNumber: number;
  messageEs: string;
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

async function login(creds: { email: string; password: string }): Promise<LoginResponse> {
  return api<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(creds) });
}

function buildProgram(athleteProfileId: string, setCount: number) {
  const sets = Array.from({ length: setCount }, () => ({
    percentage: 70,
    reps: 3,
    sets: 3,
    restSec: 150,
  }));
  return {
    id: `prog-local-smoke-${Date.now()}`,
    name: 'Local editor smoke',
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
            label: 'Día 1',
            session: {
              id: 'session-local-smoke',
              athleteId: athleteProfileId,
              exercises: [{ exerciseId: 'ex-001', sets }],
              totalReps: sets.reduce((s, r) => s + r.reps * r.sets, 0),
              avgRelativeIntensity: 70,
              avgAbsoluteIntensity: 0,
              load: 0,
              kValue: 70,
            },
          },
        ],
      },
    ],
  };
}

async function main() {
  console.log(`\n=== Local smoke: editor + notifications ===`);
  console.log(`API: ${API_BASE}\n`);

  const health = await api<{ ok: boolean; persistence: string }>('/health');
  assert(health.ok === true, 'health not ok');
  console.log(`✓ health: persistence=${health.persistence}`);

  const coach = await login(COACH_LOGIN);
  const athlete = await login(ATHLETE_LOGIN);
  console.log(`✓ coach ${coach.user.id}, athlete ${athlete.user.id}`);

  const roster = await api<Array<{ id: string; name: string }>>('/wl-athletes', {}, coach.token);
  const erik =
    roster.find((a) => a.id === athlete.user.linkedAthleteId) ?? roster.find((a) => /erik/i.test(a.name));
  assert(Boolean(erik), 'Erik not in roster');
  const athleteProfileId = erik!.id;

  const programName = `Local editor smoke ${Date.now()}`;
  const created = await api<CoachProgram>(
    '/coach-programs',
    { method: 'POST', body: JSON.stringify({ name: programName, program: buildProgram(athleteProfileId, 2) }) },
    coach.token,
  );
  console.log(`✓ program created: ${created.id}`);

  const assigned = await api<Assignment[]>(
    `/coach-programs/${created.id}/assign`,
    { method: 'POST', body: JSON.stringify({ athleteProfileIds: [athleteProfileId] }) },
    coach.token,
  );
  assert(assigned.length === 1, 'expected one assignment');
  const assignmentId = assigned[0]!.id;
  console.log(`✓ assigned: ${assignmentId}`);

  const athleteBefore = await api<Assignment[]>('/assignments', {}, athlete.token);
  assert(athleteBefore.some((a) => a.id === assignmentId), 'athlete missing assignment before save');
  console.log(`✓ athlete sees assignment (${athleteBefore.length} total)`);

  let program = created.program;
  const block = program.weeks[0]!.days[0]!.session.exercises[0]!;
  block.sets = [
    ...block.sets,
    { percentage: 75, reps: 2, sets: 3, restSec: 180 },
  ];

  const editContext = { weekNumber: 1, dayNumber: 1, dayLabel: 'Día 1' };
  const saved = await api<CoachProgram>(
    `/coach-programs/${created.id}`,
    { method: 'PATCH', body: JSON.stringify({ program, editContext }) },
    coach.token,
  );
  const setCount = saved.program.weeks[0]!.days[0]!.session.exercises[0]!.sets.length;
  assert(setCount === 3, `expected 3 sets after PATCH, got ${setCount}`);
  console.log(`✓ coach PATCH with editContext: ${setCount} sets`);

  const athleteAfter = await api<Assignment[]>('/assignments', {}, athlete.token);
  const synced = athleteAfter.find((a) => a.id === assignmentId);
  assert(Boolean(synced), 'athlete assignment missing after save');
  const athleteSets = synced!.program.weeks[0]!.days[0]!.session.exercises[0]!.sets.length;
  assert(athleteSets === 3, `athlete sync expected 3 sets, got ${athleteSets}`);
  console.log(`✓ athlete assignment synced: ${athleteSets} sets`);

  const notifications = await api<PlanChangeNotification[]>('/notifications', {}, athlete.token);
  const fresh = notifications.filter(
    (n) => n.weekNumber === 1 && n.dayNumber === 1 && n.recipientUserId === athlete.user.id,
  );
  assert(fresh.length >= 1, `expected plan-change notification, got ${notifications.length} total`);
  console.log(`✓ athlete notification: "${fresh[0]!.messageEs.slice(0, 80)}…"`);

  const marked = await api<PlanChangeNotification>(
    `/notifications/${fresh[0]!.id}/read`,
    { method: 'PATCH' },
    athlete.token,
  );
  assert(Boolean(marked.readAt), 'notification not marked read');
  console.log(`✓ mark notification read: ${marked.readAt}`);

  console.log('\n=== Local editor + notifications PASSED ===\n');
}

main().catch((err) => {
  console.error('\n=== Local editor + notifications FAILED ===');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
