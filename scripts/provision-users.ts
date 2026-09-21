/**
 * Provision production coach + athlete accounts in Postgres.
 *
 * Usage (usernames temporales — sin correo real aún):
 *   DATABASE_URL="postgresql://..." npm run db:provision-users
 *
 * Opcional:
 *   COACH_USERNAME=coach-wl COACH_PASSWORD='CoachWL2026!'
 *   ATHLETE_USERNAME=erik ATHLETE_PASSWORD='ErikWL2026!'
 *   HENDRYCK_USERNAME=hendryck HENDRYCK_PASSWORD='HendryckWL2026!'
 *   COACH_EMAIL=chiron.traine@gmail.com
 *   ATHLETE_EMAIL=erikjonathanmanzano@gmail.com
 */
import { Pool } from 'pg';
import { hashPassword } from '../src/utils/passwordCrypto';

const COACH_ID = 'user-coach-wl';
const ATHLETE_ID = 'user-erik';
const ATHLETE_PROFILE_ID = 'ath-erik';
const HENDRYCK_ID = 'user-hendryck';
const HENDRYCK_PROFILE_ID = 'ath-hendryck';

const DEFAULT_COACH_USERNAME = 'coach-wl';
const DEFAULT_ATHLETE_USERNAME = 'erik';
const DEFAULT_HENDRYCK_USERNAME = 'hendryck';
const DEFAULT_COACH_PASSWORD = 'CoachWL2026!';
const DEFAULT_ATHLETE_PASSWORD = 'ErikWL2026!';
const DEFAULT_HENDRYCK_PASSWORD = 'HendryckWL2026!';
const DEFAULT_COACH_EMAIL = 'chiron.traine@gmail.com';

function tempEmail(username: string): string {
  return `${username}@wolf-ai.temp`;
}

async function upsertUser(
  pool: Pool,
  row: {
    id: string;
    name: string;
    role: string;
    email: string;
    username: string;
    passwordHash: string;
    coachId?: string | null;
    linkedAthleteId?: string | null;
  },
): Promise<void> {
  await pool.query(
    `
    INSERT INTO users (id, name, role, email, username, password, coach_id, linked_athlete_id, verified, auth_provider)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, 'password')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      email = EXCLUDED.email,
      username = EXCLUDED.username,
      password = EXCLUDED.password,
      coach_id = EXCLUDED.coach_id,
      linked_athlete_id = EXCLUDED.linked_athlete_id,
      verified = TRUE,
      updated_at = now();
    `,
    [
      row.id,
      row.name,
      row.role,
      row.email,
      row.username,
      row.passwordHash,
      row.coachId ?? null,
      row.linkedAthleteId ?? null,
    ],
  );
}

