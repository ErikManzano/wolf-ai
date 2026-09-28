/**
 * One-shot: set coach_programs.program.athleteId to __template__ for hub templates.
 *
 * Usage (Postgres, requires DATABASE_URL):
 *   node scripts/normalize-coach-program-template-athlete-id.mjs
 *
 * Dry-run only prints counts unless --apply is passed.
 */

import pg from 'pg';

const TEMPLATE_ID = '__template__';
const apply = process.argv.includes('--apply');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url });
  try {
    const { rows } = await pool.query(
      `SELECT id, coach_id, program FROM coach_programs ORDER BY created_at ASC;`,
    );
    let needsPatch = 0;
    for (const row of rows) {
      const program = row.program;
      if (!program || typeof program !== 'object') continue;
      if (program.athleteId === TEMPLATE_ID) continue;
      needsPatch += 1;
      if (apply) {
        const next = { ...program, athleteId: TEMPLATE_ID };
        await pool.query(`UPDATE coach_programs SET program = $1::jsonb, updated_at = now() WHERE id = $2;`, [
          JSON.stringify(next),
          row.id,
        ]);
      }
    }
    console.log(
      apply
        ? `Updated ${needsPatch} coach program(s) to athleteId=${TEMPLATE_ID}.`
        : `${needsPatch} coach program(s) would be updated. Re-run with --apply to persist.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
