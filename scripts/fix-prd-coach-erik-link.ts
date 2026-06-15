/**
 * Fix production coach ↔ Erik WL profile link in Postgres.
 *
 * Resolves duplicate Erik profiles (ath-erik vs ath-* timestamp) by:
 * 1. Pointing the erik login user at the coach-roster profile id
 * 2. Optionally removing orphan duplicate profiles without assignments
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/fix-prd-coach-erik-link.ts
 *
 * Env (optional):
 *   COACH_USERNAME=coach-wl
 *   ATHLETE_USERNAME=erik
 *   DELETE_ORPHAN_DUPLICATES=1
 */
import { Pool } from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const coachUsername = (process.env.COACH_USERNAME ?? 'coach-wl').trim().toLowerCase();
  const athleteUsername = (process.env.ATHLETE_USERNAME ?? 'erik').trim().toLowerCase();
  const deleteOrphans = process.env.DELETE_ORPHAN_DUPLICATES === '1';

  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL_DISABLE === '1' ? false : { rejectUnauthorized: false },
  });

  try {
    const coachRes = await pool.query(
      `SELECT id FROM users WHERE lower(username) = $1 AND role = 'coach' LIMIT 1;`,
      [coachUsername],
    );
    const athleteRes = await pool.query(
      `SELECT id, linked_athlete_id FROM users WHERE lower(username) = $1 AND role = 'athlete' LIMIT 1;`,
      [athleteUsername],
    );
    const coachId = coachRes.rows[0]?.id as string | undefined;
    const athleteUserId = athleteRes.rows[0]?.id as string | undefined;
    if (!coachId || !athleteUserId) {
      throw new Error(`Coach (${coachUsername}) or athlete (${athleteUsername}) not found in users table.`);
    }

    const rosterRes = await pool.query(
      `SELECT id, name FROM wl_athlete_profiles WHERE coach_id = $1 ORDER BY name ASC;`,
      [coachId],
    );
    const roster = rosterRes.rows as Array<{ id: string; name: string }>;
    const erikRoster = roster.find((r) => /erik/i.test(r.name));
    if (!erikRoster) {
      throw new Error(`No Erik profile in coach roster for ${coachId}. Create via coach UI or POST /wl-athletes.`);
    }

    await pool.query(
      `UPDATE users SET linked_athlete_id = $2, coach_id = $3, updated_at = now() WHERE id = $1;`,
      [athleteUserId, erikRoster.id, coachId],
    );

    console.log(`✓ user ${athleteUsername} (${athleteUserId}) → linkedAthleteId ${erikRoster.id}`);

    if (deleteOrphans) {
      const dupRes = await pool.query(
        `
        SELECT p.id, p.name
        FROM wl_athlete_profiles p
        LEFT JOIN assignments a ON a.athlete_profile_id = p.id
        WHERE lower(p.name) LIKE '%erik%'
          AND p.id <> $1
          AND a.id IS NULL;
        `,
        [erikRoster.id],
      );
      for (const row of dupRes.rows as Array<{ id: string; name: string }>) {
        await pool.query(`DELETE FROM wl_athlete_profiles WHERE id = $1;`, [row.id]);
        console.log(`✓ removed orphan profile ${row.id} (${row.name})`);
      }
    }

    console.log('\nDone. Re-run: npm run smoke:prd-coach-erik');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