async function upsertAthleteProfile(
  pool: Pool,
  row: {
    id: string;
    coachId: string;
    name: string;
    level: string;
    bodyweight: number;
    oneRm: Record<string, number>;
  },
): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wl_athlete_profiles (
      id TEXT PRIMARY KEY,
      coach_id TEXT NOT NULL,
      name TEXT NOT NULL,
      level TEXT NOT NULL,
      bodyweight DOUBLE PRECISION NOT NULL DEFAULT 80,
      one_rm JSONB NOT NULL DEFAULT '{}'::jsonb,
      fatigue_score DOUBLE PRECISION NOT NULL DEFAULT 40,
      readiness_score DOUBLE PRECISION NOT NULL DEFAULT 70,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    `
    INSERT INTO wl_athlete_profiles (
      id, coach_id, name, level, bodyweight, one_rm, fatigue_score, readiness_score
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, 35, 75)
    ON CONFLICT (id) DO UPDATE SET
      coach_id = EXCLUDED.coach_id,
      name = EXCLUDED.name,
      level = EXCLUDED.level,
      bodyweight = EXCLUDED.bodyweight,
      one_rm = EXCLUDED.one_rm,
      updated_at = now();
    `,
    [row.id, row.coachId, row.name, row.level, row.bodyweight, JSON.stringify(row.oneRm)],
  );
}

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const coachUsername = (process.env.COACH_USERNAME ?? DEFAULT_COACH_USERNAME).trim().toLowerCase();
  const athleteUsername = (process.env.ATHLETE_USERNAME ?? DEFAULT_ATHLETE_USERNAME).trim().toLowerCase();
  const hendryckUsername = (process.env.HENDRYCK_USERNAME ?? DEFAULT_HENDRYCK_USERNAME).trim().toLowerCase();
  const coachEmail = (process.env.COACH_EMAIL ?? DEFAULT_COACH_EMAIL).trim().toLowerCase();
  const athleteEmail = (process.env.ATHLETE_EMAIL ?? tempEmail(athleteUsername)).trim().toLowerCase();
  const hendryckEmail = (process.env.HENDRYCK_EMAIL ?? tempEmail(hendryckUsername)).trim().toLowerCase();
  const coachName = process.env.COACH_NAME?.trim() || 'Entrenador WL';
  const athleteName = process.env.ATHLETE_NAME?.trim() || 'Erik Manzano';
  const hendryckName = process.env.HENDRYCK_NAME?.trim() || 'Hendryck';
  const coachPassword = process.env.COACH_PASSWORD?.trim() || DEFAULT_COACH_PASSWORD;
  const athletePassword = process.env.ATHLETE_PASSWORD?.trim() || DEFAULT_ATHLETE_PASSWORD;
  const hendryckPassword = process.env.HENDRYCK_PASSWORD?.trim() || DEFAULT_HENDRYCK_PASSWORD;

  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL_DISABLE === '1' ? false : { rejectUnauthorized: false },
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL DEFAULT 'wolf2026',
        coach_id TEXT,
        linked_athlete_id TEXT
      );
    `);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;`);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx
      ON users (lower(username))
      WHERE username IS NOT NULL AND username <> '';
    `);

    const coachHash = hashPassword(coachPassword);
    const athleteHash = hashPassword(athletePassword);
    const hendryckHash = hashPassword(hendryckPassword);

    await upsertUser(pool, {
      id: COACH_ID,
      name: coachName,
      role: 'coach',
      email: coachEmail,
      username: coachUsername,
      passwordHash: coachHash,
    });

    await upsertUser(pool, {
      id: ATHLETE_ID,
      name: athleteName,
      role: 'athlete',
      email: athleteEmail,
      username: athleteUsername,
      passwordHash: athleteHash,
      coachId: COACH_ID,
      linkedAthleteId: ATHLETE_PROFILE_ID,
    });

    await upsertAthleteProfile(pool, {
      id: HENDRYCK_PROFILE_ID,
      coachId: COACH_ID,
      name: hendryckName,
      level: 'intermediate',
      bodyweight: 80,
      oneRm: { snatch: 80, cleanJerk: 100, backSquat: 140, frontSquat: 120 },
    });

    await upsertUser(pool, {
      id: HENDRYCK_ID,
      name: hendryckName,
      role: 'athlete',
      email: hendryckEmail,
      username: hendryckUsername,
      passwordHash: hendryckHash,
      coachId: COACH_ID,
      linkedAthleteId: HENDRYCK_PROFILE_ID,
    });

    console.log('\n--- Production users provisioned ---');
    console.log(`  Coach:    username "${coachUsername}"  (id: ${COACH_ID})`);
    console.log(`  Athlete:  username "${athleteUsername}"  (id: ${ATHLETE_ID}, profile: ${ATHLETE_PROFILE_ID})`);
    console.log(`  Hendryck: username "${hendryckUsername}"  (id: ${HENDRYCK_ID}, profile: ${HENDRYCK_PROFILE_ID})`);
    console.log('\n--- Login (usuario + contraseña) ---');
    console.log(`  Entrenador:  ${coachUsername} / ${coachPassword}`);
    console.log(`  Erik:        ${athleteUsername} / ${athletePassword}`);
    console.log(`  Hendryck:    ${hendryckUsername} / ${hendryckPassword}`);
    console.log('\nEmails de login:');
    console.log(`  Coach email:    ${coachEmail}`);
    console.log(`  Athlete email:  ${athleteEmail}`);
    console.log(`  Hendryck email: ${hendryckEmail}`);
    console.log('\nSet WOLF_SYNC_SEED_PASSWORDS=0 on Railway so redeploys do not overwrite these passwords.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
