/**
 * Full Exercise OS schema + seed for production Postgres (Neon, Render, etc.).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/db-setup-production.ts
 *
 * Optional:
 *   PGSSL_DISABLE=1  — disable SSL (local Postgres only)
 */
import { Pool } from 'pg';
import { mockExercises } from '../src/data/loadMockData';
import {
  getExerciseCatalogStats,
  initExerciseCatalogTables,
  seedExerciseDefinitionsFromLegacy,
  seedExerciseTaxonomy,
  seedTechnicalCollections,
} from '../src/api/postgresExerciseCatalog';

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL_DISABLE === '1' ? false : { rejectUnauthorized: false },
  });

  try {
    console.log('Creating / migrating Exercise OS tables…');
    await initExerciseCatalogTables(pool);

    console.log('Seeding taxonomy + relationship rules…');
    await seedExerciseTaxonomy(pool);

    console.log(`Upserting ${mockExercises.length} official definitions from exercises.json…`);
    const upserted = await seedExerciseDefinitionsFromLegacy(pool);

    console.log('Seeding technical collections…');
    await seedTechnicalCollections(pool);

    const stats = await getExerciseCatalogStats(pool);
    console.log('\n--- Exercise OS catalog ---');
    console.log(`  Upserted from JSON:     ${upserted}`);
    console.log(`  Official definitions:   ${stats.officialDefinitions}`);
    console.log(`  Coach definitions:      ${stats.coachDefinitions}`);
    console.log(`  Active rel. rules:      ${stats.relationshipRules}`);
    console.log(`  Technical collections:  ${stats.technicalCollections}`);
    console.log('\nDone. Redeploy API or restart server; verify GET /health → exerciseCatalog.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
