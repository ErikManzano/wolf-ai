import type { Pool } from 'pg';
import type {
  AthleteLoadCalibration,
  CoachExerciseOverride,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  ExerciseDefinitionVersion,
  ExerciseRelationshipRule,
  ExerciseTaxonomyBundle,
  OverridePatch,
  PrescriptionEvent,
  TechnicalCollection,
  TechnicalCollectionWithItems,
} from '../models/exercise';
import taxonomyJson from '../data/exercise-taxonomy/taxonomy.json';
import { mockExercises } from '../data/loadMockData';
import { buildExerciseDefinition } from '../services/exercise/buildDefinition';
import { definitionsToLegacyExercises, fromLegacyExercise, getExerciseTaxonomy } from '../services/exercise';
import type { Exercise } from '../models/training';

export async function initExerciseCatalogTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercise_families (
      code TEXT PRIMARY KEY,
      label_es TEXT NOT NULL,
      label_en TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercise_variations (
      code TEXT PRIMARY KEY,
      label_es TEXT NOT NULL,
      label_en TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS start_positions (
      code TEXT PRIMARY KEY,
      label_es TEXT NOT NULL,
      label_en TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercise_modifiers (
      code TEXT PRIMARY KEY,
      label_es TEXT NOT NULL,
      label_en TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS training_objectives (
      code TEXT PRIMARY KEY,
      label_es TEXT NOT NULL,
      label_en TEXT NOT NULL,
      intensity_min INT NOT NULL,
      intensity_max INT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercise_definitions (
      id TEXT PRIMARY KEY,
      coach_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('single', 'complex')),
      family_id TEXT,
      variation_id TEXT,
      start_position_id TEXT,
      objective_id TEXT NOT NULL REFERENCES training_objectives(code),
      load_anchor TEXT NOT NULL DEFAULT 'auto',
      composition JSONB NOT NULL,
      display_name TEXT NOT NULL,
      signature TEXT NOT NULL,
      legacy_exercise_id TEXT,
      search_text TEXT NOT NULL DEFAULT '',
      tags TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS exercise_definitions_coach_idx ON exercise_definitions (coach_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS exercise_definitions_signature_idx ON exercise_definitions (signature);
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercise_relationship_rules (
      id TEXT PRIMARY KEY,
      coach_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      from_ref JSONB NOT NULL,
      to_ref JSONB NOT NULL,
      relationship_type TEXT NOT NULL,
      ratio_min REAL NOT NULL,
      ratio_max REAL NOT NULL,
      ratio_mean REAL NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.5,
      methodology TEXT NOT NULL DEFAULT 'empirical',
      athlete_level TEXT,
      notes TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS athlete_load_calibrations (
      athlete_profile_id TEXT NOT NULL,
      relationship_rule_id TEXT NOT NULL REFERENCES exercise_relationship_rules(id) ON DELETE CASCADE,
      ratio_mean REAL NOT NULL,
      ratio_min REAL NOT NULL,
      ratio_max REAL NOT NULL,
      sample_count INT NOT NULL DEFAULT 0,
      last_observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (athlete_profile_id, relationship_rule_id)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prescription_events (
      id TEXT PRIMARY KEY,
      athlete_profile_id TEXT NOT NULL,
      definition_id TEXT NOT NULL REFERENCES exercise_definitions(id) ON DELETE CASCADE,
      prescribed_pct REAL NOT NULL,
      completed BOOLEAN,
      rpe REAL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await migrateExerciseIntelligenceSchema(pool);
}

async function migrateExerciseIntelligenceSchema(pool: Pool): Promise<void> {
  await pool.query(`ALTER TABLE exercise_definitions ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'official'`);
  await pool.query(`ALTER TABLE exercise_definitions ADD COLUMN IF NOT EXISTS parent_definition_id TEXT REFERENCES exercise_definitions(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE exercise_definitions ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1`);
  await pool.query(`ALTER TABLE exercise_definitions ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE exercise_definitions ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS coach_exercise_overrides (
      id TEXT PRIMARY KEY,
      coach_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      base_definition_id TEXT NOT NULL REFERENCES exercise_definitions(id) ON DELETE CASCADE,
      override JSONB NOT NULL DEFAULT '{}',
      methodology TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (coach_id, base_definition_id)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS technical_collections (
      id TEXT PRIMARY KEY,
      coach_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      methodology TEXT,
      objective_id TEXT REFERENCES training_objectives(code),
      tags TEXT[] NOT NULL DEFAULT '{}',
      description TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS technical_collection_items (
      collection_id TEXT NOT NULL REFERENCES technical_collections(id) ON DELETE CASCADE,
      definition_id TEXT NOT NULL REFERENCES exercise_definitions(id) ON DELETE CASCADE,
      position INT NOT NULL DEFAULT 0,
      progression_notes TEXT,
      PRIMARY KEY (collection_id, definition_id)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercise_media_assets (
      id TEXT PRIMARY KEY,
      definition_id TEXT NOT NULL REFERENCES exercise_definitions(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      url TEXT,
      locale TEXT DEFAULT 'es',
      sort_order INT NOT NULL DEFAULT 0
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercise_definition_versions (
      id TEXT PRIMARY KEY,
      definition_id TEXT NOT NULL REFERENCES exercise_definitions(id) ON DELETE CASCADE,
      version INT NOT NULL,
      composition JSONB NOT NULL,
      display_name TEXT NOT NULL,
      signature TEXT NOT NULL,
      changed_by TEXT,
      change_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function seedExerciseTaxonomy(pool: Pool): Promise<void> {
  const t = taxonomyJson as ExerciseTaxonomyBundle & { relationshipRules?: ExerciseRelationshipRule[] };
  for (const f of t.families) {
    await pool.query(
      `INSERT INTO exercise_families (code, label_es, label_en, sort_order) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [f.code, f.labelEs, f.labelEn, f.sortOrder],
    );
  }
  for (const v of t.variations) {
    await pool.query(
      `INSERT INTO exercise_variations (code, label_es, label_en, sort_order) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [v.code, v.labelEs, v.labelEn, v.sortOrder],
    );
  }
  for (const p of t.startPositions) {
    await pool.query(
      `INSERT INTO start_positions (code, label_es, label_en, sort_order) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [p.code, p.labelEs, p.labelEn, p.sortOrder],
    );
  }
  for (const m of t.modifiers) {
    await pool.query(
      `INSERT INTO exercise_modifiers (code, label_es, label_en, sort_order) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [m.code, m.labelEs, m.labelEn, m.sortOrder],
    );
  }
  for (const o of t.objectives) {
    await pool.query(
      `INSERT INTO training_objectives (code, label_es, label_en, intensity_min, intensity_max, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
      [o.code, o.labelEs, o.labelEn, o.intensityMin, o.intensityMax, o.sortOrder],
    );
  }
  const rules = t.relationshipRules ?? [];
  for (const r of rules) {
    await pool.query(
      `INSERT INTO exercise_relationship_rules (
        id, coach_id, from_ref, to_ref, relationship_type, ratio_min, ratio_max, ratio_mean, confidence, methodology, is_active
      ) VALUES ($1,NULL,$2::jsonb,$3::jsonb,$4,$5,$6,$7,$8,$9,TRUE) ON CONFLICT DO NOTHING`,
      [
        r.id,
        JSON.stringify(r.fromRef),
        JSON.stringify(r.toRef),
        r.relationshipType,
        r.ratioMin,
        r.ratioMax,
        r.ratioMean,
        r.confidence,
        r.methodology,
      ],
    );
  }
}

/** Upserts official catalog from exercises.json (does not overwrite coach-owned rows). */
export async function seedExerciseDefinitionsFromLegacy(pool: Pool): Promise<number> {
  const bundle = getExerciseTaxonomy();
  let n = 0;
  for (const ex of mockExercises) {
    const displayName = ex.name;
    const def = fromLegacyExercise(ex, displayName);
    await pool.query(
      `INSERT INTO exercise_definitions (
        id, coach_id, kind, family_id, variation_id, start_position_id, objective_id, load_anchor,
        composition, display_name, signature, legacy_exercise_id, search_text, tags,
        lifecycle_status, version
      ) VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,'official',1)
      ON CONFLICT (id) DO UPDATE SET
        kind = EXCLUDED.kind,
        family_id = EXCLUDED.family_id,
        variation_id = EXCLUDED.variation_id,
        start_position_id = EXCLUDED.start_position_id,
        objective_id = EXCLUDED.objective_id,
        load_anchor = EXCLUDED.load_anchor,
        composition = EXCLUDED.composition,
        display_name = EXCLUDED.display_name,
        signature = EXCLUDED.signature,
        legacy_exercise_id = EXCLUDED.legacy_exercise_id,
        search_text = EXCLUDED.search_text,
        tags = EXCLUDED.tags,
        updated_at = now()
      WHERE exercise_definitions.coach_id IS NULL`,
      [
        def.id,
        def.kind,
        def.family ?? null,
        def.variation ?? null,
        def.startPosition ?? null,
        def.objective,
        def.loadAnchor,
        JSON.stringify(def.composition),
        def.displayName,
        def.signature,
        def.legacyExerciseId,
        def.searchText,
        def.tags,
      ],
    );
    n += 1;
  }
  void bundle;
  return n;
}

export async function getExerciseCatalogStats(pool: Pool): Promise<{
  officialDefinitions: number;
  coachDefinitions: number;
  relationshipRules: number;
  technicalCollections: number;
}> {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM exercise_definitions WHERE coach_id IS NULL) AS official_definitions,
      (SELECT COUNT(*)::int FROM exercise_definitions WHERE coach_id IS NOT NULL) AS coach_definitions,
      (SELECT COUNT(*)::int FROM exercise_relationship_rules WHERE is_active = TRUE) AS relationship_rules,
      (SELECT COUNT(*)::int FROM technical_collections) AS technical_collections
  `);
  const row = result.rows[0] as Record<string, number>;
  return {
    officialDefinitions: row.official_definitions ?? 0,
    coachDefinitions: row.coach_definitions ?? 0,
    relationshipRules: row.relationship_rules ?? 0,
    technicalCollections: row.technical_collections ?? 0,
  };
}

function mapDefinitionRow(row: Record<string, unknown>): ExerciseDefinition {
  return {
    id: row.id as string,
    coachId: (row.coach_id as string | null) ?? null,
    kind: row.kind as ExerciseDefinition['kind'],
    family: (row.family_id as string | null) as ExerciseDefinition['family'],
    variation: (row.variation_id as string | null) ?? null,
    startPosition: (row.start_position_id as string | null) ?? null,
    objective: row.objective_id as ExerciseDefinition['objective'],
    loadAnchor: row.load_anchor as ExerciseDefinition['loadAnchor'],
    composition: row.composition as ExerciseDefinition['composition'],
    displayName: row.display_name as string,
    signature: row.signature as string,
    legacyExerciseId: (row.legacy_exercise_id as string | null) ?? null,
    searchText: row.search_text as string,
    tags: (row.tags as string[]) ?? [],
    lifecycleStatus: (row.lifecycle_status as ExerciseDefinition['lifecycleStatus']) ?? undefined,
    parentDefinitionId: (row.parent_definition_id as string | null) ?? null,
    version: row.version != null ? Number(row.version) : 1,
    publishedAt: row.published_at ? new Date(row.published_at as string).toISOString() : null,
    deprecatedAt: row.deprecated_at ? new Date(row.deprecated_at as string).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : undefined,
  };
}

export async function listExerciseDefinitions(pool: Pool, coachId: string): Promise<ExerciseDefinition[]> {
  const result = await pool.query(
    `SELECT * FROM exercise_definitions WHERE coach_id IS NULL OR coach_id = $1 ORDER BY display_name ASC`,
    [coachId],
  );
  return result.rows.map(mapDefinitionRow);
}

export async function getExerciseDefinitionById(
  pool: Pool,
  id: string,
): Promise<{ def: ExerciseDefinition; coachId: string | null } | null> {
  const result = await pool.query(`SELECT * FROM exercise_definitions WHERE id = $1 LIMIT 1`, [id]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { def: mapDefinitionRow(row), coachId: (row.coach_id as string | null) ?? null };
}

export async function createExerciseDefinition(
  pool: Pool,
  coachId: string,
  id: string,
  input: ExerciseDefinitionInput,
): Promise<ExerciseDefinition> {
  const bundle = getExerciseTaxonomy();
  const def = buildExerciseDefinition(id, input, bundle, { coachId });
  const result = await pool.query(
    `INSERT INTO exercise_definitions (
      id, coach_id, kind, family_id, variation_id, start_position_id, objective_id, load_anchor,
      composition, display_name, signature, legacy_exercise_id, search_text, tags
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14)
    RETURNING *`,
    [
      def.id,
      coachId,
      def.kind,
      def.family ?? null,
      def.variation ?? null,
      def.startPosition ?? null,
      def.objective,
      def.loadAnchor,
      JSON.stringify(def.composition),
      def.displayName,
      def.signature,
      def.legacyExerciseId,
      def.searchText,
      def.tags,
    ],
  );
  return mapDefinitionRow(result.rows[0]);
}

export async function updateExerciseDefinition(
  pool: Pool,
  id: string,
  input: ExerciseDefinitionInput,
): Promise<ExerciseDefinition | null> {
  const bundle = getExerciseTaxonomy();
  const def = buildExerciseDefinition(id, input, bundle);
  const result = await pool.query(
    `UPDATE exercise_definitions SET
      kind=$2, family_id=$3, variation_id=$4, start_position_id=$5, objective_id=$6, load_anchor=$7,
      composition=$8::jsonb, display_name=$9, signature=$10, search_text=$11, tags=$12, updated_at=now()
    WHERE id=$1 AND coach_id IS NOT NULL RETURNING *`,
    [
      id,
      def.kind,
      def.family ?? null,
      def.variation ?? null,
      def.startPosition ?? null,
      def.objective,
      def.loadAnchor,
      JSON.stringify(def.composition),
      def.displayName,
      def.signature,
      def.searchText,
      def.tags,
    ],
  );
  if (result.rows.length === 0) return null;
  return mapDefinitionRow(result.rows[0]);
}

export async function deleteExerciseDefinition(pool: Pool, id: string, coachId: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM exercise_definitions WHERE id=$1 AND coach_id=$2`, [id, coachId]);
  return (result.rowCount ?? 0) > 0;
}

export async function listLegacyExercisesFromDefinitions(pool: Pool, coachId: string): Promise<Exercise[]> {
  const defs = await listExerciseDefinitions(pool, coachId);
  const bundle = getExerciseTaxonomy();
  return definitionsToLegacyExercises(defs, bundle);
}

export async function listRelationshipRules(pool: Pool, coachId: string): Promise<ExerciseRelationshipRule[]> {
  const result = await pool.query(
    `SELECT * FROM exercise_relationship_rules WHERE coach_id IS NULL OR coach_id = $1 ORDER BY id`,
    [coachId],
  );
  return result.rows.map((row) => ({
    id: row.id as string,
    coachId: (row.coach_id as string | null) ?? null,
    fromRef: row.from_ref as ExerciseRelationshipRule['fromRef'],
    toRef: row.to_ref as ExerciseRelationshipRule['toRef'],
    relationshipType: row.relationship_type as ExerciseRelationshipRule['relationshipType'],
    ratioMin: Number(row.ratio_min),
    ratioMax: Number(row.ratio_max),
    ratioMean: Number(row.ratio_mean),
    confidence: Number(row.confidence),
    methodology: row.methodology as ExerciseRelationshipRule['methodology'],
    athleteLevel: (row.athlete_level as ExerciseRelationshipRule['athleteLevel']) ?? null,
    notes: (row.notes as string | null) ?? null,
    isActive: Boolean(row.is_active),
  }));
}

export async function listAthleteCalibrations(
  pool: Pool,
  athleteProfileId: string,
): Promise<AthleteLoadCalibration[]> {
  const result = await pool.query(`SELECT * FROM athlete_load_calibrations WHERE athlete_profile_id = $1`, [
    athleteProfileId,
  ]);
  return result.rows.map((row) => ({
    athleteProfileId: row.athlete_profile_id as string,
    relationshipRuleId: row.relationship_rule_id as string,
    ratioMean: Number(row.ratio_mean),
    ratioMin: Number(row.ratio_min),
    ratioMax: Number(row.ratio_max),
    sampleCount: Number(row.sample_count),
    lastObservedAt: new Date(row.last_observed_at as string).toISOString(),
  }));
}

export async function insertPrescriptionEvent(pool: Pool, event: Omit<PrescriptionEvent, 'id'>): Promise<PrescriptionEvent> {
  const id = `pe-${Date.now()}`;
  await pool.query(
    `INSERT INTO prescription_events (id, athlete_profile_id, definition_id, prescribed_pct, completed, rpe, recorded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7::timestamptz)`,
    [
      id,
      event.athleteProfileId,
      event.definitionId,
      event.prescribedPct,
      event.completed ?? null,
      event.rpe ?? null,
      event.recordedAt,
    ],
  );
  return { ...event, id };
}

export async function listCoachOverrides(pool: Pool, coachId: string): Promise<CoachExerciseOverride[]> {
  const result = await pool.query(`SELECT * FROM coach_exercise_overrides WHERE coach_id = $1`, [coachId]);
  return result.rows.map((row) => ({
    id: row.id as string,
    coachId: row.coach_id as string,
    baseDefinitionId: row.base_definition_id as string,
    override: row.override as OverridePatch,
    methodology: (row.methodology as string | null) ?? null,
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : undefined,
  }));
}

export async function upsertCoachOverride(
  pool: Pool,
  coachId: string,
  baseDefinitionId: string,
  patch: OverridePatch,
  methodology?: string | null,
): Promise<CoachExerciseOverride> {
  const id = `ovr-${coachId}-${baseDefinitionId}`;
  const result = await pool.query(
    `INSERT INTO coach_exercise_overrides (id, coach_id, base_definition_id, override, methodology, updated_at)
     VALUES ($1,$2,$3,$4::jsonb,$5,now())
     ON CONFLICT (coach_id, base_definition_id) DO UPDATE SET override=$4::jsonb, methodology=$5, updated_at=now()
     RETURNING *`,
    [id, coachId, baseDefinitionId, JSON.stringify(patch), methodology ?? null],
  );
  const row = result.rows[0];
  return {
    id: row.id as string,
    coachId: row.coach_id as string,
    baseDefinitionId: row.base_definition_id as string,
    override: row.override as OverridePatch,
    methodology: (row.methodology as string | null) ?? null,
  };
}

export async function forkExerciseDefinition(
  pool: Pool,
  coachId: string,
  parentId: string,
  input: ExerciseDefinitionInput,
): Promise<ExerciseDefinition> {
  const id = `def-fork-${Date.now()}`;
  const bundle = getExerciseTaxonomy();
  const def = buildExerciseDefinition(id, input, bundle, { coachId });
  const result = await pool.query(
    `INSERT INTO exercise_definitions (
      id, coach_id, kind, family_id, variation_id, start_position_id, objective_id, load_anchor,
      composition, display_name, signature, legacy_exercise_id, search_text, tags,
      lifecycle_status, parent_definition_id, version
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,'coach_modified',$15,1)
    RETURNING *`,
    [
      def.id,
      coachId,
      def.kind,
      def.family ?? null,
      def.variation ?? null,
      def.startPosition ?? null,
      def.objective,
      def.loadAnchor,
      JSON.stringify(def.composition),
      def.displayName,
      def.signature,
      def.legacyExerciseId,
      def.searchText,
      def.tags,
      parentId,
    ],
  );
  return mapDefinitionRow(result.rows[0]);
}

export async function insertRelationshipRule(
  pool: Pool,
  coachId: string,
  rule: Omit<ExerciseRelationshipRule, 'id' | 'coachId'>,
): Promise<ExerciseRelationshipRule> {
  const id = `rel-${Date.now()}`;
  await pool.query(
    `INSERT INTO exercise_relationship_rules (
      id, coach_id, from_ref, to_ref, relationship_type, ratio_min, ratio_max, ratio_mean, confidence, methodology, athlete_level, notes, is_active
    ) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,TRUE)`,
    [
      id,
      coachId,
      JSON.stringify(rule.fromRef),
      JSON.stringify(rule.toRef),
      rule.relationshipType,
      rule.ratioMin,
      rule.ratioMax,
      rule.ratioMean,
      rule.confidence,
      rule.methodology,
      rule.athleteLevel ?? null,
      rule.notes ?? null,
    ],
  );
  return { ...rule, id, coachId, isActive: true };
}

export async function deleteRelationshipRule(pool: Pool, id: string, coachId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM exercise_relationship_rules WHERE id=$1 AND coach_id=$2`,
    [id, coachId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listTechnicalCollections(
  pool: Pool,
  coachId: string,
): Promise<TechnicalCollectionWithItems[]> {
  const cols = await pool.query(
    `SELECT * FROM technical_collections WHERE coach_id IS NULL OR coach_id = $1 ORDER BY sort_order, title`,
    [coachId],
  );
  const out: TechnicalCollectionWithItems[] = [];
  for (const row of cols.rows) {
    const items = await pool.query(
      `SELECT * FROM technical_collection_items WHERE collection_id = $1 ORDER BY position`,
      [row.id],
    );
    out.push({
      id: row.id as string,
      coachId: (row.coach_id as string | null) ?? null,
      code: row.code as string,
      title: row.title as string,
      methodology: (row.methodology as string | null) ?? null,
      objectiveId: (row.objective_id as string | null) as TechnicalCollection['objectiveId'],
      tags: (row.tags as string[]) ?? [],
      description: (row.description as string | null) ?? null,
      sortOrder: Number(row.sort_order),
      isActive: Boolean(row.is_active),
      items: items.rows.map((i) => ({
        collectionId: i.collection_id as string,
        definitionId: i.definition_id as string,
        position: Number(i.position),
        progressionNotes: (i.progression_notes as string | null) ?? null,
      })),
    });
  }
  return out;
}

export async function seedTechnicalCollections(pool: Pool): Promise<void> {
  const { seedTechnicalCollectionsLocal } = await import('../data/exercise-intelligence/seedCollections');
  const collections = seedTechnicalCollectionsLocal();
  for (const col of collections) {
    await pool.query(
      `INSERT INTO technical_collections (id, coach_id, code, title, methodology, objective_id, description, sort_order, is_active)
       VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (id) DO UPDATE SET
         code = EXCLUDED.code,
         title = EXCLUDED.title,
         methodology = EXCLUDED.methodology,
         objective_id = EXCLUDED.objective_id,
         description = EXCLUDED.description,
         sort_order = EXCLUDED.sort_order,
         is_active = true`,
      [col.id, col.code, col.title, col.methodology ?? null, col.objectiveId ?? null, col.description ?? null, col.sortOrder],
    );
    await pool.query(`DELETE FROM technical_collection_items WHERE collection_id = $1`, [col.id]);
    for (const item of col.items) {
      await pool.query(
        `INSERT INTO technical_collection_items (collection_id, definition_id, position, progression_notes)
         VALUES ($1, $2, $3, NULL)
         ON CONFLICT (collection_id, definition_id) DO UPDATE SET position = EXCLUDED.position`,
        [item.collectionId, item.definitionId, item.position],
      );
    }
  }
}

export async function snapshotDefinitionVersion(
  pool: Pool,
  def: ExerciseDefinition,
  changedBy?: string,
  changeReason?: string,
): Promise<ExerciseDefinitionVersion> {
  const ver = def.version ?? 1;
  const id = `ver-${def.id}-${ver}`;
  await pool.query(
    `INSERT INTO exercise_definition_versions (id, definition_id, version, composition, display_name, signature, changed_by, change_reason)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
    [
      id,
      def.id,
      ver,
      JSON.stringify(def.composition),
      def.displayName,
      def.signature,
      changedBy ?? null,
      changeReason ?? null,
    ],
  );
  return {
    id,
    definitionId: def.id,
    version: ver,
    composition: def.composition,
    displayName: def.displayName,
    signature: def.signature,
    changedBy,
    changeReason,
    createdAt: new Date().toISOString(),
  };
}

export async function publishExerciseDefinition(
  pool: Pool,
  id: string,
  changedBy?: string,
  changeReason?: string,
): Promise<ExerciseDefinition | null> {
  const row = await getExerciseDefinitionById(pool, id);
  if (!row) return null;
  const def = row.def;
  await snapshotDefinitionVersion(pool, def, changedBy, changeReason);
  const nextVersion = (def.version ?? 1) + 1;
  const result = await pool.query(
    `UPDATE exercise_definitions SET
      version = $2,
      published_at = now(),
      lifecycle_status = 'official',
      updated_at = now()
    WHERE id = $1
    RETURNING *`,
    [id, nextVersion],
  );
  if (result.rows.length === 0) return null;
  return mapDefinitionRow(result.rows[0]);
}

export async function listDefinitionVersions(pool: Pool, definitionId: string): Promise<ExerciseDefinitionVersion[]> {
  const result = await pool.query(
    `SELECT * FROM exercise_definition_versions WHERE definition_id = $1 ORDER BY version DESC`,
    [definitionId],
  );
  return result.rows.map((row) => ({
    id: row.id as string,
    definitionId: row.definition_id as string,
    version: Number(row.version),
    composition: row.composition as ExerciseDefinitionVersion['composition'],
    displayName: row.display_name as string,
    signature: row.signature as string,
    changedBy: (row.changed_by as string | null) ?? null,
    changeReason: (row.change_reason as string | null) ?? null,
    createdAt: new Date(row.created_at as string).toISOString(),
  }));
}

export async function getTaxonomyFromDb(pool: Pool): Promise<ExerciseTaxonomyBundle> {
  const [families, variations, startPositions, modifiers, objectives] = await Promise.all([
    pool.query(`SELECT code, label_es, label_en, sort_order FROM exercise_families WHERE is_active ORDER BY sort_order`),
    pool.query(`SELECT code, label_es, label_en, sort_order FROM exercise_variations WHERE is_active ORDER BY sort_order`),
    pool.query(`SELECT code, label_es, label_en, sort_order FROM start_positions WHERE is_active ORDER BY sort_order`),
    pool.query(`SELECT code, label_es, label_en, sort_order FROM exercise_modifiers WHERE is_active ORDER BY sort_order`),
    pool.query(
      `SELECT code, label_es, label_en, intensity_min, intensity_max, sort_order FROM training_objectives WHERE is_active ORDER BY sort_order`,
    ),
  ]);
  if (families.rows.length === 0) return getExerciseTaxonomy();
  return {
    families: families.rows.map((r) => ({
      code: r.code as string,
      labelEs: r.label_es as string,
      labelEn: r.label_en as string,
      sortOrder: Number(r.sort_order),
    })),
    variations: variations.rows.map((r) => ({
      code: r.code as string,
      labelEs: r.label_es as string,
      labelEn: r.label_en as string,
      sortOrder: Number(r.sort_order),
    })),
    startPositions: startPositions.rows.map((r) => ({
      code: r.code as string,
      labelEs: r.label_es as string,
      labelEn: r.label_en as string,
      sortOrder: Number(r.sort_order),
    })),
    modifiers: modifiers.rows.map((r) => ({
      code: r.code as string,
      labelEs: r.label_es as string,
      labelEn: r.label_en as string,
      sortOrder: Number(r.sort_order),
    })),
    objectives: objectives.rows.map((r) => ({
      code: r.code as string,
      labelEs: r.label_es as string,
      labelEn: r.label_en as string,
      intensityMin: Number(r.intensity_min),
      intensityMax: Number(r.intensity_max),
      sortOrder: Number(r.sort_order),
    })),
  };
}
