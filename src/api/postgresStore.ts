import { Pool } from 'pg';
import type { Exercise, ProgramAssignment, SessionCompletion, SetCompletionLog, WolfUser, Athlete, CoachWlProgramTemplate, GeneratedProgram, AthleteLevel } from '../models/training';
import type { CoachProgram, CoachProgramStatus } from '../models/coach-architecture';
import { mockExercises, mockAthletes, mockUsers } from '../data/loadMockData';
import { normalizeExercise } from '../utils/exerciseCatalog';
import { hashPassword, looksLikeBcryptHash, verifyPassword } from '../utils/passwordCrypto';
import type { ExerciseUpsertPayload } from './exercisePayload';
import type { AuthRole, AuthUser } from './auth/types';
import type {
  CoachExerciseOverride,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  ExerciseRelationshipRule,
  OverridePatch,
  TechnicalCollectionWithItems,
} from '../models/exercise';
import {
  createExerciseDefinition,
  deleteExerciseDefinition,
  deleteRelationshipRule,
  forkExerciseDefinition,
  getExerciseDefinitionById,
  getTaxonomyFromDb,
  initExerciseCatalogTables,
  insertPrescriptionEvent,
  insertRelationshipRule,
  listAthleteCalibrations,
  listCoachOverrides,
  listDefinitionVersions,
  publishExerciseDefinition,
  listExerciseDefinitions,
  listLegacyExercisesFromDefinitions,
  listRelationshipRules,
  listTechnicalCollections,
  getExerciseCatalogStats,
  seedExerciseDefinitionsFromLegacy,
  seedExerciseTaxonomy,
  seedTechnicalCollections,
  snapshotDefinitionVersion,
  updateExerciseDefinition,
  upsertCoachOverride,
} from './postgresExerciseCatalog';

type AssignmentCreateInput = {
  id: string;
  coachId: string;
  athleteProfileId: string;
  athleteUserId?: string;
  program: ProgramAssignment['program'];
  sourceTemplateId?: string;
  coachProgramId?: string;
};

type UserCreateInput = {
  id: string;
  name: string;
  role: WolfUser['role'];
  email: string;
  password: string;
  username?: string;
  coachId?: string;
  linkedAthleteId?: string;
};

export class PostgresStore {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private mapUserRow(row: Record<string, unknown>): WolfUser {
    return {
      id: row.id as string,
      name: row.name as string,
      role: row.role as WolfUser['role'],
      email: row.email as string,
      username: (row.username as string | null) ?? undefined,
      coachId: (row.coach_id as string | null) ?? undefined,
      linkedAthleteId: (row.linked_athlete_id as string | null) ?? undefined,
    };
  }

