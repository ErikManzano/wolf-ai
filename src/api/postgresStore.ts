import { Pool } from 'pg';
import type { ProgramAssignment, WolfUser } from '../models/training';
import { hashPassword, looksLikeBcryptHash, verifyPassword } from '../utils/passwordCrypto';

type AssignmentCreateInput = {
  id: string;
  coachId: string;
  athleteProfileId: string;
  athleteUserId?: string;
  program: ProgramAssignment['program'];
};

type UserCreateInput = {
  id: string;
  name: string;
  role: WolfUser['role'];
  email: string;
  password: string;
  coachId?: string;
  linkedAthleteId?: string;
};

export class PostgresStore {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
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
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        coach_id TEXT NOT NULL,
        athlete_user_id TEXT,
        athlete_profile_id TEXT NOT NULL UNIQUE,
        version INTEGER NOT NULL,
        version_history JSONB NOT NULL DEFAULT '[]'::jsonb,
        program JSONB NOT NULL,
        assigned_at TIMESTAMPTZ NOT NULL
      );
    `);

    for (const user of seedUsers) {
      const storedPassword =
        user.passwordHash && looksLikeBcryptHash(user.passwordHash)
          ? user.passwordHash
          : hashPassword(user.password ?? 'wolf2026');
      await this.pool.query(
        `
        INSERT INTO users (id, name, role, email, password, coach_id, linked_athlete_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          coach_id = EXCLUDED.coach_id,
          linked_athlete_id = EXCLUDED.linked_athlete_id;
        `,
        [user.id, user.name, user.role, user.email ?? '', storedPassword, user.coachId ?? null, user.linkedAthleteId ?? null],
      );
    }
  }

  async getUsers(): Promise<WolfUser[]> {
    const result = await this.pool.query(
      'SELECT id, name, role, email, coach_id, linked_athlete_id FROM users ORDER BY name ASC;',
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      role: row.role as WolfUser['role'],
      email: row.email as string,
      coachId: (row.coach_id as string | null) ?? undefined,
      linkedAthleteId: (row.linked_athlete_id as string | null) ?? undefined,
    }));
  }

  async getUserByEmail(email: string): Promise<WolfUser | null> {
    const result = await this.pool.query(
      'SELECT id, name, role, email, coach_id, linked_athlete_id FROM users WHERE lower(email) = lower($1) LIMIT 1;',
      [email],
    );
    if (result.rows.length === 0) return null;
    return {
      id: result.rows[0].id as string,
      name: result.rows[0].name as string,
      role: result.rows[0].role as WolfUser['role'],
      email: result.rows[0].email as string,
      coachId: (result.rows[0].coach_id as string | null) ?? undefined,
      linkedAthleteId: (result.rows[0].linked_athlete_id as string | null) ?? undefined,
    };
  }

  async validateUser(email: string, password: string): Promise<WolfUser | null> {
    const result = await this.pool.query(
      `
      SELECT id, name, role, email, coach_id, linked_athlete_id, password AS stored_password
      FROM users
      WHERE lower(email) = lower($1)
      LIMIT 1;
      `,
      [email],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const stored = row.stored_password as string;
    const ok =
      looksLikeBcryptHash(stored) ? verifyPassword(password, stored) : stored === password;
    if (!ok) return null;
    return {
      id: row.id as string,
      name: row.name as string,
      role: row.role as WolfUser['role'],
      email: row.email as string,
      coachId: (row.coach_id as string | null) ?? undefined,
      linkedAthleteId: (row.linked_athlete_id as string | null) ?? undefined,
    };
  }

  async createUser(input: UserCreateInput): Promise<WolfUser> {
    const passHash = hashPassword(input.password);
    const result = await this.pool.query(
      `
      INSERT INTO users (id, name, role, email, password, coach_id, linked_athlete_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, role, email, coach_id, linked_athlete_id;
      `,
      [input.id, input.name, input.role, input.email, passHash, input.coachId ?? null, input.linkedAthleteId ?? null],
    );
    const row = result.rows[0];
    return {
      id: row.id as string,
      name: row.name as string,
      role: row.role as WolfUser['role'],
      email: row.email as string,
      coachId: (row.coach_id as string | null) ?? undefined,
      linkedAthleteId: (row.linked_athlete_id as string | null) ?? undefined,
    };
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

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM users WHERE id = $1;', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getAssignments(): Promise<ProgramAssignment[]> {
    const result = await this.pool.query(
      `
      SELECT id, coach_id, athlete_user_id, athlete_profile_id, version, version_history, program, assigned_at
      FROM assignments
      ORDER BY assigned_at DESC;
      `,
    );
    return result.rows.map(this.mapAssignmentRow);
  }

  async getAssignmentByAthlete(athleteProfileId: string): Promise<ProgramAssignment | null> {
    const result = await this.pool.query(
      `
      SELECT id, coach_id, athlete_user_id, athlete_profile_id, version, version_history, program, assigned_at
      FROM assignments
      WHERE athlete_profile_id = $1
      LIMIT 1;
      `,
      [athleteProfileId],
    );
    if (result.rows.length === 0) return null;
    return this.mapAssignmentRow(result.rows[0]);
  }

  async createOrReplaceAssignment(input: AssignmentCreateInput): Promise<ProgramAssignment> {
    await this.pool.query('DELETE FROM assignments WHERE athlete_profile_id = $1;', [input.athleteProfileId]);
    const assignedAt = new Date().toISOString();
    const result = await this.pool.query(
      `
      INSERT INTO assignments (
        id, coach_id, athlete_user_id, athlete_profile_id, version, version_history, program, assigned_at
      )
      VALUES ($1, $2, $3, $4, 1, '[]'::jsonb, $5::jsonb, $6::timestamptz)
      RETURNING id, coach_id, athlete_user_id, athlete_profile_id, version, version_history, program, assigned_at;
      `,
      [
        input.id,
        input.coachId,
        input.athleteUserId ?? null,
        input.athleteProfileId,
        JSON.stringify({ ...input.program, athleteId: input.athleteProfileId }),
        assignedAt,
      ],
    );
    return this.mapAssignmentRow(result.rows[0]);
  }

  async updateAssignmentProgram(id: string, program: ProgramAssignment['program']): Promise<ProgramAssignment | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const currentRes = await client.query(
        `
        SELECT id, coach_id, athlete_user_id, athlete_profile_id, version, version_history, program, assigned_at
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
        RETURNING id, coach_id, athlete_user_id, athlete_profile_id, version, version_history, program, assigned_at;
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

  private mapAssignmentRow = (row: Record<string, unknown>): ProgramAssignment => ({
    id: row.id as string,
    coachId: row.coach_id as string,
    athleteUserId: (row.athlete_user_id as string | null) ?? undefined,
    athleteProfileId: row.athlete_profile_id as string,
    version: Number(row.version),
    versionHistory: (row.version_history as ProgramAssignment['versionHistory']) ?? [],
    program: row.program as ProgramAssignment['program'],
    assignedAt: new Date(row.assigned_at as string | Date).toISOString(),
  });
}
