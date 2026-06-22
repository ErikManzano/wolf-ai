/**
 * Provision production coach + athlete accounts in Postgres.
 *
 * Usage (usernames temporales — sin correo real aún):
 *   DATABASE_URL="postgresql://..." npm run db:provision-users
 *
 * Opcional:
 *   COACH_USERNAME=coach-wl COACH_PASSWORD='CoachWL2026!'
 *   ATHLETE_USERNAME=erik ATHLETE_PASSWORD='ErikWL2026!'
 *   COACH_EMAIL=chiron.traine@gmail.com
 *   ATHLETE_EMAIL=erikjonathanmanzano@gmail.com
 */
import { Pool } from 'pg';
import { hashPassword } from '../src/utils/passwordCrypto';

const COACH_ID = 'user-coach-wl';
const ATHLETE_ID = 'user-erik';
const ATHLETE_PROFILE_ID = 'ath-erik';

const DEFAULT_COACH_USERNAME = 'coach-wl';
const DEFAULT_ATHLETE_USERNAME = 'erik';
const DEFAULT_COACH_PASSWORD = 'CoachWL2026!';
const DEFAULT_ATHLETE_PASSWORD = 'ErikWL2026!';
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

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const coachUsername = (process.env.COACH_USERNAME ?? DEFAULT_COACH_USERNAME).trim().toLowerCase();
  const athleteUsername = (process.env.ATHLETE_USERNAME ?? DEFAULT_ATHLETE_USERNAME).trim().toLowerCase();
  const coachEmail = (process.env.COACH_EMAIL ?? DEFAULT_COACH_EMAIL).trim().toLowerCase();
  const athleteEmail = (process.env.ATHLETE_EMAIL ?? tempEmail(athleteUsername)).trim().toLowerCase();
  const coachName = process.env.COACH_NAME?.trim() || 'Entrenador WL';
  const athleteName = process.env.ATHLETE_NAME?.trim() || 'Erik Manzano';
  const coachPassword = process.env.COACH_PASSWORD?.trim() || DEFAULT_COACH_PASSWORD;
  const athletePassword = process.env.ATHLETE_PASSWORD?.trim() || DEFAULT_ATHLETE_PASSWORD;

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

    console.log('\n--- Production users provisioned ---');
    console.log(`  Coach:   username "${coachUsername}"  (id: ${COACH_ID})`);
    console.log(`  Athlete: username "${athleteUsername}"  (id: ${ATHLETE_ID}, profile: ${ATHLETE_PROFILE_ID})`);
    console.log('\n--- Login (usuario + contraseña) ---');
    console.log(`  Entrenador:  ${coachUsername} / ${coachPassword}`);
    console.log(`  Erik:        ${athleteUsername} / ${athletePassword}`);
    console.log('\nEmails de login:');
    console.log(`  Coach email:   ${coachEmail}`);
    console.log(`  Athlete email: ${athleteEmail}`);
    console.log('\nSet WOLF_SYNC_SEED_PASSWORDS=0 on Render so redeploys do not overwrite these passwords.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