  static fromEnv(): PostgresStore | null {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) return null;
    const pool = new Pool({
      connectionString,
      ssl: process.env.PGSSL_DISABLE === '1' ? false : { rejectUnauthorized: false },
    });
    return new PostgresStore(pool);
  }

  async init(seedUsers: WolfUser[]): Promise<void> {
    await this.pool.query(`
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
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT 'wolf2026';`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT TRUE;`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'password';`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT;`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_email_token_hash TEXT;`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_email_token_expires_at TIMESTAMPTZ;`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token_hash TEXT;`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token_expires_at TIMESTAMPTZ;`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;`);
    await this.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx
      ON users (lower(username))
      WHERE username IS NOT NULL AND username <> '';
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        coach_id TEXT NOT NULL,
        athlete_user_id TEXT,
        athlete_profile_id TEXT NOT NULL UNIQUE,
        source_template_id TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        version INTEGER NOT NULL,
        version_history JSONB NOT NULL DEFAULT '[]'::jsonb,
        program JSONB NOT NULL,
        assigned_at TIMESTAMPTZ NOT NULL
      );
    `);
    await this.pool.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS source_template_id TEXT;`);
    await this.pool.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS workout_completions (
        id TEXT PRIMARY KEY,
        assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        week_number INTEGER NOT NULL,
        day_number INTEGER NOT NULL,
        exercise_index INTEGER,
        completed_at TIMESTAMPTZ NOT NULL
      );
    `);
    await this.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS workout_completions_slot_idx
      ON workout_completions (assignment_id, week_number, day_number, COALESCE(exercise_index, -1));
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS workout_set_logs (
        id TEXT PRIMARY KEY,
        assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        week_number INTEGER NOT NULL,
        day_number INTEGER NOT NULL,
        exercise_index INTEGER NOT NULL,
        scheme_index INTEGER NOT NULL,
        set_instance INTEGER NOT NULL,
        actual_kg REAL,
        actual_reps INTEGER,
        completed_at TIMESTAMPTZ NOT NULL
      );
    `);
    await this.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS workout_set_logs_slot_idx
      ON workout_set_logs (
        assignment_id, week_number, day_number, exercise_index, scheme_index, set_instance
      );
    `);
    await this.pool.query(`
      ALTER TABLE workout_set_logs
      ADD COLUMN IF NOT EXISTS actual_segment_reps JSONB;
    `);
    await this.pool.query(`
      ALTER TABLE workout_set_logs
      ADD COLUMN IF NOT EXISTS actual_rpe REAL;
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS coach_exercises (
        id TEXT PRIMARY KEY,
        coach_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        subtype TEXT NOT NULL,
        start_position TEXT NOT NULL,
        complexity TEXT NOT NULL,
        goal TEXT NOT NULL,
        intensity_min INTEGER NOT NULL,
        intensity_max INTEGER NOT NULL,
        load_anchor TEXT NOT NULL DEFAULT 'auto',
        load_scale REAL NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS coach_exercises_coach_id_idx ON coach_exercises (coach_id);
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS wl_athlete_profiles (
        id TEXT PRIMARY KEY,
        coach_id TEXT NOT NULL,
        name TEXT NOT NULL,
        level TEXT NOT NULL,
        bodyweight NUMERIC,
        one_rm JSONB NOT NULL,
        fatigue_score INT,
        readiness_score INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS wl_athlete_profiles_coach_id_idx ON wl_athlete_profiles (coach_id);
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS coach_wl_templates (
        id TEXT PRIMARY KEY,
        coach_id TEXT NOT NULL,
        name TEXT NOT NULL,
        program JSONB NOT NULL,
        source_assignment_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS coach_wl_templates_coach_id_idx ON coach_wl_templates (coach_id);
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS coach_programs (
        id TEXT PRIMARY KEY,
        coach_id TEXT NOT NULL,
        name TEXT NOT NULL,
        program JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS coach_programs_coach_id_idx ON coach_programs (coach_id);
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS plan_change_notifications (
        id TEXT PRIMARY KEY,
        recipient_user_id TEXT NOT NULL,
        coach_id TEXT NOT NULL,
        coach_name TEXT NOT NULL,
        coach_program_id TEXT NOT NULL DEFAULT '',
        program_name TEXT NOT NULL,
        assignment_id TEXT,
        athlete_profile_id TEXT NOT NULL,
        week_number INTEGER NOT NULL,
        day_number INTEGER NOT NULL,
        day_label TEXT,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        read_at TIMESTAMPTZ,
        message_es TEXT NOT NULL,
        message_en TEXT NOT NULL
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS plan_change_notifications_recipient_idx
      ON plan_change_notifications (recipient_user_id, read_at, changed_at DESC);
    `);
    await this.pool.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS coach_program_id TEXT;`);
    await this.pool.query(`
      ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_athlete_profile_id_key;
    `);
    await this.pool.query(`DROP INDEX IF EXISTS assignments_active_athlete_idx;`);
    await this.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS assignments_athlete_coach_program_active_idx
      ON assignments (athlete_profile_id, coach_program_id)
      WHERE coach_program_id IS NOT NULL AND status = 'active';
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS assignments_athlete_profile_id_idx
      ON assignments (athlete_profile_id);
    `);
    await this.seedCoachProgramsFromTemplates();
    await this.seedWlAthleteProfilesIfEmpty();
    await this.seedSystemExercises();
    await initExerciseCatalogTables(this.pool);
    await seedExerciseTaxonomy(this.pool);
    const officialSeeded = await seedExerciseDefinitionsFromLegacy(this.pool);
    await seedTechnicalCollections(this.pool);
    console.log(`[postgres] Exercise OS catalog: ${officialSeeded} official definitions upserted from exercises.json`);

    const syncPasswords = process.env.WOLF_SYNC_SEED_PASSWORDS !== '0';

    for (const user of seedUsers) {
      const storedPassword =
        user.passwordHash && looksLikeBcryptHash(user.passwordHash)
          ? user.passwordHash
          : hashPassword(user.password ?? 'wolf2026');
      const params = [
        user.id,
        user.name,
        user.role,
        user.email ?? '',
        storedPassword,
        user.coachId ?? null,
        user.linkedAthleteId ?? null,
        user.username?.toLowerCase() ?? null,
      ];
      try {
        await this.pool.query(
          `
        INSERT INTO users (id, name, role, email, password, coach_id, linked_athlete_id, username)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          coach_id = EXCLUDED.coach_id,
          linked_athlete_id = EXCLUDED.linked_athlete_id,
          username = EXCLUDED.username;
        `,
          params,
        );
      } catch (err: unknown) {
        const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
        if (code !== '23505') throw err;
        await this.pool.query(
          `
          UPDATE users SET
            name = $1,
            role = $2,
            password = $3,
            coach_id = CASE
              WHEN $4::text IS NOT NULL AND EXISTS (SELECT 1 FROM users u WHERE u.id = $4)
              THEN $4
              ELSE coach_id
            END,
            linked_athlete_id = COALESCE($5, linked_athlete_id),
            username = COALESCE($6, username)
          WHERE lower(email) = lower($7);
        `,
          [
            user.name,
            user.role,
            storedPassword,
            user.coachId ?? null,
            user.linkedAthleteId ?? null,
            user.username?.toLowerCase() ?? null,
            user.email ?? '',
          ],
        );
      }
    }

    if (syncPasswords) {
      for (const user of seedUsers) {
        const storedPassword =
          user.passwordHash && looksLikeBcryptHash(user.passwordHash)
            ? user.passwordHash
            : hashPassword(user.password ?? 'wolf2026');
        await this.pool.query(`UPDATE users SET password = $1 WHERE lower(email) = lower($2);`, [
          storedPassword,
          user.email ?? '',
        ]);
      }
    }
  }

  async getExerciseCatalogStats() {
    return getExerciseCatalogStats(this.pool);
  }

  async getUsers(): Promise<WolfUser[]> {
    const result = await this.pool.query(
      'SELECT id, name, role, email, username, coach_id, linked_athlete_id FROM users ORDER BY name ASC;',
    );
    return result.rows.map((row) => this.mapUserRow(row));
  }

  async getUserByEmail(email: string): Promise<WolfUser | null> {
    const result = await this.pool.query(
      'SELECT id, name, role, email, username, coach_id, linked_athlete_id FROM users WHERE lower(email) = lower($1) LIMIT 1;',
      [email],
    );
    if (result.rows.length === 0) return null;
    return this.mapUserRow(result.rows[0]);
  }

  async validateUser(loginId: string, password: string): Promise<WolfUser | null> {
    const result = await this.pool.query(
      `
      SELECT id, name, role, email, username, coach_id, linked_athlete_id, password AS stored_password
      FROM users
      WHERE lower(email) = lower($1) OR lower(username) = lower($1)
      LIMIT 1;
      `,
      [loginId],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const stored = row.stored_password as string;
    const ok =
      looksLikeBcryptHash(stored) ? verifyPassword(password, stored) : stored === password;
    if (!ok) return null;
    return this.mapUserRow(row);
  }

  async createUser(input: UserCreateInput): Promise<WolfUser> {
    const passHash = hashPassword(input.password);
    const result = await this.pool.query(
      `
      INSERT INTO users (id, name, role, email, password, coach_id, linked_athlete_id, username)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, role, email, username, coach_id, linked_athlete_id;
      `,
      [
        input.id,
        input.name,
        input.role,
        input.email,
        passHash,
        input.coachId ?? null,
        input.linkedAthleteId ?? null,
        input.username?.toLowerCase() ?? null,
      ],
    );
    return this.mapUserRow(result.rows[0]);
  }

  /** Align athlete login `linkedAthleteId` with the coach roster profile used for assignments. */
  async reconcileAthleteUserLink(userId: string): Promise<WolfUser | null> {
    const result = await this.pool.query(
      'SELECT id, name, role, email, username, coach_id, linked_athlete_id FROM users WHERE id = $1 LIMIT 1;',
      [userId],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if ((row.role as string) !== 'athlete') return this.mapUserRow(row);

    let coachId = (row.coach_id as string | null) ?? undefined;
    const linkedId = (row.linked_athlete_id as string | null) ?? undefined;
    const name = (row.name as string).trim();
    const username = ((row.username as string | null) ?? '').trim().toLowerCase();
    const emailLocal = ((row.email as string | null) ?? '').split('@')[0]?.trim().toLowerCase() ?? '';
    const userKey = username || emailLocal;

    if (!coachId) {
      const fromAssignment = await this.pool.query(
        'SELECT coach_id FROM assignments WHERE athlete_user_id = $1 ORDER BY assigned_at DESC LIMIT 1;',
        [userId],
      );
      coachId = (fromAssignment.rows[0]?.coach_id as string | undefined) ?? undefined;
    }
    if (!coachId) return this.mapUserRow(row);

    const roster = await this.listAthleteProfiles(coachId);
    const linkedInRoster = linkedId ? roster.some((p) => p.id === linkedId) : false;

    let targetProfileId = linkedInRoster ? linkedId : undefined;
    if (!targetProfileId) {
      const nameKey = name.toLowerCase();
      const byName = roster.find((p) => p.name.trim().toLowerCase() === nameKey);
      const byKey =
        userKey.length > 0
          ? roster.find((p) => p.name.trim().toLowerCase().includes(userKey))
          : undefined;
      targetProfileId = byName?.id ?? byKey?.id;
    }
    if (!targetProfileId) {
      const fromAssignment = await this.pool.query(
        'SELECT athlete_profile_id FROM assignments WHERE athlete_user_id = $1 ORDER BY assigned_at DESC LIMIT 1;',
        [userId],
      );
      const profileFromAssignment = fromAssignment.rows[0]?.athlete_profile_id as string | undefined;
      if (profileFromAssignment && roster.some((p) => p.id === profileFromAssignment)) {
        targetProfileId = profileFromAssignment;
      }
    }

    if (targetProfileId && (targetProfileId !== linkedId || coachId !== (row.coach_id as string | null))) {
      await this.pool.query(
        'UPDATE assignments SET athlete_user_id = $1 WHERE athlete_profile_id = $2 AND (athlete_user_id IS NULL OR athlete_user_id = \'\');',
        [userId, targetProfileId],
      );
      return this.updateUser(userId, { linkedAthleteId: targetProfileId, coachId });
    }

    if (targetProfileId) {
      await this.pool.query(
        'UPDATE assignments SET athlete_user_id = $1 WHERE athlete_profile_id = $2 AND (athlete_user_id IS NULL OR athlete_user_id = \'\');',
        [userId, targetProfileId],
      );
    }

    return this.mapUserRow(row);
  }

  async getAssignmentsForAthleteUser(user: WolfUser): Promise<ProgramAssignment[]> {
    const all = await this.getAssignments();
    const profileIds = new Set<string>();
    if (user.linkedAthleteId) profileIds.add(user.linkedAthleteId);

    for (const assignment of all) {
      if (assignment.athleteUserId === user.id) profileIds.add(assignment.athleteProfileId);
    }

    if (user.coachId) {
      const roster = await this.listAthleteProfiles(user.coachId);
      const nameKey = user.name.trim().toLowerCase();
      const username = (user.username ?? '').trim().toLowerCase();
      const emailLocal = (user.email ?? '').split('@')[0]?.trim().toLowerCase() ?? '';
      const userKey = username || emailLocal;
      for (const profile of roster) {
        const profileName = profile.name.trim().toLowerCase();
        if (profileName === nameKey || (userKey && profileName.includes(userKey))) {
          profileIds.add(profile.id);
        }
      }
    }

    return all.filter(
      (a) => a.athleteUserId === user.id || profileIds.has(a.athleteProfileId),
    );
  }

  async updateUser(
    id: string,
    input: Partial<Pick<UserCreateInput, 'name' | 'role' | 'email' | 'coachId' | 'linkedAthleteId'>>,
  ): Promise<WolfUser | null> {
    const existing = await this.pool.query(
      'SELECT id, name, role, email, coach_id, linked_athlete_id FROM users WHERE id = $1 LIMIT 1;',
      [id],
    );
    if (existing.rows.length === 0) return null;
    const row = existing.rows[0];
    const next = {
      name: input.name ?? (row.name as string),
      role: input.role ?? (row.role as WolfUser['role']),
      email: input.email ?? (row.email as string),
      coachId: input.coachId ?? ((row.coach_id as string | null) ?? undefined),
      linkedAthleteId: input.linkedAthleteId ?? ((row.linked_athlete_id as string | null) ?? undefined),
    };
    const result = await this.pool.query(
      `
      UPDATE users
      SET name = $2, role = $3, email = $4, coach_id = $5, linked_athlete_id = $6
      WHERE id = $1
      RETURNING id, name, role, email, coach_id, linked_athlete_id;
      `,
      [id, next.name, next.role, next.email, next.coachId ?? null, next.linkedAthleteId ?? null],
    );
    const updated = result.rows[0];
    return {
      id: updated.id as string,
      name: updated.name as string,
      role: updated.role as WolfUser['role'],
      email: updated.email as string,
      coachId: (updated.coach_id as string | null) ?? undefined,
      linkedAthleteId: (updated.linked_athlete_id as string | null) ?? undefined,
    };
  }

  async changePassword(email: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const found = await this.pool.query(`SELECT password FROM users WHERE lower(email) = lower($1) LIMIT 1;`, [email]);
    if (found.rows.length === 0) return false;
    const stored = found.rows[0].password as string;
    const valid =
      looksLikeBcryptHash(stored) ? verifyPassword(currentPassword, stored) : stored === currentPassword;
    if (!valid) return false;
    const newHash = hashPassword(newPassword);
    const result = await this.pool.query(
      `UPDATE users SET password = $2 WHERE lower(email) = lower($1);`,
      [email, newHash],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async setUserPassword(id: string, newPassword: string): Promise<boolean> {
    const newHash = hashPassword(newPassword);
    const result = await this.pool.query(`UPDATE users SET password = $2 WHERE id = $1;`, [id, newHash]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM users WHERE id = $1;', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private assignmentSelectColumns =
    'id, coach_id, athlete_user_id, athlete_profile_id, source_template_id, coach_program_id, version, version_history, program, assigned_at';

  async getAssignments(): Promise<ProgramAssignment[]> {
    const result = await this.pool.query(
      `
      SELECT ${this.assignmentSelectColumns}
      FROM assignments
      ORDER BY assigned_at DESC;
      `,
    );
    return result.rows.map(this.mapAssignmentRow);
  }

  async getAssignmentById(id: string): Promise<ProgramAssignment | null> {
    const result = await this.pool.query(
      `
      SELECT ${this.assignmentSelectColumns}
      FROM assignments
      WHERE id = $1
      LIMIT 1;
      `,
      [id],
    );
    if (result.rows.length === 0) return null;
    return this.mapAssignmentRow(result.rows[0]);
  }

  async getAssignmentsByAthleteProfileId(athleteProfileId: string): Promise<ProgramAssignment[]> {
    const result = await this.pool.query(
      `
      SELECT ${this.assignmentSelectColumns}
      FROM assignments
      WHERE athlete_profile_id = $1
      ORDER BY assigned_at DESC;
      `,
      [athleteProfileId],
    );
    return result.rows.map((row) => this.mapAssignmentRow(row));
  }

  async getAssignmentByAthlete(athleteProfileId: string): Promise<ProgramAssignment | null> {
    const rows = await this.getAssignmentsByAthleteProfileId(athleteProfileId);
    return rows[0] ?? null;
  }

  async createOrReplaceAssignment(input: AssignmentCreateInput): Promise<ProgramAssignment> {
    if (input.coachProgramId) {
      await this.pool.query(
        'DELETE FROM assignments WHERE athlete_profile_id = $1 AND coach_program_id = $2;',
        [input.athleteProfileId, input.coachProgramId],
      );
    } else if (input.sourceTemplateId) {
      await this.pool.query(
        `DELETE FROM assignments
         WHERE athlete_profile_id = $1 AND source_template_id = $2 AND coach_program_id IS NULL;`,
        [input.athleteProfileId, input.sourceTemplateId],
      );
    } else {
      await this.pool.query(
        'DELETE FROM assignments WHERE athlete_profile_id = $1 AND coach_program_id IS NULL;',
        [input.athleteProfileId],
      );
    }
    const assignedAt = new Date().toISOString();
    const result = await this.pool.query(
      `
      INSERT INTO assignments (
        id, coach_id, athlete_user_id, athlete_profile_id, source_template_id, coach_program_id, status,
        version, version_history, program, assigned_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'active', 1, '[]'::jsonb, $7::jsonb, $8::timestamptz)
      RETURNING ${this.assignmentSelectColumns};
      `,
      [
        input.id,
        input.coachId,
        input.athleteUserId ?? null,
        input.athleteProfileId,
        input.sourceTemplateId ?? null,
        input.coachProgramId ?? null,
        JSON.stringify({ ...input.program, athleteId: input.athleteProfileId }),
        assignedAt,
      ],
    );
    return this.mapAssignmentRow(result.rows[0]);
  }

  async updateAssignmentProgram(
    id: string,
    program: ProgramAssignment['program'],
    options?: { skipVersionHistory?: boolean },
  ): Promise<ProgramAssignment | null> {
    if (options?.skipVersionHistory) {
      const result = await this.pool.query(
        `
        UPDATE assignments
        SET program = $2::jsonb
        WHERE id = $1
        RETURNING ${this.assignmentSelectColumns};
        `,
        [id, JSON.stringify(program)],
      );
      return result.rows[0] ? this.mapAssignmentRow(result.rows[0]) : null;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const currentRes = await client.query(
        `
        SELECT ${this.assignmentSelectColumns}
        FROM assignments
        WHERE id = $1
        FOR UPDATE;
        `,
        [id],
      );
      if (currentRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const current = this.mapAssignmentRow(currentRes.rows[0]);
      const nextHistory = [
        ...current.versionHistory,
        { version: current.version, editedAt: new Date().toISOString(), program: current.program },
      ];
      const updatedRes = await client.query(
        `
        UPDATE assignments
        SET version = $2, version_history = $3::jsonb, program = $4::jsonb
        WHERE id = $1
        RETURNING ${this.assignmentSelectColumns};
        `,
        [
          id,
          current.version + 1,
          JSON.stringify(nextHistory),
          JSON.stringify({ ...program, athleteId: current.athleteProfileId }),
        ],
      );
      await client.query('COMMIT');
      return this.mapAssignmentRow(updatedRes.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAssignment(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM assignments WHERE id = $1;', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getCompletions(assignmentId?: string): Promise<SessionCompletion[]> {
    const result = assignmentId
      ? await this.pool.query(
          `
          SELECT assignment_id, week_number, day_number, exercise_index, completed_at
          FROM workout_completions
          WHERE assignment_id = $1
          ORDER BY completed_at DESC;
          `,
          [assignmentId],
        )
      : await this.pool.query(
          `
          SELECT assignment_id, week_number, day_number, exercise_index, completed_at
          FROM workout_completions
          ORDER BY completed_at DESC;
          `,
        );
    return result.rows.map(this.mapCompletionRow);
  }

  async toggleCompletion(input: {
    assignmentId: string;
    weekNumber: number;
    dayNumber: number;
    exerciseIndex?: number;
  }): Promise<boolean> {
    const exerciseIndex = input.exerciseIndex ?? null;
    const existing = await this.pool.query(
      `
      SELECT id FROM workout_completions
      WHERE assignment_id = $1 AND week_number = $2 AND day_number = $3
        AND (
          ($4::int IS NULL AND exercise_index IS NULL)
          OR exercise_index = $4
        )
      LIMIT 1;
      `,
      [input.assignmentId, input.weekNumber, input.dayNumber, exerciseIndex],
    );
    if (existing.rows.length > 0) {
      await this.pool.query('DELETE FROM workout_completions WHERE id = $1;', [existing.rows[0].id]);
      return false;
    }
    const id = `wc-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await this.pool.query(
      `
      INSERT INTO workout_completions (id, assignment_id, week_number, day_number, exercise_index, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6::timestamptz);
      `,
      [id, input.assignmentId, input.weekNumber, input.dayNumber, exerciseIndex, new Date().toISOString()],
    );
    return true;
  }

  async deleteCompletionsForDay(
    assignmentId: string,
    weekNumber: number,
    dayNumber: number,
  ): Promise<void> {
    await this.pool.query(
      `
      DELETE FROM workout_completions
      WHERE assignment_id = $1 AND week_number = $2 AND day_number = $3;
      `,
      [assignmentId, weekNumber, dayNumber],
    );
  }

  async getSetLogs(assignmentId?: string): Promise<SetCompletionLog[]> {
    const result = assignmentId
      ? await this.pool.query(
          `
          SELECT assignment_id, week_number, day_number, exercise_index, scheme_index,
                 set_instance, actual_kg, actual_reps, actual_segment_reps, actual_rpe, completed_at
          FROM workout_set_logs
          WHERE assignment_id = $1
          ORDER BY completed_at DESC;
          `,
          [assignmentId],
        )
      : await this.pool.query(
          `
          SELECT assignment_id, week_number, day_number, exercise_index, scheme_index,
                 set_instance, actual_kg, actual_reps, actual_segment_reps, actual_rpe, completed_at
          FROM workout_set_logs
          ORDER BY completed_at DESC;
          `,
        );
    return result.rows.map(this.mapSetLogRow);
  }

  async toggleSetLog(input: {
    assignmentId: string;
    weekNumber: number;
    dayNumber: number;
    exerciseIndex: number;
    schemeIndex: number;
    setInstance: number;
    actualKg?: number;
    actualReps?: number;
    actualSegmentReps?: number[];
    actualRpe?: number;
  }): Promise<boolean> {
    const existing = await this.pool.query(
      `
      SELECT id FROM workout_set_logs
      WHERE assignment_id = $1 AND week_number = $2 AND day_number = $3
        AND exercise_index = $4 AND scheme_index = $5 AND set_instance = $6
      LIMIT 1;
      `,
      [
        input.assignmentId,
        input.weekNumber,
        input.dayNumber,
        input.exerciseIndex,
        input.schemeIndex,
        input.setInstance,
      ],
    );
    if (existing.rows.length > 0) {
      await this.pool.query('DELETE FROM workout_set_logs WHERE id = $1;', [existing.rows[0].id]);
      return false;
    }
    const id = `wsl-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await this.pool.query(
      `
      INSERT INTO workout_set_logs (
        id, assignment_id, week_number, day_number, exercise_index, scheme_index,
        set_instance, actual_kg, actual_reps, actual_segment_reps, actual_rpe, completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz);
      `,
      [
        id,
        input.assignmentId,
        input.weekNumber,
        input.dayNumber,
        input.exerciseIndex,
        input.schemeIndex,
        input.setInstance,
        input.actualKg ?? null,
        input.actualReps ?? null,
        input.actualSegmentReps?.length ? JSON.stringify(input.actualSegmentReps) : null,
        input.actualRpe ?? null,
        new Date().toISOString(),
      ],
    );
    return true;
  }

  async patchSetLog(input: {
    assignmentId: string;
    weekNumber: number;
    dayNumber: number;
    exerciseIndex: number;
    schemeIndex: number;
    setInstance: number;
    actualKg?: number;
    actualReps?: number;
    actualSegmentReps?: number[];
    actualRpe?: number;
  }): Promise<SetCompletionLog | null> {
    const existing = await this.pool.query(
      `
      SELECT id FROM workout_set_logs
      WHERE assignment_id = $1 AND week_number = $2 AND day_number = $3
        AND exercise_index = $4 AND scheme_index = $5 AND set_instance = $6
      LIMIT 1;
      `,
      [
        input.assignmentId,
        input.weekNumber,
        input.dayNumber,
        input.exerciseIndex,
        input.schemeIndex,
        input.setInstance,
      ],
    );
    if (existing.rows.length === 0) {
      const id = `wsl-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      await this.pool.query(
        `
        INSERT INTO workout_set_logs (
          id, assignment_id, week_number, day_number, exercise_index, scheme_index,
          set_instance, actual_kg, actual_reps, actual_segment_reps, actual_rpe, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz);
        `,
        [
          id,
          input.assignmentId,
          input.weekNumber,
          input.dayNumber,
          input.exerciseIndex,
          input.schemeIndex,
          input.setInstance,
          input.actualKg ?? null,
          input.actualReps ?? null,
          input.actualSegmentReps?.length ? JSON.stringify(input.actualSegmentReps) : null,
          input.actualRpe ?? null,
          new Date().toISOString(),
        ],
      );
    } else {
      await this.pool.query(
        `
        UPDATE workout_set_logs
        SET actual_kg = COALESCE($8, actual_kg),
            actual_reps = COALESCE($9, actual_reps),
            actual_segment_reps = COALESCE($10::jsonb, actual_segment_reps),
            actual_rpe = COALESCE($11, actual_rpe)
        WHERE assignment_id = $1 AND week_number = $2 AND day_number = $3
          AND exercise_index = $4 AND scheme_index = $5 AND set_instance = $6;
        `,
        [
          input.assignmentId,
          input.weekNumber,
          input.dayNumber,
          input.exerciseIndex,
          input.schemeIndex,
          input.setInstance,
          input.actualKg ?? null,
          input.actualReps ?? null,
          input.actualSegmentReps?.length ? JSON.stringify(input.actualSegmentReps) : null,
          input.actualRpe ?? null,
        ],
      );
    }
    const rows = await this.getSetLogs(input.assignmentId);
    return (
      rows.find(
        (l) =>
          l.assignmentId === input.assignmentId &&
          l.weekNumber === input.weekNumber &&
          l.dayNumber === input.dayNumber &&
          l.exerciseIndex === input.exerciseIndex &&
          l.schemeIndex === input.schemeIndex &&
          l.setInstance === input.setInstance,
      ) ?? null
    );
  }

  private async seedSystemExercises(): Promise<void> {
    for (const raw of mockExercises) {
      const ex = normalizeExercise({ ...raw } as unknown as Record<string, unknown>);
      await this.pool.query(
        `
        INSERT INTO coach_exercises (
          id, coach_id, name, category, subtype, start_position, complexity, goal,
          intensity_min, intensity_max, load_anchor, load_scale
        ) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          subtype = EXCLUDED.subtype,
          start_position = EXCLUDED.start_position,
          complexity = EXCLUDED.complexity,
          goal = EXCLUDED.goal,
          intensity_min = EXCLUDED.intensity_min,
          intensity_max = EXCLUDED.intensity_max,
          load_anchor = EXCLUDED.load_anchor,
          load_scale = EXCLUDED.load_scale,
          updated_at = now()
        WHERE coach_exercises.coach_id IS NULL;
        `,
        [
          ex.id,
          ex.name,
          ex.category,
          ex.subtype,
          ex.startPosition,
          ex.complexity,
          ex.goal,
          ex.intensityRange[0],
          ex.intensityRange[1],
          ex.loadAnchor ?? 'auto',
          ex.loadScale ?? 1,
        ],
      );
    }
  }

  async listExercisesForCoach(coachId: string): Promise<Exercise[]> {
    const fromDefs = await listLegacyExercisesFromDefinitions(this.pool, coachId);
    if (fromDefs.length > 0) return fromDefs;
    const result = await this.pool.query(
      `
      SELECT id, coach_id, name, category, subtype, start_position, complexity, goal,
             intensity_min, intensity_max, load_anchor, load_scale
      FROM coach_exercises
      WHERE coach_id IS NULL OR coach_id = $1
      ORDER BY name ASC;
      `,
      [coachId],
    );
    return result.rows.map((row) => this.mapExerciseRow(row));
  }

  async getExerciseTaxonomyBundle() {
    return getTaxonomyFromDb(this.pool);
  }

  async listExerciseDefinitionsForCoach(coachId: string): Promise<ExerciseDefinition[]> {
    return listExerciseDefinitions(this.pool, coachId);
  }

  async getExerciseDefinition(id: string) {
    return getExerciseDefinitionById(this.pool, id);
  }

  async createExerciseDefinitionForCoach(coachId: string, id: string, input: ExerciseDefinitionInput) {
    return createExerciseDefinition(this.pool, coachId, id, input);
  }

  async updateExerciseDefinitionById(id: string, input: ExerciseDefinitionInput) {
    return updateExerciseDefinition(this.pool, id, input);
  }

  async deleteExerciseDefinitionById(id: string, coachId: string) {
    return deleteExerciseDefinition(this.pool, id, coachId);
  }

  async listExerciseRelationshipRules(coachId: string): Promise<ExerciseRelationshipRule[]> {
    return listRelationshipRules(this.pool, coachId);
  }

  async getAthleteLoadCalibrations(athleteProfileId: string) {
    return listAthleteCalibrations(this.pool, athleteProfileId);
  }

  async recordPrescriptionEvent(event: Parameters<typeof insertPrescriptionEvent>[1]) {
    return insertPrescriptionEvent(this.pool, event);
  }

  async listCoachExerciseOverrides(coachId: string): Promise<CoachExerciseOverride[]> {
    return listCoachOverrides(this.pool, coachId);
  }

  async upsertCoachExerciseOverride(coachId: string, baseDefinitionId: string, patch: OverridePatch, methodology?: string | null) {
    return upsertCoachOverride(this.pool, coachId, baseDefinitionId, patch, methodology);
  }

  async forkExerciseDefinitionForCoach(coachId: string, parentId: string, input: ExerciseDefinitionInput) {
    return forkExerciseDefinition(this.pool, coachId, parentId, input);
  }

  async createExerciseRelationshipRule(coachId: string, rule: Omit<ExerciseRelationshipRule, 'id' | 'coachId'>) {
    return insertRelationshipRule(this.pool, coachId, rule);
  }

  async deleteExerciseRelationshipRule(id: string, coachId: string) {
    return deleteRelationshipRule(this.pool, id, coachId);
  }

  async listTechnicalCollectionsForCoach(coachId: string): Promise<TechnicalCollectionWithItems[]> {
    return listTechnicalCollections(this.pool, coachId);
  }

  async getDefinitionVersionHistory(definitionId: string) {
    return listDefinitionVersions(this.pool, definitionId);
  }

  async publishDefinitionVersion(def: ExerciseDefinition, changedBy?: string, reason?: string) {
    return snapshotDefinitionVersion(this.pool, def, changedBy, reason);
  }

  async publishExerciseDefinitionById(id: string, changedBy?: string, reason?: string) {
    return publishExerciseDefinition(this.pool, id, changedBy, reason);
  }

  async getExerciseById(id: string): Promise<{ exercise: Exercise; coachId: string | null } | null> {
    const result = await this.pool.query(
      `
      SELECT id, coach_id, name, category, subtype, start_position, complexity, goal,
             intensity_min, intensity_max, load_anchor, load_scale
      FROM coach_exercises WHERE id = $1 LIMIT 1;
      `,
      [id],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return { exercise: this.mapExerciseRow(row), coachId: (row.coach_id as string | null) ?? null };
  }

  async createCoachExercise(coachId: string, id: string, payload: ExerciseUpsertPayload): Promise<Exercise> {
    const [lo, hi] = payload.intensityRange;
    const result = await this.pool.query(
      `
      INSERT INTO coach_exercises (
        id, coach_id, name, category, subtype, start_position, complexity, goal,
        intensity_min, intensity_max, load_anchor, load_scale
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, coach_id, name, category, subtype, start_position, complexity, goal,
                intensity_min, intensity_max, load_anchor, load_scale;
      `,
      [
        id,
        coachId,
        payload.name,
        payload.category,
        payload.subtype,
        payload.startPosition,
        payload.complexity,
        payload.goal,
        lo,
        hi,
        payload.loadAnchor,
        payload.loadScale,
      ],
    );
    return this.mapExerciseRow(result.rows[0]);
  }

  async updateCoachExercise(id: string, payload: ExerciseUpsertPayload): Promise<Exercise | null> {
    const [lo, hi] = payload.intensityRange;
    const result = await this.pool.query(
      `
      UPDATE coach_exercises SET
        name = $2, category = $3, subtype = $4, start_position = $5, complexity = $6, goal = $7,
        intensity_min = $8, intensity_max = $9, load_anchor = $10, load_scale = $11, updated_at = now()
      WHERE id = $1 AND coach_id IS NOT NULL
      RETURNING id, coach_id, name, category, subtype, start_position, complexity, goal,
                intensity_min, intensity_max, load_anchor, load_scale;
      `,
      [
        id,
        payload.name,
        payload.category,
        payload.subtype,
        payload.startPosition,
        payload.complexity,
        payload.goal,
        lo,
        hi,
        payload.loadAnchor,
        payload.loadScale,
      ],
    );
    if (result.rows.length === 0) return null;
    return this.mapExerciseRow(result.rows[0]);
  }

  async deleteCoachExercise(id: string, coachId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM coach_exercises WHERE id = $1 AND coach_id = $2;`,
      [id, coachId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapExerciseRow(row: Record<string, unknown>): Exercise {
    return normalizeExercise({
      id: row.id,
      name: row.name,
      category: row.category,
      subtype: row.subtype,
      startPosition: row.start_position,
      complexity: row.complexity,
      goal: row.goal,
      intensityRange: [row.intensity_min, row.intensity_max],
      loadAnchor: row.load_anchor,
      loadScale: row.load_scale,
    });
  }

  private mapSetLogRow = (row: Record<string, unknown>): SetCompletionLog => ({
    assignmentId: row.assignment_id as string,
    weekNumber: Number(row.week_number),
    dayNumber: Number(row.day_number),
    exerciseIndex: Number(row.exercise_index),
    schemeIndex: Number(row.scheme_index),
    setInstance: Number(row.set_instance),
    completedAt: new Date(row.completed_at as string | Date).toISOString(),
    ...(row.actual_kg != null ? { actualKg: Number(row.actual_kg) } : {}),
    ...(row.actual_reps != null ? { actualReps: Number(row.actual_reps) } : {}),
    ...(row.actual_segment_reps != null
      ? {
          actualSegmentReps: Array.isArray(row.actual_segment_reps)
            ? (row.actual_segment_reps as number[])
            : (JSON.parse(String(row.actual_segment_reps)) as number[]),
        }
      : {}),
    ...(row.actual_rpe != null ? { actualRpe: Number(row.actual_rpe) } : {}),
  });

  private mapCompletionRow = (row: Record<string, unknown>): SessionCompletion => ({
    assignmentId: row.assignment_id as string,
    weekNumber: Number(row.week_number),
    dayNumber: Number(row.day_number),
    ...(row.exercise_index != null ? { exerciseIndex: Number(row.exercise_index) } : {}),
    completedAt: new Date(row.completed_at as string | Date).toISOString(),
  });

  private mapAssignmentRow = (row: Record<string, unknown>): ProgramAssignment => ({
    id: row.id as string,
    coachId: row.coach_id as string,
    athleteUserId: (row.athlete_user_id as string | null) ?? undefined,
    athleteProfileId: row.athlete_profile_id as string,
    sourceTemplateId: (row.source_template_id as string | null) ?? undefined,
    coachProgramId: (row.coach_program_id as string | null) ?? undefined,
    version: Number(row.version),
    versionHistory: (row.version_history as ProgramAssignment['versionHistory']) ?? [],
    program: row.program as ProgramAssignment['program'],
    assignedAt: new Date(row.assigned_at as string | Date).toISOString(),
  });

  async findAuthUserByEmail(email: string): Promise<AuthUser | null> {
    const result = await this.pool.query(
      `SELECT id, name, email, role, password, verified, auth_provider, refresh_token_hash,
              verify_email_token_hash, verify_email_token_expires_at,
              reset_password_token_hash, reset_password_token_expires_at,
              created_at, updated_at
       FROM users WHERE lower(email) = lower($1) LIMIT 1;`,
      [email],
    );
    if (result.rows.length === 0) return null;
    return this.mapAuthRow(result.rows[0]);
  }

  async findAuthUserById(id: string): Promise<AuthUser | null> {
    const result = await this.pool.query(
      `SELECT id, name, email, role, password, verified, auth_provider, refresh_token_hash,
              verify_email_token_hash, verify_email_token_expires_at,
              reset_password_token_hash, reset_password_token_expires_at,
              created_at, updated_at
       FROM users WHERE id = $1 LIMIT 1;`,
      [id],
    );
    if (result.rows.length === 0) return null;
    return this.mapAuthRow(result.rows[0]);
  }

  async createAuthUser(input: {
    name: string;
    email: string;
    passwordHash?: string;
    verified: boolean;
    role: AuthRole;
    provider: 'password' | 'google';
  }): Promise<AuthUser> {
    const mappedRole: WolfUser['role'] = input.role === 'owner' ? 'super_admin' : 'coach';
    const id = `auth-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const result = await this.pool.query(
      `INSERT INTO users (
          id, name, role, email, password, verified, auth_provider, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now())
        RETURNING id, name, email, role, password, verified, auth_provider, refresh_token_hash,
                  verify_email_token_hash, verify_email_token_expires_at,
                  reset_password_token_hash, reset_password_token_expires_at,
                  created_at, updated_at;`,
      [id, input.name, mappedRole, input.email, input.passwordHash ?? '', input.verified, input.provider],
    );
    return this.mapAuthRow(result.rows[0]);
  }

  async updateAuthUserById(id: string, changes: Partial<AuthUser>): Promise<AuthUser | null> {
    const current = await this.findAuthUserById(id);
    if (!current) return null;
    return this.updateAuthUserByEmail(current.email, changes);
  }

  async updateAuthUserByEmail(email: string, changes: Partial<AuthUser>): Promise<AuthUser | null> {
    const current = await this.findAuthUserByEmail(email);
    if (!current) return null;
    const nextRole = changes.role ?? current.role;
    const mappedRole: WolfUser['role'] = nextRole === 'owner' ? 'super_admin' : 'coach';
    const result = await this.pool.query(
      `UPDATE users SET
          name = $2,
          role = $3,
          password = $4,
          verified = $5,
          auth_provider = $6,
          refresh_token_hash = $7,
          verify_email_token_hash = $8,
          verify_email_token_expires_at = $9,
          reset_password_token_hash = $10,
          reset_password_token_expires_at = $11,
          updated_at = now()
        WHERE lower(email) = lower($1)
        RETURNING id, name, email, role, password, verified, auth_provider, refresh_token_hash,
                  verify_email_token_hash, verify_email_token_expires_at,
                  reset_password_token_hash, reset_password_token_expires_at,
                  created_at, updated_at;`,
      [
        email,
        changes.name ?? current.name,
        mappedRole,
        changes.passwordHash ?? current.passwordHash ?? '',
        changes.verified ?? current.verified,
        changes.provider ?? current.provider,
        changes.refreshTokenHash ?? null,
        changes.verifyEmailTokenHash ?? null,
        changes.verifyEmailTokenExpiresAt ?? null,
        changes.resetPasswordTokenHash ?? null,
        changes.resetPasswordTokenExpiresAt ?? null,
      ],
    );
    if (result.rows.length === 0) return null;
    return this.mapAuthRow(result.rows[0]);
  }

  private mapAuthRow(row: Record<string, unknown>): AuthUser {
    const role = (row.role as WolfUser['role']) === 'super_admin' ? 'owner' : 'trainer';
    return {
      id: row.id as string,
      name: row.name as string,
      email: (row.email as string).toLowerCase(),
      passwordHash: (row.password as string | null) ?? undefined,
      verified: Boolean(row.verified),
      role,
      provider: ((row.auth_provider as string | null) ?? 'password') === 'google' ? 'google' : 'password',
      refreshTokenHash: (row.refresh_token_hash as string | null) ?? undefined,
      verifyEmailTokenHash: (row.verify_email_token_hash as string | null) ?? undefined,
      verifyEmailTokenExpiresAt: row.verify_email_token_expires_at
        ? new Date(row.verify_email_token_expires_at as string | Date).toISOString()
        : undefined,
      resetPasswordTokenHash: (row.reset_password_token_hash as string | null) ?? undefined,
      resetPasswordTokenExpiresAt: row.reset_password_token_expires_at
        ? new Date(row.reset_password_token_expires_at as string | Date).toISOString()
        : undefined,
      createdAt: row.created_at ? new Date(row.created_at as string | Date).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string | Date).toISOString() : new Date().toISOString(),
    };
  }

  private coachIdForAthleteProfile(athleteId: string): string {
    const linked = mockUsers.find((u) => u.linkedAthleteId === athleteId && u.coachId);
    return linked?.coachId ?? 'user-coach-wl';
  }

  private mapWlAthleteRow(row: Record<string, unknown>): Athlete & { coachId: string; createdAt: string; updatedAt: string } {
    const oneRm = row.one_rm as Athlete['oneRM'];
    return {
      id: row.id as string,
      coachId: row.coach_id as string,
      name: row.name as string,
      level: row.level as AthleteLevel,
      bodyweight: Number(row.bodyweight ?? 0),
      oneRM: oneRm,
      fatigueScore: Number(row.fatigue_score ?? 0),
      readinessScore: Number(row.readiness_score ?? 0),
      createdAt: new Date(row.created_at as string | Date).toISOString(),
      updatedAt: new Date(row.updated_at as string | Date).toISOString(),
    };
  }

  private mapWlTemplateRow(row: Record<string, unknown>): CoachWlProgramTemplate {
    return {
      id: row.id as string,
      coachId: row.coach_id as string,
      name: row.name as string,
      program: row.program as GeneratedProgram,
      sourceAssignmentId: (row.source_assignment_id as string | null) ?? undefined,
      createdAt: new Date(row.created_at as string | Date).toISOString(),
      updatedAt: new Date(row.updated_at as string | Date).toISOString(),
    };
  }

  private async seedWlAthleteProfilesIfEmpty(): Promise<void> {
    const count = await this.pool.query('SELECT COUNT(*)::int AS c FROM wl_athlete_profiles;');
    if ((count.rows[0]?.c as number) > 0) return;
    for (const athlete of mockAthletes) {
      const coachId = this.coachIdForAthleteProfile(athlete.id);
      await this.pool.query(
        `
        INSERT INTO wl_athlete_profiles (
          id, coach_id, name, level, bodyweight, one_rm, fatigue_score, readiness_score
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          athlete.id,
          coachId,
          athlete.name,
          athlete.level,
          athlete.bodyweight,
          JSON.stringify(athlete.oneRM),
          athlete.fatigueScore,
          athlete.readinessScore,
        ],
      );
    }
  }

  async listAthleteProfiles(coachId: string): Promise<(Athlete & { coachId: string; createdAt: string; updatedAt: string })[]> {
    const result = await this.pool.query(
      `
      SELECT id, coach_id, name, level, bodyweight, one_rm, fatigue_score, readiness_score, created_at, updated_at
      FROM wl_athlete_profiles
      WHERE coach_id = $1
      ORDER BY name ASC;
      `,
      [coachId],
    );
    return result.rows.map((row) => this.mapWlAthleteRow(row));
  }

  async listAllAthleteProfiles(): Promise<(Athlete & { coachId: string; createdAt: string; updatedAt: string })[]> {
    const result = await this.pool.query(
      `
      SELECT id, coach_id, name, level, bodyweight, one_rm, fatigue_score, readiness_score, created_at, updated_at
      FROM wl_athlete_profiles
      ORDER BY name ASC;
      `,
    );
    return result.rows.map((row) => this.mapWlAthleteRow(row));
  }

  async createAthleteProfile(
    coachId: string,
    input: Omit<Athlete, 'fatigueScore' | 'readinessScore'> & Partial<Pick<Athlete, 'fatigueScore' | 'readinessScore'>>,
  ): Promise<Athlete & { coachId: string; createdAt: string; updatedAt: string }> {
    const result = await this.pool.query(
      `
      INSERT INTO wl_athlete_profiles (
        id, coach_id, name, level, bodyweight, one_rm, fatigue_score, readiness_score
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      RETURNING id, coach_id, name, level, bodyweight, one_rm, fatigue_score, readiness_score, created_at, updated_at;
      `,
      [
        input.id,
        coachId,
        input.name,
        input.level,
        input.bodyweight,
        JSON.stringify(input.oneRM),
        input.fatigueScore ?? 40,
        input.readinessScore ?? 70,
      ],
    );
    return this.mapWlAthleteRow(result.rows[0]);
  }

  async updateAthleteProfile(
    coachId: string,
    id: string,
    patch: Partial<Pick<Athlete, 'name' | 'level' | 'bodyweight' | 'oneRM' | 'fatigueScore' | 'readinessScore'>>,
  ): Promise<(Athlete & { coachId: string; createdAt: string; updatedAt: string }) | null> {
    const existing = await this.pool.query(
      `
      SELECT id, coach_id, name, level, bodyweight, one_rm, fatigue_score, readiness_score, created_at, updated_at
      FROM wl_athlete_profiles WHERE id = $1 AND coach_id = $2 LIMIT 1;
      `,
      [id, coachId],
    );
    if (existing.rows.length === 0) return null;
    const row = existing.rows[0];
    const nextOneRm = patch.oneRM ?? (row.one_rm as Athlete['oneRM']);
    const result = await this.pool.query(
      `
      UPDATE wl_athlete_profiles SET
        name = $3,
        level = $4,
        bodyweight = $5,
        one_rm = $6::jsonb,
        fatigue_score = $7,
        readiness_score = $8,
        updated_at = now()
      WHERE id = $1 AND coach_id = $2
      RETURNING id, coach_id, name, level, bodyweight, one_rm, fatigue_score, readiness_score, created_at, updated_at;
      `,
      [
        id,
        coachId,
        patch.name ?? (row.name as string),
        patch.level ?? (row.level as AthleteLevel),
        patch.bodyweight ?? Number(row.bodyweight ?? 0),
        JSON.stringify(nextOneRm),
        patch.fatigueScore ?? Number(row.fatigue_score ?? 0),
        patch.readinessScore ?? Number(row.readiness_score ?? 0),
      ],
    );
    return this.mapWlAthleteRow(result.rows[0]);
  }

  async deleteAthleteProfile(coachId: string, id: string): Promise<{ ok: boolean; error?: string }> {
    const owned = await this.pool.query(
      'SELECT id FROM wl_athlete_profiles WHERE id = $1 AND coach_id = $2 LIMIT 1;',
      [id, coachId],
    );
    if (owned.rows.length === 0) return { ok: false, error: 'Not found.' };
    const active = await this.getAssignmentsByAthleteProfileId(id);
    if (active.length > 0) return { ok: false, error: 'Cannot delete athlete with an active assignment.' };
    await this.pool.query('DELETE FROM wl_athlete_profiles WHERE id = $1 AND coach_id = $2;', [id, coachId]);
    return { ok: true };
  }

  async getAthleteProfileById(
    id: string,
  ): Promise<(Athlete & { coachId: string; createdAt: string; updatedAt: string }) | null> {
    const result = await this.pool.query(
      `
      SELECT id, coach_id, name, level, bodyweight, one_rm, fatigue_score, readiness_score, created_at, updated_at
      FROM wl_athlete_profiles WHERE id = $1 LIMIT 1;
      `,
      [id],
    );
    if (result.rows.length === 0) return null;
    return this.mapWlAthleteRow(result.rows[0]);
  }

  async updateAthleteProfileById(
    id: string,
    patch: Partial<Pick<Athlete, 'name' | 'level' | 'bodyweight' | 'oneRM' | 'fatigueScore' | 'readinessScore'>>,
  ): Promise<(Athlete & { coachId: string; createdAt: string; updatedAt: string }) | null> {
    const existing = await this.getAthleteProfileById(id);
    if (!existing) return null;
    return this.updateAthleteProfile(existing.coachId, id, patch);
  }

  async deleteAthleteProfileById(id: string): Promise<{ ok: boolean; error?: string }> {
    const existing = await this.getAthleteProfileById(id);
    if (!existing) return { ok: false, error: 'Not found.' };
    return this.deleteAthleteProfile(existing.coachId, id);
  }

  async listCoachTemplates(coachId: string): Promise<CoachWlProgramTemplate[]> {
    const result = await this.pool.query(
      `
      SELECT id, coach_id, name, program, source_assignment_id, created_at, updated_at
      FROM coach_wl_templates
      WHERE coach_id = $1
      ORDER BY updated_at DESC;
      `,
      [coachId],
    );
    return result.rows.map((row) => this.mapWlTemplateRow(row));
  }

  async createCoachTemplate(input: {
    id: string;
    coachId: string;
    name: string;
    program: GeneratedProgram;
    sourceAssignmentId?: string;
  }): Promise<CoachWlProgramTemplate> {
    const result = await this.pool.query(
      `
      INSERT INTO coach_wl_templates (id, coach_id, name, program, source_assignment_id)
      VALUES ($1, $2, $3, $4::jsonb, $5)
      RETURNING id, coach_id, name, program, source_assignment_id, created_at, updated_at;
      `,
      [
        input.id,
        input.coachId,
        input.name,
        JSON.stringify(input.program),
        input.sourceAssignmentId ?? null,
      ],
    );
    return this.mapWlTemplateRow(result.rows[0]);
  }

  async updateCoachTemplate(
    coachId: string,
    id: string,
    patch: { name?: string; program?: GeneratedProgram },
  ): Promise<CoachWlProgramTemplate | null> {
    const existing = await this.pool.query(
      `
      SELECT id, coach_id, name, program, source_assignment_id, created_at, updated_at
      FROM coach_wl_templates WHERE id = $1 AND coach_id = $2 LIMIT 1;
      `,
      [id, coachId],
    );
    if (existing.rows.length === 0) return null;
    const row = existing.rows[0];
    const result = await this.pool.query(
      `
      UPDATE coach_wl_templates SET
        name = $3,
        program = $4::jsonb,
        updated_at = now()
      WHERE id = $1 AND coach_id = $2
      RETURNING id, coach_id, name, program, source_assignment_id, created_at, updated_at;
      `,
      [
        id,
        coachId,
        patch.name ?? (row.name as string),
        JSON.stringify(patch.program ?? (row.program as GeneratedProgram)),
      ],
    );
    return this.mapWlTemplateRow(result.rows[0]);
  }

  async deleteCoachTemplate(coachId: string, id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM coach_wl_templates WHERE id = $1 AND coach_id = $2;',
      [id, coachId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapCoachProgramRow(row: Record<string, unknown>): CoachProgram {
    return {
      id: row.id as string,
      coachId: row.coach_id as string,
      name: row.name as string,
      program: row.program as GeneratedProgram,
      status: row.status as CoachProgramStatus,
      createdAt: new Date(row.created_at as string | Date).toISOString(),
      updatedAt: new Date(row.updated_at as string | Date).toISOString(),
    };
  }

  private async seedCoachProgramsFromTemplates(): Promise<void> {
    const count = await this.pool.query('SELECT COUNT(*)::int AS c FROM coach_programs;');
    if ((count.rows[0]?.c as number) > 0) return;
    const templates = await this.pool.query(
      `SELECT id, coach_id, name, program, created_at, updated_at FROM coach_wl_templates ORDER BY updated_at DESC;`,
    );
    for (const row of templates.rows) {
      await this.pool.query(
        `
        INSERT INTO coach_programs (id, coach_id, name, program, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, 'published', $5, $6)
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          `cpr-${row.id as string}`,
          row.coach_id,
          row.name,
          JSON.stringify(row.program),
          row.created_at,
          row.updated_at,
        ],
      );
    }
  }

  async listCoachPrograms(coachId: string): Promise<CoachProgram[]> {
    const result = await this.pool.query(
      `
      SELECT id, coach_id, name, program, status, created_at, updated_at
      FROM coach_programs
      WHERE coach_id = $1 AND status <> 'archived'
      ORDER BY updated_at DESC;
      `,
      [coachId],
    );
    return result.rows.map((row) => this.mapCoachProgramRow(row));
  }

  async getCoachProgramById(coachId: string, id: string): Promise<CoachProgram | null> {
    const result = await this.pool.query(
      `
      SELECT id, coach_id, name, program, status, created_at, updated_at
      FROM coach_programs
      WHERE id = $1 AND coach_id = $2
      LIMIT 1;
      `,
      [id, coachId],
    );
    if (result.rows.length === 0) return null;
    return this.mapCoachProgramRow(result.rows[0]);
  }

  async createCoachProgram(input: {
    id: string;
    coachId: string;
    name: string;
    program: GeneratedProgram;
    status?: CoachProgramStatus;
  }): Promise<CoachProgram> {
    const result = await this.pool.query(
      `
      INSERT INTO coach_programs (id, coach_id, name, program, status)
      VALUES ($1, $2, $3, $4::jsonb, $5)
      RETURNING id, coach_id, name, program, status, created_at, updated_at;
      `,
      [input.id, input.coachId, input.name, JSON.stringify(input.program), input.status ?? 'draft'],
    );
    return this.mapCoachProgramRow(result.rows[0]);
  }

  async updateCoachProgram(
    coachId: string,
    id: string,
    patch: { name?: string; program?: GeneratedProgram; status?: CoachProgramStatus },
  ): Promise<CoachProgram | null> {
    const existing = await this.getCoachProgramById(coachId, id);
    if (!existing) return null;
    const result = await this.pool.query(
      `
      UPDATE coach_programs SET
        name = $3,
        program = $4::jsonb,
        status = $5,
        updated_at = now()
      WHERE id = $1 AND coach_id = $2
      RETURNING id, coach_id, name, program, status, created_at, updated_at;
      `,
      [
        id,
        coachId,
        patch.name ?? existing.name,
        JSON.stringify(patch.program ?? existing.program),
        patch.status ?? existing.status,
      ],
    );
    return this.mapCoachProgramRow(result.rows[0]);
  }

  async deleteCoachProgram(coachId: string, id: string): Promise<{ ok: boolean; error?: string }> {
    const linked = await this.pool.query(
      `SELECT COUNT(*)::int AS c FROM assignments WHERE coach_program_id = $1;`,
      [id],
    );
    if ((linked.rows[0]?.c as number) > 0) {
      return { ok: false, error: 'Cannot delete program with active athlete enrollments.' };
    }
    const result = await this.pool.query(
      'DELETE FROM coach_programs WHERE id = $1 AND coach_id = $2;',
      [id, coachId],
    );
    return { ok: (result.rowCount ?? 0) > 0 };
  }

  async archiveCoachProgram(coachId: string, id: string): Promise<CoachProgram | null> {
    return this.updateCoachProgram(coachId, id, { status: 'archived' });
  }

  async getAssignmentsByCoachProgramId(coachProgramId: string): Promise<ProgramAssignment[]> {
    const result = await this.pool.query(
      `
      SELECT ${this.assignmentSelectColumns}
      FROM assignments
      WHERE coach_program_id = $1
      ORDER BY assigned_at DESC;
      `,
      [coachProgramId],
    );
    return result.rows.map((row) => this.mapAssignmentRow(row));
  }

  async countAssignmentsForCoachProgram(coachProgramId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS c FROM assignments WHERE coach_program_id = $1;`,
      [coachProgramId],
    );
    return (result.rows[0]?.c as number) ?? 0;
  }

  private mapPlanChangeNotificationRow(row: Record<string, unknown>): import('../models/notifications').PlanChangeNotification {
    return {
      id: row.id as string,
      recipientUserId: row.recipient_user_id as string,
      coachId: row.coach_id as string,
      coachName: row.coach_name as string,
      coachProgramId: row.coach_program_id as string,
      programName: row.program_name as string,
      assignmentId: (row.assignment_id as string | null) ?? undefined,
      athleteProfileId: row.athlete_profile_id as string,
      weekNumber: row.week_number as number,
      dayNumber: row.day_number as number,
      dayLabel: (row.day_label as string | null) ?? undefined,
      changedAt: new Date(row.changed_at as string).toISOString(),
      readAt: row.read_at ? new Date(row.read_at as string).toISOString() : null,
      messageEs: row.message_es as string,
      messageEn: row.message_en as string,
    };
  }

  async insertPlanChangeNotification(
    input: Omit<import('../models/notifications').PlanChangeNotification, 'readAt'> & { readAt?: string | null },
  ): Promise<import('../models/notifications').PlanChangeNotification> {
    const result = await this.pool.query(
      `
      INSERT INTO plan_change_notifications (
        id, recipient_user_id, coach_id, coach_name, coach_program_id, program_name,
        assignment_id, athlete_profile_id, week_number, day_number, day_label,
        changed_at, read_at, message_es, message_en
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;
      `,
      [
        input.id,
        input.recipientUserId,
        input.coachId,
        input.coachName,
        input.coachProgramId,
        input.programName,
        input.assignmentId ?? null,
        input.athleteProfileId,
        input.weekNumber,
        input.dayNumber,
        input.dayLabel ?? null,
        input.changedAt,
        input.readAt ?? null,
        input.messageEs,
        input.messageEn,
      ],
    );
    return this.mapPlanChangeNotificationRow(result.rows[0] as Record<string, unknown>);
  }

  async listNotificationsForUser(
    userId: string,
    options?: { asCoach?: boolean },
  ): Promise<import('../models/notifications').PlanChangeNotification[]> {
    const result = options?.asCoach
      ? await this.pool.query(
          `
          SELECT * FROM plan_change_notifications
          WHERE coach_id = $1
          ORDER BY changed_at DESC
          LIMIT 100;
          `,
          [userId],
        )
      : await this.pool.query(
          `
          SELECT * FROM plan_change_notifications
          WHERE recipient_user_id = $1
          ORDER BY changed_at DESC
          LIMIT 100;
          `,
          [userId],
        );
    return result.rows.map((row) => this.mapPlanChangeNotificationRow(row as Record<string, unknown>));
  }

  async markNotificationRead(
    id: string,
    recipientUserId: string,
  ): Promise<import('../models/notifications').PlanChangeNotification | null> {
    const result = await this.pool.query(
      `
      UPDATE plan_change_notifications
      SET read_at = COALESCE(read_at, now())
      WHERE id = $1 AND recipient_user_id = $2
      RETURNING *;
      `,
      [id, recipientUserId],
    );
    if (!result.rows[0]) return null;
    return this.mapPlanChangeNotificationRow(result.rows[0] as Record<string, unknown>);
  }
}
