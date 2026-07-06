/**
 * Provision coach Ivan Solis + athlete login (or athlete only if coach exists).
 *
 * Usage:
 *   npx tsx scripts/provision-ivan-athlete.ts
 *   API_BASE=https://wolf-ai-test-v1-march-2026.netlify.app/api npx tsx scripts/provision-ivan-athlete.ts
 *
 * Env (optional):
 *   ADMIN_EMAIL=admin@wolf-ai.app
 *   ADMIN_PASSWORD=WolfAdmin_9jH3nM8vPq
 *   COACH_NAME=Ivan Solis
 *   COACH_USERNAME=ivan-solis
 *   COACH_PASSWORD=IvanCoachWL2026!
 *   ATHLETE_NAME=Atleta WL
 *   ATHLETE_USERNAME=ivan-atleta
 *   ATHLETE_PASSWORD=IvanWL2026!
 */
const API_BASE = (process.env.API_BASE ?? 'https://wolf-ai-test-v1-march-2026.netlify.app/api').replace(
  /\/+$/,
  '',
);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@wolf-ai.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'WolfAdmin_9jH3nM8vPq';

const COACH_NAME = process.env.COACH_NAME?.trim() || 'Ivan Solis';
const COACH_USERNAME = (process.env.COACH_USERNAME ?? 'ivan-solis').trim().toLowerCase();
const COACH_EMAIL = (process.env.COACH_EMAIL ?? `${COACH_USERNAME}@wolf-ai.temp`).trim().toLowerCase();
const COACH_PASSWORD = process.env.COACH_PASSWORD?.trim() || 'IvanCoachWL2026!';

const ATHLETE_NAME = process.env.ATHLETE_NAME?.trim() || 'Atleta WL';
const ATHLETE_USERNAME = (process.env.ATHLETE_USERNAME ?? 'ivan-atleta').trim().toLowerCase();
const ATHLETE_EMAIL = (process.env.ATHLETE_EMAIL ?? `${ATHLETE_USERNAME}@wolf-ai.temp`).trim().toLowerCase();
const ATHLETE_PASSWORD = process.env.ATHLETE_PASSWORD?.trim() || 'IvanWL2026!';

type WolfUser = {
  id: string;
  name: string;
  role: string;
  email: string;
  username?: string;
  coachId?: string;
  linkedAthleteId?: string;
};

type LoginResponse = { token: string; user: WolfUser };

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
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data as T;
}

function findCoach(users: WolfUser[]): WolfUser | undefined {
  return users.find(
    (u) =>
      u.role === 'coach' &&
      (u.name.toLowerCase() === COACH_NAME.toLowerCase() ||
        u.username?.toLowerCase() === COACH_USERNAME ||
        u.email.toLowerCase() === COACH_EMAIL),
  );
}

async function main() {
  console.log(`API: ${API_BASE}`);

  const { token } = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  const users = await api<WolfUser[]>('/users', {}, token);
  let coach = findCoach(users);

  if (!coach) {
    console.log(`Creating coach "${COACH_NAME}"…`);
    coach = await api<WolfUser>(
      '/users',
      {
        method: 'POST',
        body: JSON.stringify({
          name: COACH_NAME,
          email: COACH_EMAIL,
          username: COACH_USERNAME,
          password: COACH_PASSWORD,
          role: 'coach',
        }),
      },
      token,
    );
    console.log(`✓ Coach created: ${coach.id}`);
  } else {
    console.log(`✓ Coach found: ${coach.name} (${coach.id})`);
  }

  const existingAthlete = users.find(
    (u) =>
      u.role === 'athlete' &&
      (u.username?.toLowerCase() === ATHLETE_USERNAME || u.email.toLowerCase() === ATHLETE_EMAIL),
  );

  if (existingAthlete) {
    console.log('\nAthlete login already exists — updating password via PATCH if supported…');
    console.log(`  id: ${existingAthlete.id}`);
    console.log(`  username: ${existingAthlete.username ?? '—'}`);
    console.log(`  linkedAthleteId: ${existingAthlete.linkedAthleteId ?? '—'}`);
    console.log('\nIf you need a new password, reset manually in Postgres or delete and re-run.');
    return;
  }

  const profileId = `ath-${ATHLETE_USERNAME.replace(/[^a-z0-9]+/g, '-')}`;

  const athlete = await api<WolfUser>(
    '/users',
    {
      method: 'POST',
      body: JSON.stringify({
        name: ATHLETE_NAME,
        email: ATHLETE_EMAIL,
        username: ATHLETE_USERNAME,
        password: ATHLETE_PASSWORD,
        role: 'athlete',
        coachId: coach.id,
        linkedAthleteId: profileId,
        level: 'intermediate',
        bodyweight: 75,
        oneRM: { snatch: 60, cleanJerk: 80, backSquat: 100, frontSquat: 85 },
      }),
    },
    token,
  );

  console.log('\n--- Listo ---');
  console.log(`Coach:   ${COACH_NAME}`);
  console.log(`         usuario: ${COACH_USERNAME}  /  ${COACH_PASSWORD}`);
  console.log(`Atleta:  ${ATHLETE_NAME}`);
  console.log(`         usuario: ${ATHLETE_USERNAME}  /  ${ATHLETE_PASSWORD}`);
  console.log(`         perfil WL: ${athlete.linkedAthleteId}`);
  console.log(`         user id: ${athlete.id}`);
  console.log('\nEl coach verá al atleta en Atletas; el atleta entra en «Mi plan WL».');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
